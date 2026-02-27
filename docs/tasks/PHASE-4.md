# PHASE-4 - Auction and Trump Selection Engine

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
Implement bidding state machine and hidden trump selection.

## Tasks
- Model auction turns (counter-clockwise, min bid 14, max 28).
- Implement `place_bid` and `pass_bid` transitions.
- End auction when three players pass after a valid high bid.
- Implement `choose_trump` with hidden trump marker.
- Transition to round play-ready state after final deal metadata.

## Done Criteria
- Unit tests for legal/illegal bid paths.
- Exactly one bidder and one trump suit selected.
