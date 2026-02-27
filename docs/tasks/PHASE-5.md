# PHASE-5 - Trick Play Engine (Phase 1 and Phase 2)

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
Implement legal move validation and trick winner logic before/after trump reveal.

## Tasks
- Implement turn order and lead/follow-suit rules.
- Implement Phase 1 logic where hidden trump has no power.
- Implement `request_trump_reveal` behavior and transition to Phase 2.
- Implement Phase 2 trump winner logic.
- Implement bidder restriction for leading trump before reveal.
- Implement optional overtrump rule flag.

## Done Criteria
- Unit tests for follow-suit enforcement.
- Unit tests for winner resolution in both phases.
- Illegal plays are rejected with reason codes.
