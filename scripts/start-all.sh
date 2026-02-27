#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_DIR="$ROOT_DIR/scripts"
AUTH_ENV_FILE="$ROOT_DIR/.env.auth.local"
AUTH_MODE_OVERRIDE="${TEMPLATE_AUTH_MODE:-}"
DEFAULT_AUTH_MODE="hosted_dev"
TEMPLATE_LOCAL_SUPABASE_CONFIG_UPDATED="false"
SKIP_FRONTEND="${TEMPLATE_SKIP_FRONTEND:-false}"

read_auth_mode() {
    local env_file="$1"
    if [[ ! -f "$env_file" ]]; then
        return 1
    fi

    sed -nE 's/^[[:space:]]*AUTH_MODE[[:space:]]*=[[:space:]]*"?([^"#[:space:]]+)"?.*$/\1/p' "$env_file" |
        head -n 1
}

validate_auth_mode() {
    local mode="$1"
    case "$mode" in
        hosted_dev|local_offline)
            ;;
        *)
            echo "error: unsupported auth mode '$mode'." >&2
            echo "hint: use hosted_dev or local_offline." >&2
            exit 1
            ;;
    esac
}

ensure_local_supabase_anonymous_auth_enabled() {
    local config_file="$ROOT_DIR/supabase/config.toml"
    local temp_file

    if [[ ! -f "$config_file" ]]; then
        echo "Initializing local Supabase project..."
        (cd "$ROOT_DIR" && supabase init)
    fi

    temp_file="$(mktemp "${TMPDIR:-/tmp}/template_supabase_config.XXXXXX")"
    awk '
        function print_anon_key() {
            print "enable_anonymous_sign_ins = true"
        }
        BEGIN {
            in_auth = 0
            saw_auth = 0
            wrote_anon_key = 0
        }
        /^\[auth\][[:space:]]*$/ {
            saw_auth = 1
            in_auth = 1
            print
            next
        }
        in_auth && /^\[[^]]+\][[:space:]]*$/ {
            if (!wrote_anon_key) {
                print_anon_key()
                wrote_anon_key = 1
            }
            in_auth = 0
            print
            next
        }
        in_auth && /^[[:space:]]*enable_anonymous_sign_ins[[:space:]]*=/ {
            if (!wrote_anon_key) {
                print_anon_key()
                wrote_anon_key = 1
            }
            next
        }
        {
            print
        }
        END {
            if (in_auth && !wrote_anon_key) {
                print_anon_key()
                wrote_anon_key = 1
            }
            if (!saw_auth) {
                if (NR > 0) {
                    print ""
                }
                print "[auth]"
                print_anon_key()
            }
        }
    ' "$config_file" >"$temp_file"

    if cmp -s "$config_file" "$temp_file"; then
        rm -f "$temp_file"
        TEMPLATE_LOCAL_SUPABASE_CONFIG_UPDATED="false"
        return
    fi

    mv "$temp_file" "$config_file"
    TEMPLATE_LOCAL_SUPABASE_CONFIG_UPDATED="true"
    echo "Updated local Supabase config: enabled anonymous sign-ins in $config_file"
}

ensure_auth_runtime() {
    local target_mode="$1"
    local current_mode="${2:-}"
    local initialized_auth_mode="false"

    if [[ ! -f "$AUTH_ENV_FILE" ]]; then
        echo "Auth config missing. Initializing mode: $target_mode"
        "$SCRIPT_DIR/start-local-auth.sh" "$target_mode"
        current_mode="$target_mode"
        initialized_auth_mode="true"
    elif [[ -n "$AUTH_MODE_OVERRIDE" && "$current_mode" != "$target_mode" ]]; then
        echo "Switching auth mode from '$current_mode' to '$target_mode'..."
        "$SCRIPT_DIR/start-local-auth.sh" "$target_mode"
        current_mode="$target_mode"
        initialized_auth_mode="true"
    fi

    if [[ "$target_mode" == "local_offline" && "$initialized_auth_mode" != "true" ]]; then
        if ! command -v supabase >/dev/null 2>&1; then
            echo "error: local_offline mode requires Supabase CLI." >&2
            echo "hint: brew install supabase/tap/supabase" >&2
            exit 1
        fi

        ensure_local_supabase_anonymous_auth_enabled

        echo "Ensuring local Supabase stack is running..."
        if [[ "$TEMPLATE_LOCAL_SUPABASE_CONFIG_UPDATED" == "true" ]]; then
            echo "Restarting local Supabase stack to apply auth config changes..."
            (cd "$ROOT_DIR" && supabase stop >/dev/null 2>&1 || true)
        fi
        (cd "$ROOT_DIR" && supabase start)
        "$SCRIPT_DIR/provision-avatar-storage-local.sh"
    fi

    if [[ "$target_mode" == "hosted_dev" ]] && grep -q "YOUR_PROJECT_REF" "$AUTH_ENV_FILE"; then
        echo "warning: hosted_dev auth config appears to use template values." >&2
        echo "hint: edit $AUTH_ENV_FILE with your real hosted Supabase project values." >&2
    fi
}

determine_target_auth_mode() {
    local configured_mode
    if [[ -n "$AUTH_MODE_OVERRIDE" ]]; then
        echo "$AUTH_MODE_OVERRIDE"
        return
    fi

    if configured_mode="$(read_auth_mode "$AUTH_ENV_FILE")" && [[ -n "$configured_mode" ]]; then
        echo "$configured_mode"
        return
    fi

    echo "$DEFAULT_AUTH_MODE"
}

TARGET_AUTH_MODE="$(determine_target_auth_mode)"
validate_auth_mode "$TARGET_AUTH_MODE"
CURRENT_AUTH_MODE="$(read_auth_mode "$AUTH_ENV_FILE" || true)"
if [[ -f "$AUTH_ENV_FILE" && -z "$CURRENT_AUTH_MODE" ]]; then
    echo "error: $AUTH_ENV_FILE exists but AUTH_MODE is missing or invalid." >&2
    echo "hint: run scripts/start-local-auth.sh hosted_dev (or local_offline)." >&2
    exit 1
fi
ensure_auth_runtime "$TARGET_AUTH_MODE" "$CURRENT_AUTH_MODE"

# --- Start Postgres + backend ----------------------------------------------
"$SCRIPT_DIR/start-backend-services.sh"

# --- Launch frontend --------------------------------------------------------
if [[ "$SKIP_FRONTEND" == "true" ]]; then
    echo "Skipping frontend launch (TEMPLATE_SKIP_FRONTEND=true)."
    exit 0
fi

"$SCRIPT_DIR/start-frontend.sh"
