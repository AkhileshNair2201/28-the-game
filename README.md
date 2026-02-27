# Twenty-Eight Monorepo

Monorepo for the Twenty-Eight (28) multiplayer web app.

## Stack
- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend: NestJS + TypeScript + WebSocket-ready architecture
- Shared: `packages/shared` for DTO/contracts
- Rules: `packages/game-core` for pure game logic

## Project Structure
- `apps/web` - React client
- `apps/api` - NestJS backend
- `packages/game-core` - pure rule engine
- `packages/shared` - shared types/contracts

## Setup
```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
pnpm install
```

## Commands
```bash
pnpm dev
pnpm build
pnpm test
pnpm lint
```

## QA and Release
- QA plan: `docs/QA_TEST_PLAN.md`
- Release checklist: `docs/RELEASE_CHECKLIST.md`
- Runtime metrics: `GET /api/observability/metrics`

## Git Hooks
Install repo-managed hooks once:
```bash
pnpm hooks:install
```

This enables `.githooks/pre-commit`, which runs:
- `pnpm build`
- `pnpm test`
- `pnpm lint`

## Local PostgreSQL (Docker)
```bash
docker compose up -d postgres
docker compose ps
```

Postgres 17 is configured in `docker-compose.yml` and reads credentials from root `.env`:
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`

The API reads the same DB env variables via `apps/api/src/config/env.ts`.

## Lobby APIs (Phase 03)
All lobby endpoints require `Authorization: Bearer <token>`.

- `POST /api/lobbies` - create a lobby
- `POST /api/lobbies/:roomCode/join` - join a lobby
- `GET /api/lobbies/:roomCode` - get lobby details
- `DELETE /api/lobbies/:roomCode` - delete lobby (owner only)

Room code rules:
- Exactly 6 characters
- Uses `[A-Za-z0-9_-]`
- Generated code includes at least one letter, one digit, and one special char (`-` or `_`)

## Environment Strategy
- Keep app-specific env files per app (`apps/web/.env`, `apps/api/.env`).
- Validate env vars at startup before serving requests.
- Never commit secrets.

Additional API envs for production hardening:
- `JWT_TTL_SECONDS`
- `CORS_ORIGIN`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX`

## Conventions
See `docs/CONVENTIONS.md`.
