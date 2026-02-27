# PHASE-2 - Shared Types and Action Contracts

## Status Tracker

- Phase status: `completed`
- Owner: `codex`
- Start date: `2026-02-27`
- Target completion date: `2026-02-27`
- Last updated: `2026-02-27`

## Checklist
- [x] Tasks started
- [x] Implementation complete
- [x] Done criteria verified

## Goal
Define stable DTOs and action/event contracts used by web and backend.

## Tasks
- Create `packages/shared/src` with domain enums and IDs.
- Define action payload contracts (bid, pass, choose trump, play card, reveal trump).
- Define server event contracts (`state_delta`, `round_resolved`, etc.).
- Add zod schemas for all intent payloads.
- Export typed API response envelope for success/error/conflict.

## Done Criteria
- Shared package builds independently.
- Contract tests validate schema parsing.
- No `any` in action/event definitions.
