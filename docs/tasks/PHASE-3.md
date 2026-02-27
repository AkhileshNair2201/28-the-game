# PHASE-3 - Core Card Model and Utilities

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
Implement deterministic card/rank logic from `docs/RULES.md`.

## Tasks
- Define `Suit`, `Rank`, `Card` and 32-card deck generator.
- Implement rank comparator (`J > 9 > A > 10 > K > Q > 8 > 7`).
- Implement point calculator (`J=3`, `9=2`, `A=1`, `10=1`).
- Add helpers for suit following and hand operations.

## Done Criteria
- Unit tests cover rank ordering and point totals (deck total = 28).
- Utility functions are pure and deterministic.
