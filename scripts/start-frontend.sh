#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
PID_DIR="$ROOT_DIR/.pid"
FRONTEND_PORT="${TEMPLATE_FRONTEND_PORT:-5173}"
BACKEND_HEALTH_URL="${TEMPLATE_BACKEND_HEALTH_URL:-http://localhost:8000/health}"
REQUIRE_BACKEND_HEALTH="${TEMPLATE_REQUIRE_BACKEND_HEALTH:-false}"
FRONTEND_READY_TIMEOUT_SECONDS="${TEMPLATE_FRONTEND_READY_TIMEOUT_SECONDS:-30}"

mkdir -p "$PID_DIR"

if [[ ! -f "$FRONTEND_DIR/package.json" ]]; then
    echo "error: package.json not found in $FRONTEND_DIR" >&2
    echo "hint: run 'npm install' in $FRONTEND_DIR first." >&2
    exit 1
fi

if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
    echo "Installing frontend dependencies..."
    (cd "$FRONTEND_DIR" && npm install)
fi

if ! curl -fsS "$BACKEND_HEALTH_URL" >/dev/null 2>&1; then
    if [[ "$REQUIRE_BACKEND_HEALTH" == "true" ]]; then
        echo "error: backend is not reachable at $BACKEND_HEALTH_URL" >&2
        echo "hint: start backend first or set TEMPLATE_REQUIRE_BACKEND_HEALTH=false" >&2
        exit 1
    fi
    echo "warning: backend is not reachable at $BACKEND_HEALTH_URL"
    echo "warning: the app will launch, but API calls may fail."
fi

# --- Stop existing frontend if running ---------------------------------------
if [[ -f "$PID_DIR/frontend.pid" ]]; then
    old_pid=$(cat "$PID_DIR/frontend.pid")
    if kill -0 "$old_pid" 2>/dev/null; then
        echo "Frontend is already running (PID $old_pid)."
        exit 0
    fi
    rm -f "$PID_DIR/frontend.pid"
fi

# --- Start Vite dev server in background ------------------------------------
echo "Starting Vite dev server on port $FRONTEND_PORT..."
(
    cd "$FRONTEND_DIR"
    nohup npx vite --port "$FRONTEND_PORT" \
        > "$PID_DIR/frontend.log" 2>&1 < /dev/null &
    echo $! > "$PID_DIR/frontend.pid"
)

echo -n "Waiting for frontend to be ready"
elapsed=0
until curl -fsS "http://localhost:$FRONTEND_PORT" >/dev/null 2>&1; do
    if ! kill -0 "$(cat "$PID_DIR/frontend.pid")" 2>/dev/null; then
        echo ""
        echo "error: frontend process exited before becoming ready." >&2
        echo "hint: check $PID_DIR/frontend.log for details." >&2
        exit 1
    fi

    if (( elapsed >= FRONTEND_READY_TIMEOUT_SECONDS )); then
        echo ""
        echo "error: frontend did not respond within ${FRONTEND_READY_TIMEOUT_SECONDS} seconds." >&2
        echo "hint: check $PID_DIR/frontend.log for details." >&2
        exit 1
    fi
    echo -n "."
    sleep 1
    elapsed=$((elapsed + 1))
done
echo " ready"

echo ""
echo "  Frontend  : http://localhost:$FRONTEND_PORT"
echo "  Logs      : $PID_DIR/frontend.log"
echo "  PID       : $(cat "$PID_DIR/frontend.pid")"
