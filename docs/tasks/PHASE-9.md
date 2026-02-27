# PHASE-9 - Supabase Realtime Publish/Subscribe

## Status Tracker

- Phase status: `implemented-pending-verification`
- Owner: `codex`
- Start date: `2026-02-27`
- Target completion date: `2026-02-27`
- Last updated: `2026-02-27`
- Notes: `Publish/subscribe wiring and version-gap handling are implemented; end-to-end verification with live Supabase channels is pending.`

## Checklist
- [x] Tasks started
- [x] Implementation complete
- [ ] Done criteria verified

## Goal
Stream state updates to connected players with version-aware recovery.

## Tasks
- Publish `state_delta` and round/match resolution events to `match:{id}`.
- Subscribe client to match channel after initial state fetch.
- Include state version in every event.
- Implement gap detection and automatic full resync.

## Done Criteria
- Multiple clients see near-real-time updates.
- Dropped/out-of-order event causes safe resync.
