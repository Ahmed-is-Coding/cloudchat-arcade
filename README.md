# CloudChat Arcade (MVP v2)

A Discord-like real-time chat app with an “Arcade” tab (6 games) + first-time admin setup + admin console.

## What you get in this MVP

- First-time setup page to create the initial **admin**
- Register / Login (JWT)
- User profile editing (display name, bio, avatar color)
- Servers + Rooms (create + join)
- Real-time room chat (WebSocket)
- Presence (online/offline) + online count per room
- Typing indicator
- Message history saved in PostgreSQL
- Arcade (6 games)
  - Tic-Tac-Toe (multiplayer, server-validated)
  - Connect-4 (multiplayer, server-validated)
  - Quiz Rush (multiplayer, server-validated)
  - Neon Snake (single-player score → room leaderboard)
  - Rock Paper Scissors (multiplayer)
  - Word Guess (room challenge)
- “Join Call” button (MVP) using an embedded Jitsi room (public meet.jit.si)

Admin console:
- List users, change roles (user/mod/admin)
- Ban/unban users (banned users cannot login or connect to websockets)
- List/delete servers
- Enable/disable games in the catalog

## Stack

Backend:
- FastAPI (REST + WebSocket)
- PostgreSQL (chat history)
- Redis (presence + pub/sub + game state)

Frontend:
- Next.js (App Router) + TypeScript
- Tailwind CSS (neon / gaming UI)

## Quick start (Docker)

After login, click **+** to create your first server and room.

1) Install Docker Desktop  
2) In repo root:

```bash
cp .env.example .env
docker compose up --build
```

If you previously ran an older version and your database schema is outdated, do a clean start:

```bash
docker compose down -v --remove-orphans
docker compose build --no-cache
docker compose up
```

Open:
- Frontend: http://localhost:3000
- Backend docs: http://localhost:8000/docs

First run:
- Open http://localhost:3000 → **Setup required** → create admin
- Then use /app (Profile + Admin buttons appear in the top bar)

## Default ports

- frontend: 3000
- api: 8000
- postgres: 5432
- redis: 6379

## Local dev (no Docker)

Backend:

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env
uvicorn app.main:app --reload --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Notes (Kubernetes later)

This MVP already uses Redis pub/sub and a room channel per room, so scaling the API to multiple replicas is a straightforward next step (K8s Deployment + HPA). Postgres and Redis can move to StatefulSets or managed services later.
