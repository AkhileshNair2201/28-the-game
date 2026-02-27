# Phase 01 - Foundation and Architecture

## Objective
Establish monorepo structure, baseline tooling, and backend/frontend skeleton aligned to AGENT guidance.

## Scope
- Create project structure:
  - `apps/web` (React + TS + Vite + Tailwind)
  - `apps/api` (NestJS + TS)
  - `packages/game-core` (pure rules engine)
  - `packages/shared` (DTOs/contracts)
- Setup lint, format, and test tooling.
- Setup environment variable strategy and config validation.

## Tasks
- Initialize workspace package manager (`pnpm` recommended).
- Add root scripts for `dev`, `build`, `test`, `lint`.
- Configure strict TypeScript in all packages.
- Add base CI workflow (lint + unit test).
- Define coding conventions for request IDs, versioning, and event naming.

## Deliverables
- Bootable `web` and `api` apps.
- Shared TS config and ESLint config.
- Initial README with setup steps.

## Acceptance Criteria
- `pnpm -r build` passes.
- `pnpm -r test` runs at least one sample test in `game-core`.
- Frontend and backend run locally with a single command.
