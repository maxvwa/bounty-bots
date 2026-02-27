# Bounty Bots

## Stack
- **Frontend**: React + Vite + TypeScript
- **Backend**: FastAPI (Python)
- **Database**: PostgreSQL (Docker)
- **Auth**: Supabase auth helpers (`hosted_dev` / `local_offline`)

## Quick Start

1. Copy env files:
   - `cp .env.example .env`
   - `scripts/start-local-auth.sh hosted_dev` (or `local_offline`)
2. Start backend services:
   - `scripts/start-backend-services.sh`
3. Verify:
   - `curl http://localhost:8000/health`
   - `curl http://localhost:8000/health/db`
4. Start frontend:
   - `cd frontend && npm install && npm run dev`
   - Open `http://localhost:5173`

Or launch everything together:
```bash
scripts/start-all.sh
```

## Frontend Development

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server runs at `http://localhost:5173`. Set `VITE_API_BASE_URL` in `frontend/.env.local` to override the default backend URL (`http://localhost:8000`).

## Docker (Production)

```bash
cp .env.example .env
# edit .env secrets before first start
docker compose -f docker-compose.prod.yml up -d --build
```

- Frontend: `http://<server-ip>`
- Backend API (proxied): `http://<server-ip>/api`

The production compose file does not expose Postgres or the backend directly.
Only the reverse proxy is published on port `80`.
