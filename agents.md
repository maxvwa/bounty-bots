# Starter Template — Agent & Local Setup Guide

## Project Overview

This template is a reusable full-stack local-development scaffold based on the Sleep With Me project, with app-specific feature code removed.

| Layer     | Technology                  | Location          |
|-----------|-----------------------------|-------------------|
| Backend   | Python 3.12, FastAPI        | `backend/`        |
| Database  | PostgreSQL 16               | `db/`             |
| Frontend  | Swift (iOS + watchOS)       | `frontend/`       |
| Infra     | Docker + Docker Compose     | root              |
| Docs      | Feature Designs & RFCs      | `docs/features/`  |
| Tickets   | Task Tracking (Markdown)    | `docs/tickets/` (active), `docs/tickets/implemented/` (completed) |

Template defaults use generic names (`TemplateApp`, `TemplateAppWatch`, `TemplateAppTests`) and generic script env prefixes (`TEMPLATE_*`) so the scaffold runs out of the box.

---

## Prerequisites

| Tool           | Version  | Install                          |
|----------------|----------|----------------------------------|
| Docker Desktop | Latest   | https://www.docker.com/products/docker-desktop |
| Xcode          | 16+      | Mac App Store                    |
| uv             | Latest   | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| Python         | 3.12+    | Managed automatically by uv      |
| Supabase CLI   | Latest (optional, required for `local_offline` auth mode) | `brew install supabase/tap/supabase` |
| direnv         | Latest (optional, for project script shortcuts) | `brew install direnv` |

---

## Recommended Local Dev Setup

Run **Postgres in Docker** and the **backend natively** with `uv`. This keeps hot reload fast on macOS.

## Run Python Backend Locally (Quick Start)

Use two terminals.

Terminal 1 (start Postgres):

```bash
cd <project-root>
cp .env.example .env
docker compose -f docker-compose.dev.yml up
```

Terminal 2 (run FastAPI app):

```bash
cd <project-root>/backend
uv sync
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

Verify:

```bash
curl http://localhost:8000/health
curl http://localhost:8000/health/db
open http://localhost:8000/docs
```

---

## Local Auth Modes (Scaffold)

The template supports two local auth modes:

- `hosted_dev`: uses a hosted Supabase dev project (internet required)
- `local_offline`: uses a local Supabase stack (no internet required)

Switch modes with:

```bash
cd <project-root>
scripts/start-local-auth.sh hosted_dev
# or
scripts/start-local-auth.sh local_offline
```

This writes `.env.auth.local`, which is read by backend settings.
In `local_offline` mode, the included script also provisions an example local Supabase storage bucket/policy setup (avatar-focused by default; customize or replace for your app).

Key auth/runtime env values:
- `AUTH_MODE`
- `AUTH_ISSUER`
- `AUTH_AUDIENCE`
- `AUTH_JWKS_URL`
- `AUTH_HS256_SHARED_SECRET` (local offline mode)
- `AUTH_REQUIRED`
- `CORS_ALLOWED_ORIGINS`

---

## Full Docker Start (CI / staging parity)

To run the full stack in Docker:

```bash
docker compose up --build
```

---

## Services Reference

### Backend (FastAPI)

The template starts with a minimal API surface:

| Endpoint      | Method | Description                 |
|---------------|--------|-----------------------------|
| `/`           | GET    | Root — API info             |
| `/health`     | GET    | API liveness check          |
| `/health/db`  | GET    | Database connectivity check |
| `/users`      | POST   | Create an example user      |
| `/users`      | GET    | List example users          |

Interactive docs: `http://localhost:8000/docs`

Extend this section as you add routes.

### Database (PostgreSQL)

Connect directly with any Postgres client:

```text
Host:     localhost
Port:     5432
User:     app_user       (or value from .env)
Password: app_password   (or value from .env)
Database: app_db         (or value from .env)
```

Example with `psql`:

```bash
docker compose -f docker-compose.dev.yml exec db psql -U app_user -d app_db
```

---

## Engineering Standards

### 1. Timezone Handling

