# PHASE-8 - Authoritative Intent APIs (v1)

## Status Tracker

- Phase status: `in progress`
- Owner: `codex`
- Start date: `2026-02-27`
- Target completion date: `2026-02-27`
- Last updated: `2026-02-27`
- Notes: `Intent routes + validation + version/idempotency are implemented with an in-memory store. Supabase transactional persistence is pending.`

## Checklist
- [x] Tasks started
- [ ] Implementation complete
- [ ] Done criteria verified

## Goal
Implement backend handlers that validate and persist moves transactionally.

## Tasks
- Build intent route handlers for bid/pass/trump/play/reveal.
- Enforce auth and seat ownership checks.
- Validate payloads with zod contracts.
- Implement compare-and-swap update using `expected_version`.
- Implement idempotent replay by `request_id`.
- Persist action log and resulting canonical state.

## Done Criteria
- Happy-path round actions succeed.
- Stale version returns conflict.
- Duplicate `request_id` returns same prior response.
