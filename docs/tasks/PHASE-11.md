# PHASE-11 - Reconnect, Idempotency, and Conflict UX

## Status Tracker

- Phase status: `in progress`
- Owner: `codex`
- Start date: `2026-02-27`
- Target completion date: `2026-02-27`
- Last updated: `2026-02-27`
- Notes: `Added client-side pending-action guard, automatic resync on version conflict, localStorage session restore, and persisted server store for lobby/match continuity. Seat-reservation timeout UX remains pending.`

## Checklist
- [x] Tasks started
- [ ] Implementation complete
- [ ] Done criteria verified

## Goal
Make gameplay reliable under disconnects and concurrent actions.

## Tasks
- Add reconnect flow that fetches authoritative state first.
- Add pending-action UI with request IDs.
- Handle conflict responses by automatic state refresh.
- Prevent duplicate submit in UI.
- Add seat reservation timeout handling in UX.

## Done Criteria
- Mid-round reconnect restores correct state.
- Duplicate click does not double-play moves.
- Conflict handling is understandable to users.
