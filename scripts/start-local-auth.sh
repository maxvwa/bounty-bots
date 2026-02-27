#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE="${1:-hosted_dev}"
TEMPLATE_DIR="$ROOT_DIR/env/auth"
TARGET_ENV_FILE="$ROOT_DIR/.env.auth.local"
TEMPLATE_LOCAL_SUPABASE_CONFIG_UPDATED="false"

usage() {
    cat <<EOF
Usage: scripts/start-local-auth.sh [hosted_dev|local_offline]

Modes:
  hosted_dev    Uses hosted Supabase dev project settings.
  local_offline Starts local Supabase stack and applies offline settings.

Examples:
  scripts/start-local-auth.sh hosted_dev
  scripts/start-local-auth.sh local_offline
EOF
}

apply_template() {
    local template_file="$1"
    if [[ ! -f "$template_file" ]]; then
        echo "error: auth template not found: $template_file" >&2
        exit 1
    fi

    cp "$template_file" "$TARGET_ENV_FILE"
    echo "Wrote auth config: $TARGET_ENV_FILE"
}

ensure_local_supabase_anonymous_auth_enabled() {
    local config_file="$ROOT_DIR/supabase/config.toml"
    local temp_file

    if [[ ! -f "$config_file" ]]; then
        echo "error: expected local Supabase config at $config_file" >&2
        echo "hint: run scripts/start-local-auth.sh local_offline again to initialize Supabase." >&2
        exit 1
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

start_local_supabase() {
    if ! command -v supabase >/dev/null 2>&1; then
        echo "error: Supabase CLI is not installed." >&2
        echo "Install it first (for example):" >&2
        echo "  brew install supabase/tap/supabase" >&2
        exit 1
    fi

    if [[ ! -f "$ROOT_DIR/supabase/config.toml" ]]; then
        echo "Initializing local Supabase project..."
        (cd "$ROOT_DIR" && supabase init)
    fi

    ensure_local_supabase_anonymous_auth_enabled

    if [[ "$TEMPLATE_LOCAL_SUPABASE_CONFIG_UPDATED" == "true" ]]; then
        echo "Restarting local Supabase stack to apply auth config changes..."
        (cd "$ROOT_DIR" && supabase stop >/dev/null 2>&1 || true)
    fi

    echo "Starting local Supabase stack..."
    (cd "$ROOT_DIR" && supabase start)
}

case "$MODE" in
    hosted_dev)
        apply_template "$TEMPLATE_DIR/hosted_dev.env.example"
        cat <<EOF
Mode active: hosted_dev
Next steps:
  1) Edit $TARGET_ENV_FILE with your real hosted Supabase values.
  2) Start Postgres for app data:
     docker compose -f docker-compose.dev.yml up -d
  3) Start backend:
     cd backend && uv sync && uv run uvicorn app.main:app --reload --port 8000
EOF
        ;;
    local_offline)
        start_local_supabase
        "$ROOT_DIR/scripts/provision-avatar-storage-local.sh"
        apply_template "$TEMPLATE_DIR/local_offline.env.example"
        cat <<EOF
Mode active: local_offline
Next steps:
  1) Start Postgres for app data:
     docker compose -f docker-compose.dev.yml up -d
  2) Start backend:
     cd backend && uv sync && uv run uvicorn app.main:app --reload --port 8000
EOF
        ;;
    -h|--help|help)
        usage
        ;;
    *)
        echo "error: unsupported mode '$MODE'" >&2
        usage
        exit 1
        ;;
esac
