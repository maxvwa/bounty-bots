#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
PID_DIR="$ROOT_DIR/.pid"
FRONTEND_PORT="${TEMPLATE_FRONTEND_PORT:-5173}"
BACKEND_HEALTH_URL="${TEMPLATE_BACKEND_HEALTH_URL:-http://localhost:8000/health}"
REQUIRE_BACKEND_HEALTH="${TEMPLATE_REQUIRE_BACKEND_HEALTH:-false}"
FRONTEND_READY_TIMEOUT_SECONDS="${TEMPLATE_FRONTEND_READY_TIMEOUT_SECONDS:-30}"
CLEAR_VITE_CACHE="${TEMPLATE_FRONTEND_CLEAR_VITE_CACHE:-true}"

mkdir -p "$PID_DIR"

if [[ ! -f "$FRONTEND_DIR/package.json" ]]; then
    echo "error: package.json not found in $FRONTEND_DIR" >&2
    echo "hint: run 'npm install' in $FRONTEND_DIR first." >&2
    exit 1
fi

install_frontend_dependencies() {
    echo "Installing frontend dependencies..."
    (cd "$FRONTEND_DIR" && npm install)
}

if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
    install_frontend_dependencies
elif [[ -f "$FRONTEND_DIR/package-lock.json" && "$FRONTEND_DIR/package-lock.json" -nt "$FRONTEND_DIR/node_modules" ]]; then
    echo "Detected newer package-lock.json; refreshing frontend dependencies..."
    install_frontend_dependencies
fi

if [[ "$CLEAR_VITE_CACHE" == "true" ]]; then
    rm -rf "$FRONTEND_DIR/.vite"
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

attempt_start() {
    local attempt="$1"

    echo "Starting Vite dev server on port $FRONTEND_PORT (attempt $attempt)..."
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
            return 1
        fi

        if (( elapsed >= FRONTEND_READY_TIMEOUT_SECONDS )); then
            echo ""
            return 2
        fi
        echo -n "."
        sleep 1
        elapsed=$((elapsed + 1))
    done
    echo " ready"
    return 0
}

if ! attempt_start 1; then
    if rg -q "Failed to resolve import|ENOENT|Cannot find module" "$PID_DIR/frontend.log"; then
        echo "Detected frontend dependency/import mismatch. Attempting automatic recovery..."
        rm -rf "$FRONTEND_DIR/.vite"
        install_frontend_dependencies
        if ! attempt_start 2; then
            echo "error: frontend process exited before becoming ready." >&2
            echo "hint: check $PID_DIR/frontend.log for details." >&2
            exit 1
        fi
    else
        echo "error: frontend process exited before becoming ready." >&2
        echo "hint: check $PID_DIR/frontend.log for details." >&2
        exit 1
    fi
fi

echo ""
echo "  Frontend  : http://localhost:$FRONTEND_PORT"
echo "  Logs      : $PID_DIR/frontend.log"
echo "  PID       : $(cat "$PID_DIR/frontend.pid")"
