#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_DIR="$ROOT_DIR/.pid"
BACKEND_PORT="${TEMPLATE_BACKEND_PORT:-8000}"
HEALTH_URL="http://localhost:$BACKEND_PORT/health"
DB_READY_TIMEOUT_SECONDS="${TEMPLATE_DB_READY_TIMEOUT_SECONDS:-30}"
BACKEND_READY_TIMEOUT_SECONDS="${TEMPLATE_BACKEND_READY_TIMEOUT_SECONDS:-30}"

mkdir -p "$PID_DIR"

load_env_file() {
    local env_file="$1"
    if [[ ! -f "$env_file" ]]; then
        return
    fi

    set -a
    # shellcheck disable=SC1090
    source "$env_file"
    set +a
}

port_listener_pid() {
    local port="$1"
    if ! command -v lsof >/dev/null 2>&1; then
        return 1
    fi

    lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | head -n 1
}

# --- First-time convenience: copy .env.example if .env is missing ----------
if [[ ! -f "$ROOT_DIR/.env" && -f "$ROOT_DIR/.env.example" ]]; then
    cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
    echo "Copied .env.example -> .env (edit it with your local values)"
fi

# --- Warn if auth config is missing ----------------------------------------
if [[ ! -f "$ROOT_DIR/.env.auth.local" ]]; then
    echo "warning: .env.auth.local not found — auth will not work."
    echo "hint: run scripts/start-local-auth.sh to configure it."
else
    load_env_file "$ROOT_DIR/.env.auth.local"
    echo "Using auth config from .env.auth.local (AUTH_MODE=${AUTH_MODE:-unset})"
fi

# --- Start Postgres --------------------------------------------------------
echo "Starting Postgres via docker compose..."
docker compose -f "$ROOT_DIR/docker-compose.dev.yml" up -d db

echo -n "Waiting for Postgres to be healthy"
elapsed=0
until docker compose -f "$ROOT_DIR/docker-compose.dev.yml" exec -T db \
    pg_isready -q -U "${POSTGRES_USER:-app_user}" -d "${POSTGRES_DB:-app_db}" >/dev/null 2>&1; do
    if (( elapsed >= DB_READY_TIMEOUT_SECONDS )); then
        echo ""
        echo "error: Postgres did not become ready within ${DB_READY_TIMEOUT_SECONDS} seconds." >&2
        exit 1
    fi
    echo -n "."
    sleep 1
    elapsed=$((elapsed + 1))
done
echo " ready"

# --- Sync backend dependencies ---------------------------------------------
echo "Syncing backend dependencies..."
(cd "$ROOT_DIR/backend" && uv sync)

# --- Start uvicorn ---------------------------------------------------------
if [[ -f "$PID_DIR/backend.pid" ]]; then
    old_pid=$(cat "$PID_DIR/backend.pid")
    if kill -0 "$old_pid" 2>/dev/null; then
        echo "Backend is already running (PID $old_pid)."
        exit 0
    fi
    rm -f "$PID_DIR/backend.pid"
fi

existing_listener_pid="$(port_listener_pid "$BACKEND_PORT" || true)"
if [[ -n "${existing_listener_pid:-}" ]]; then
    echo "error: port $BACKEND_PORT is already in use by PID $existing_listener_pid." >&2
    echo "hint: stop the existing process before starting backend services." >&2
    if command -v ps >/dev/null 2>&1; then
        ps -p "$existing_listener_pid" -o pid,command >&2 || true
    fi
    exit 1
fi

echo "Starting uvicorn on port $BACKEND_PORT..."
(
    cd "$ROOT_DIR/backend"
    nohup .venv/bin/uvicorn app.main:app --port "$BACKEND_PORT" \
        > "$PID_DIR/backend.log" 2>&1 < /dev/null &
    echo $! > "$PID_DIR/backend.pid"
)

echo -n "Waiting for backend to be healthy"
elapsed=0
until curl -fsS "$HEALTH_URL" >/dev/null 2>&1; do
    if ! kill -0 "$(cat "$PID_DIR/backend.pid")" 2>/dev/null; then
        echo ""
        echo "error: backend process exited before becoming healthy." >&2
        echo "hint: check $PID_DIR/backend.log for details." >&2
        exit 1
    fi

    if (( elapsed >= BACKEND_READY_TIMEOUT_SECONDS )); then
        echo ""
        echo "error: backend did not respond within ${BACKEND_READY_TIMEOUT_SECONDS} seconds." >&2
        echo "hint: check $PID_DIR/backend.log for details." >&2
        exit 1
    fi
    echo -n "."
    sleep 1
    elapsed=$((elapsed + 1))
done
echo " ready"

# --- Summary ---------------------------------------------------------------
echo ""
echo "Backend services running:"
echo "  Postgres  : localhost:5432 (docker compose service: db)"
echo "  Backend   : $HEALTH_URL"
echo "  Logs      : $PID_DIR/backend.log"
echo "  PID       : $(cat "$PID_DIR/backend.pid")"
echo ""
echo "Start frontend with: scripts/start-frontend.sh"
echo "Stop everything with: scripts/stop.sh"
