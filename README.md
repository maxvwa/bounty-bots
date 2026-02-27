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
docker-compose up --build
```

- Backend: `http://localhost:8000`
- Frontend: `http://localhost:5173`
