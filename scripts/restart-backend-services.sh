#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_DIR="$ROOT_DIR/scripts"
PID_DIR="$ROOT_DIR/.pid"

stop_backend_process() {
    if [[ ! -f "$PID_DIR/backend.pid" ]]; then
        echo "Backend PID file not found; skipping backend stop."
        return
    fi

    local pid
    pid="$(cat "$PID_DIR/backend.pid")"
    if kill -0 "$pid" 2>/dev/null; then
        echo "Stopping backend (PID $pid)..."
        kill "$pid"
        # Give uvicorn a moment to shut down cleanly.
        for _ in {1..20}; do
            if ! kill -0 "$pid" 2>/dev/null; then
                break
            fi
            sleep 0.2
        done
        if kill -0 "$pid" 2>/dev/null; then
            echo "Backend did not exit after SIGTERM; killing PID $pid."
            kill -9 "$pid" 2>/dev/null || true
        fi
    else
        echo "Backend process (PID $pid) was not running."
    fi

    rm -f "$PID_DIR/backend.pid"
}

stop_postgres_compose() {
    if docker compose -f "$ROOT_DIR/docker-compose.dev.yml" ps -q 2>/dev/null | grep -q .; then
        echo "Stopping Postgres dev docker compose services..."
        docker compose -f "$ROOT_DIR/docker-compose.dev.yml" down
    else
        echo "Postgres dev docker compose services were not running."
    fi
}

echo "Restarting backend services (Postgres + backend API)..."
stop_backend_process
stop_postgres_compose

echo "Starting backend services..."
"$SCRIPT_DIR/start-backend-services.sh"
