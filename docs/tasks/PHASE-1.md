# PHASE-1 - Monorepo and Tooling Scaffold

## Status Tracker

- Phase status: `implemented-pending-verification`
- Owner: `codex`
- Start date: `2026-02-27`
- Target completion date: `2026-02-27`
- Last updated: `2026-02-27`
- Notes: `Workspace scaffold and local lint/typecheck/test/build pass. CI execution and explicit local app-run verification still pending.`

## Checklist
- [x] Tasks started
- [x] Implementation complete
- [ ] Done criteria verified

## Goal
Create a runnable workspace with strict TypeScript and CI basics.

## Tasks
- Create folders: `apps/web`, `packages/game-core`, `packages/shared`.
- Initialize workspace config (`pnpm-workspace.yaml` or npm workspaces).
- Add root `tsconfig` and per-package `tsconfig`.
- Add ESLint and Prettier configs.
- Add base scripts: `lint`, `test`, `typecheck`, `build`.
- Setup GitHub Actions for lint + typecheck + unit tests.

## Done Criteria
- `npm/pnpm install` succeeds.
- `lint`, `typecheck`, and `test` pass in CI.
- `apps/web` runs locally.