- **UTC is king**: All timestamps stored in the database are UTC. Use `TIMESTAMP` columns and assign values from the application.
- **Pendulum for logic**: Use `pendulum` for parsing, arithmetic, and timezone conversion. Avoid using the standard `datetime` library for business logic.
- **Timezone comes from user data**: When user-local boundaries matter (for example start/end-of-day), resolve the timezone from persisted user profile data.
- **Local time for display/boundaries only**: Use local time only for presentation and boundary calculations.

### 2. Code Quality

- **Tests must pass**: Ensure backend/frontend/database tests pass before commit.
- **Type hints are required**: Keep `mypy` green.
- **Docstrings**: Functions longer than 2 lines should have a docstring describing purpose, parameters, and return value.
- **No `Any` returns**: Prefer explicit types and explicit return annotations.
- **Explicit null handling**: Use `if x is None:` checks for optional values; reflect optionality in type hints (`str | None`, etc.).
- **`.gitignore` hygiene**: Secrets and local runtime files (`.env`, local auth/runtime artifacts, machine-specific files) must be ignored. Track only safe templates such as `.env.example`.

### 4. Database Design

- **Primary keys**: Every table should have the left-most primary key column named `{table_name}_id`.
- **Independent sequences**: Do not use `SERIAL`/`BIGSERIAL`; create an explicit `SEQUENCE` per table and fetch from it before insert.
- **Use `BIGINT`**: Prefer `BIGINT` for primary keys.
- **Foreign keys**: Add foreign keys where required.
- **Model low-cardinality strings relationally**: Use lookup tables (for example `timezones`) instead of repeating strings directly.
- **Persisted enums / static data**: Low-cardinality values should be defined in `backend/app/static_data/` and map stable enum values to stable DB ids.
- **Stable low-cardinality ids**: A lookup row like a timezone should keep the same id across environments and over time.
- **Schema changes need approval**: Require explicit user approval before changing schema.
- **One table per SQL file**: Each table has its own `db/{table_name}.sql` file, including its sequence creation.
- **Database initializes from SQL files**: Startup schema initialization should execute the SQL files in dependency-safe order.
- **SQL filename format**: Use `{table_name}.sql`.
- **Idempotent initialization**: DB initialization should be safe to run repeatedly.

### 5. Database Interactions

- **Ensure concurrency**: Fetch the next `BIGINT` primary key from the table-specific sequence before insert.
- **Application populates required data**: Missing non-nullable values should fail at the database layer; do not rely on hidden DB defaults for app-owned fields.
- **Independent sequences**: Every table uses its own sequence to avoid cross-table coupling.
- **Fetch next value before insert**: Example flow: get `nextval('user_id_seq')`, build row, insert with that exact id.
- **Model-to-table alignment**: Keep each ORM model in its own file under `backend/app/models/` and align model/table names with SQL files.
- **Application controls timestamps**: Assign all dates/timestamps in the application, never via DB-side `NOW()` fallback logic for app-owned fields.

### 6. Input Validation

- **Client-side validation**: Validate user input client-side for UX and basic guardrails.
- **Server-side validation**: Always validate requests server-side to prevent malformed or malicious input.

### 7. Ticket Sizing and Sub-Ticketing

- **Split oversized tickets by default**: If a ticket spans multiple layers (infra + backend + frontend), includes external/manual setup, or is too large for a focused PR, split it first.
- **Parent-child structure**: Keep one parent ticket for product scope/decisions and create implementation sub-tickets as `<PREFIX>-x.y` with explicit `Blocked by` / `Blocks` links.
- **Vertical slices**: Sub-tickets should be independently testable and shippable.
- **Approval boundaries**: Isolate schema changes, security-sensitive changes, and external console/manual tasks in dedicated sub-tickets.
- **Definition of done per sub-ticket**: Include concrete acceptance criteria, impacted files/components, and test expectations.
- **Ticket location policy**: Keep active/planned tickets in `docs/tickets/`; move completed tickets to `docs/tickets/implemented/`; keep `docs/tickets/template.md` tracked.
- **Move approval required**: After implementing a ticket (or sub-ticket), ask the user for approval before moving its file into `docs/tickets/implemented/`.

---

## Pre-commit Hooks

