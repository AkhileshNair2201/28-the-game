# PHASE-7 - Supabase Schema and Migrations

## Status Tracker

- Phase status: `implemented-pending-verification`
- Owner: `codex`
- Start date: `2026-02-27`
- Target completion date: `2026-02-27`
- Last updated: `2026-02-27`
- Notes: `Schema, indexes, RLS policies, and seed scripts are added. Migration execution against a running Supabase/Postgres instance is pending.`

## Checklist
- [x] Tasks started
- [x] Implementation complete
- [ ] Done criteria verified

## Goal
Create durable canonical storage aligned with architecture.

## Tasks
- Add tables: lobbies, lobby_players, matches, rounds, actions, idempotency_keys.
- Add `version` columns for optimistic concurrency.
- Add indexes for `(match_id, version)` and idempotency lookups.
- Add RLS policies for match membership access.
- Add migration scripts and seed data for local dev.

## Done Criteria
- Migrations apply cleanly on a fresh database.
- RLS blocks unauthorized read/write.
- Version and idempotency indexes are present.
