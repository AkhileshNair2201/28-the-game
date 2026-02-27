# 28-the-game

Web implementation of the Twenty-Eight (28) card game.

## Docs
- Rules: [docs/RULES.md](docs/RULES.md)
- Agent/stack guide: [docs/AGENT.md](docs/AGENT.md)
- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Phase tasks: [docs/tasks/README.md](docs/tasks/README.md)

## Tech Stack
- Frontend/API: Next.js + TypeScript
- Game engine: `packages/game-core` (pure rules)
- Shared contracts: `packages/shared`
- Database: Postgres (Supabase-compatible schema)
- Realtime: Supabase Realtime

## Workspace Structure
- `apps/web` - Next.js app (UI + route handlers)
- `packages/game-core` - deterministic game logic
- `packages/shared` - DTOs, schemas, event contracts
- `supabase/migrations` - database schema
- `docs` - rules, architecture, plans, tasks

## Prerequisites
- Node `20.19.0` (see `.nvmrc`)
- npm `10+`
- Docker (optional, for local Postgres + app)

## Environment Setup
1. Copy env template:
   - `cp .env.example .env.local`
2. Fill Supabase values when using realtime/auth:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

## Run Locally (Native)
1. Install dependencies:
   - `npm install`
2. Start app:
   - `npm run dev`
3. Open:
   - `http://localhost:3000`

## Run with Docker Compose
1. Start services:
   - `docker compose up --build`
2. App URL:
   - `http://localhost:3000`
3. Postgres URL:
   - `postgresql://postgres:postgres@localhost:5432/twentyeight`

## Scripts
- `npm run dev` - run Next.js app
- `npm run build` - workspace build
- `npm run lint` - workspace lint
- `npm run typecheck` - workspace type checks
- `npm run test` - workspace tests

## Current Status
Implementation is being executed phase-by-phase.
Track progress in `docs/tasks/PHASE-*.md` status trackers.