Hooks run automatically on every `git commit`. They check:

- **end-of-file-fixer** — ensures files end with a single newline
- **ruff** — lints and auto-fixes issues, including import sorting
- **ruff-format** — formats code (replaces black)
- **swiftformat (frontend)** — checks Swift formatting for iOS/watchOS/test Swift files
- **swiftlint (frontend strict)** — lints Swift code for iOS/watchOS/test Swift files
- **mypy** — static type checking
- **sqlfluff-lint** — lints SQL schema files in `db/*.sql`
- **commit-msg-format** — enforces commit message format (see below)

### Commit Message Format

The template hook defaults to:

| Pattern | Example |
|---------|---------|
| `PROJ-<number> - <description>` | `PROJ-42 - Add user authentication` |
| `FIX <description>` | `FIX null pointer in session handler` |

Notes:
- `scripts/check-commit-msg.sh` supports overriding the prefix with `TEMPLATE_TICKET_PREFIX`.
- If you adopt a real project prefix, update the script and this section together.

### Install Hooks (One-Time, After Setting Up the Venv)

```bash
pre-commit install --hook-type pre-commit --hook-type commit-msg
```

### Run All Hooks Manually Against All Files

```bash
pre-commit run --all-files
```

### Run a Single Hook

```bash
pre-commit run ruff --all-files
pre-commit run mypy --all-files
pre-commit run sqlfluff-lint --all-files
pre-commit run swiftformat-frontend --all-files
pre-commit run swiftlint-frontend --all-files
```

### Swift Frontend Quality Tools

SwiftLint and SwiftFormat are used for iOS/watchOS/frontend Swift code quality.

Install locally:

```bash
brew install swiftlint swiftformat
```

Manual commands (wrapper scripts use repo config and frontend path scoping):

```bash
scripts/run-swiftlint.sh --strict
scripts/run-swiftformat.sh --lint
scripts/run-swiftformat.sh --apply
```

CI parity recommendation:
- Run `scripts/run-swiftformat.sh --lint` and `scripts/run-swiftlint.sh --strict` before `xcodebuild test`.

Useful targeted/staged examples:

```bash
scripts/run-swiftlint.sh --staged --strict
scripts/run-swiftformat.sh --staged --lint
scripts/run-swiftlint.sh frontend/TemplateApp/Views/ContentView.swift
```

### Skip Hooks for a Single Commit (Use Sparingly)

```bash
git commit --no-verify -m "wip"
```

---

## Development Workflows

### Add a New Dependency

```bash
# Add to pyproject.toml [project.dependencies], then:
uv lock && uv sync
```

### Restart Backend Services (Postgres + FastAPI)

Use this after backend dependency/config changes or when you want a clean backend restart without touching the frontend app flow.

```bash
cd <project-root>
scripts/restart-backend-services.sh
```

Notes:
- Restarts the dev Postgres Docker compose service and the local uvicorn backend process.
- Leaves local auth configuration (`.env.auth.local`) as-is.
- Does not restart the iOS frontend or stop the local Supabase stack.

### Wipe the Database and Start Fresh

```bash
docker compose -f docker-compose.dev.yml down -v   # removes postgres_data volume
docker compose -f docker-compose.dev.yml up
```

### Rebuild the Full Docker Stack After Changing Dependencies

```bash
docker compose up --build backend
```

### Configure Local Auth Mode

```bash
cd <project-root>
scripts/start-local-auth.sh hosted_dev
# or
scripts/start-local-auth.sh local_offline
```

### Provision Local Storage Policies Manually (Example Script)

The template includes `scripts/provision-avatar-storage-local.sh` as a working Supabase storage-policy example. If your app uses object storage:

```bash
cd <project-root>
scripts/provision-avatar-storage-local.sh
```

If your app does not use avatar uploads, replace or remove this script.

### Project Script Shortcuts with direnv

```bash
# one-time install + shell hook
brew install direnv
echo 'eval "$(direnv hook zsh)"' >> ~/.zshrc
source ~/.zshrc

# allow this repo's .envrc once
cd <project-root>
direnv allow
```

