#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_DIR="$ROOT_DIR/.pid"
stopped=""

kill_with_children() {
    local root_pid="$1"
    local signal="${2:-TERM}"

    # Depth-first traversal ensures children are signaled before parents.
    local child_pids
    child_pids="$(pgrep -P "$root_pid" 2>/dev/null || true)"
    if [[ -n "$child_pids" ]]; then
        while IFS= read -r child_pid; do
            [[ -n "$child_pid" ]] || continue
            kill_with_children "$child_pid" "$signal"
        done <<< "$child_pids"
    fi

    if kill -0 "$root_pid" 2>/dev/null; then
        kill "-$signal" "$root_pid" 2>/dev/null || true
    fi
}

# --- Stop frontend ---------------------------------------------------------
if [[ -f "$PID_DIR/frontend.pid" ]]; then
    pid=$(cat "$PID_DIR/frontend.pid")
    if kill -0 "$pid" 2>/dev/null; then
        kill_with_children "$pid" "TERM"
        sleep 1
        if kill -0 "$pid" 2>/dev/null; then
            kill_with_children "$pid" "KILL"
        fi
        echo "Stopped frontend (PID $pid)"
    else
        echo "Frontend process (PID $pid) was not running."
    fi
    stopped="frontend"
fi

# Fallback: if frontend PID file is missing/stale, stop any vite process for this repo.
frontend_leftovers="$(
    ps -axo pid,command |
        rg "frontend/node_modules/.bin/vite|npm exec vite --port" |
        rg -v "[r]g frontend/node_modules/.bin/vite|[r]g \"frontend/node_modules/.bin/vite|npm exec vite --port\"" |
        awk '{print $1}' || true
)"
if [[ -n "$frontend_leftovers" ]]; then
    while IFS= read -r leftover_pid; do
        [[ -n "$leftover_pid" ]] || continue
        kill_with_children "$leftover_pid" "TERM"
    done <<< "$frontend_leftovers"
    sleep 1
    while IFS= read -r leftover_pid; do
        [[ -n "$leftover_pid" ]] || continue
        kill_with_children "$leftover_pid" "KILL"
    done <<< "$frontend_leftovers"
    echo "Stopped leftover frontend vite processes."
    stopped="frontend"
fi

# --- Stop backend ----------------------------------------------------------
if [[ -f "$PID_DIR/backend.pid" ]]; then
    pid=$(cat "$PID_DIR/backend.pid")
    if kill -0 "$pid" 2>/dev/null; then
        kill "$pid"
        echo "Stopped backend (PID $pid)"
    else
        echo "Backend process (PID $pid) was not running."
    fi
    stopped="$stopped backend"
fi

# --- Stop Postgres ---------------------------------------------------------
if docker compose -f "$ROOT_DIR/docker-compose.dev.yml" ps -q 2>/dev/null | grep -q .; then
    echo "Stopping docker compose services..."
    docker compose -f "$ROOT_DIR/docker-compose.dev.yml" down
    stopped="$stopped docker"
else
    echo "Docker compose services were not running."
fi

# --- Stop Supabase local stack (if running) --------------------------------
if command -v supabase >/dev/null 2>&1; then
    # supabase CLI exits 0 when nothing is running; suppress noisy output.
    if supabase status >/dev/null 2>&1; then
        echo "Stopping Supabase local stack..."
        supabase stop >/dev/null 2>&1 || true
        stopped="$stopped supabase"
    fi
fi

# --- Clean up PID directory ------------------------------------------------
if [[ -d "$PID_DIR" ]]; then
    rm -rf "$PID_DIR"
fi

# --- Summary ---------------------------------------------------------------
if [[ -n "$stopped" ]]; then
    echo "All services stopped."
else
    echo "Nothing was running."
fi