After `direnv allow`, scripts in `scripts/` are added to `PATH` while you are in this repo, so these commands work directly:

```bash
start-all.sh
stop.sh
start-backend-services.sh
restart-backend-services.sh
run-swiftlint.sh
run-swiftformat.sh
start-frontend.sh
start-local-auth.sh hosted_dev
provision-avatar-storage-local.sh
```

### Start-All Contract (Must Stay Complete)

`start-all.sh` is the canonical one-command local bootstrap and must always include every required component to reach a usable app state.

Minimum required responsibilities:
- Ensure local auth mode is configured (or fail with a clear action), including `.env.auth.local`.
- Start backend dependencies (Postgres + backend API).
- Start frontend (Simulator build/install/launch), unless explicitly skipped.
- Keep startup order deterministic and user-facing errors actionable.
- Support explicit mode overrides via `TEMPLATE_AUTH_MODE=hosted_dev|local_offline` (rename prefix later if you rename the scripts/env contract).

When adding new required local infrastructure (auth, storage, queues, etc.), update `start-all.sh` in the same change so it remains the single source of truth for local startup.

Current frontend launch env overrides:
- `TEMPLATE_SKIP_FRONTEND=true` to run backend/auth startup only
- `TEMPLATE_IOS_SIMULATOR` (simulator name, optional)
- `TEMPLATE_IOS_BUNDLE_ID` (bundle id, optional)
- `TEMPLATE_IOS_LAUNCH_RETRIES` (default `4`)
- `TEMPLATE_REQUIRE_BACKEND_HEALTH=true` to fail fast when backend health endpoint is unreachable

---

## Frontend (Swift — iOS + watchOS)

Swift source files live in `frontend/`. See `frontend/README.md` for Xcode setup instructions.

The included frontend is a minimal Xcodegen-based shell. Default target names are `TemplateApp`, `TemplateAppWatch`, and `TemplateAppTests`.

**Key setting — `frontend/TemplateApp/Info.plist`:**

```xml
<key>API_BASE_URL</key>
<string>http://localhost:8000</string>
<key>SUPABASE_URL</key>
<string><!-- set per environment --></string>
<key>SUPABASE_ANON_KEY</key>
<string><!-- set per environment --></string>
<key>SUPABASE_AVATAR_BUCKET</key>
<string>avatars</string>
```

If running on a physical device, use your Mac's LAN IP instead of `localhost`:

```bash
ipconfig getifaddr en0
```

---

## Project Structure

```text
<project-root>/
├── .env.example                  # Environment variable template
├── env/
│   └── auth/                     # Local auth mode templates (hosted_dev / local_offline)
├── .pre-commit-config.yaml       # Pre-commit hooks
├── docker-compose.yml            # Full stack (CI / staging)
├── docker-compose.dev.yml        # Dev: Postgres only
├── agents.md                     # This file
├── scripts/
│   ├── check-commit-msg.sh
│   ├── provision-avatar-storage-local.sh
│   ├── restart-backend-services.sh
│   ├── run-swiftformat.sh
│   ├── run-swiftlint.sh
│   ├── start-all.sh
│   ├── start-backend-services.sh
│   ├── start-frontend.sh
│   ├── start-local-auth.sh
│   └── stop.sh
├── docs/
│   ├── features/                 # Feature specs / design notes
│   ├── interim assessments/      # Periodic or on-demand project assessments
│   └── tickets/                  # Task tracking via Markdown
│       ├── implemented/          # Implemented/completed tickets (move after approval)
│       └── template.md
├── backend/
│   ├── Dockerfile
│   ├── pyproject.toml            # deps + tool config (ruff, mypy, pytest)
│   ├── uv.lock                   # reproducible lockfile
│   ├── .env.example              # Optional backend-local overrides
│   ├── app/
│   │   ├── main.py               # FastAPI app entry point
│   │   ├── config.py             # Settings (reads root .env + auth env)
│   │   ├── database.py           # Async SQLAlchemy engine + session + schema init
│   │   ├── models/               # ORM models split by table
│   │   ├── routers/              # API routes
│   │   ├── schemas.py            # Pydantic request/response schemas
│   │   └── static_data/          # Persisted enum mappings for lookup tables
│   └── tests/
│       ├── conftest.py           # Test DB + FastAPI fixtures
│       ├── test_health.py
│       └── test_users.py
├── db/
│   ├── timezones.sql
│   └── users.sql
└── frontend/
    ├── README.md                 # Xcode setup guide
    ├── project.yml               # Xcodegen project spec
    ├── TemplateApp/              # Starter iOS app target
    ├── TemplateAppWatch/         # Starter watchOS app target
    └── TemplateAppTests/         # Starter iOS unit tests target
```

---

## Common Issues

| Problem | Fix |
|---------|-----|
| `connection refused` on backend start | Wait for the `db` healthcheck to pass; the start scripts wait automatically |
| `port 5432 already in use` | Stop local Postgres: `brew services stop postgresql` |
| `port 8000 already in use` | Stop the existing process or change backend port env vars |
| `start-all.sh: command not found` inside repo | Run `direnv allow` once in repo root, or open a new shell after installing the direnv hook |
| `start-all.sh` does not launch iOS frontend | Set `TEMPLATE_IOS_SIMULATOR` to an available simulator name and re-run |
| `xcodebuild` says multiple simulators matched | Re-run `start-frontend.sh`; it resolves a simulator UDID |
| iOS app cannot reach backend on device | Use your Mac's LAN IP in `frontend/TemplateApp/Info.plist` (`API_BASE_URL`) |
| Offline auth mode fails to start | Install Supabase CLI and run `scripts/start-local-auth.sh local_offline` |
| Local storage policy setup fails | Re-run `scripts/provision-avatar-storage-local.sh` after local Supabase is started |
| Schema changes not reflected | Wipe the volume (`docker compose down -v`) or add migrations if you move beyond SQL-file init |

---

## Running Tests

### Backend (pytest)

Requires Postgres running (via `docker compose -f docker-compose.dev.yml up`). Template tests use a separate `app_db_test` database created automatically.

```bash
cd backend
uv sync                                   # installs all deps including dev
uv run pytest -v                           # run all tests
uv run pytest tests/test_users.py -v       # run a single file
uv run pytest -k "test_create_user" -v     # run tests matching a pattern
```

Current test files:
- `tests/conftest.py` — fixtures (test DB, transactional session, FastAPI client)
- `tests/test_health.py` — health check endpoints
- `tests/test_users.py` — example user create/list endpoints

### Frontend (XCTest)

The template includes a minimal unit test target shell.

- **Xcode**: `Cmd+U` to run all tests
- **Individual tests**: Click the diamond next to a test function in Xcode

Current test files:
- `TemplateAppTests/TemplateAppTests.swift` — starter XCTest

---

## Interim Assessments

On-demand codebase assessments can be generated to evaluate architecture, implementation quality, security, testing, and compliance with this document.

**Location:** `docs/interim assessments/`
**Template:** `docs/interim assessments/template.md`

### Running an Assessment

Ask the AI agent:

> "Run an interim assessment using the template in `docs/interim assessments/template.md`"

The agent will:
1. Read the codebase and configuration files.
2. Read this document (`agents.md`) for compliance checking.
3. Read the previous assessment (if any) to track progress.
4. Produce a new file named `assessment-YYYY-MM-DD.md`.

### What Assessments Cover

- Changes since the last assessment
- Architectural review (pros/cons of design decisions)
- Long-term risks
- Implementation gaps (planned vs delivered)
- Production readiness (cost estimates, milestones)
- Security review
- Testing review
- `agents.md` compliance

Assessments are append-only; previous assessments are never modified.

---

## First Customization Pass (Template-Specific)

1. Rename project/scheme/bundle IDs in `frontend/project.yml` and `scripts/start-frontend.sh`.
2. Keep the `TEMPLATE_*` script env prefixes, or replace them consistently with your project prefix.
3. Replace example tables/routes (`users`, `timezones`) with your domain model.
4. Update commit message prefix in `scripts/check-commit-msg.sh` (or set `TEMPLATE_TICKET_PREFIX`).
5. Replace or remove `scripts/provision-avatar-storage-local.sh` if your storage model differs.
