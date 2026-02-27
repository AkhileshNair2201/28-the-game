# Phase 05 - Core Game Rules Engine

## Objective
Implement pure deterministic Twenty-Eight rules per `docs/RULES.md`.

## Scope
- Auction flow (14-28), bidder selection, trump selection.
- Two play phases (before and after trump reveal).
- Follow-suit validation, overtrump rule, trick winner logic.
- Round scoring and match scoring to +/-6.

## Package
- `packages/game-core`
  - No DB calls
  - No network calls
  - Pure state in, state out

## Tasks
- Define core types (`Card`, `Suit`, `Rank`, `RoundState`, `MatchState`).
- Implement deterministic deck shuffle strategy (seeded RNG support for tests).
- Implement legal move generator:
  - `legalBids(state, actor)`
  - `legalCards(state, actor)`
- Implement transitions:
  - `placeBid`, `passBid`, `chooseTrump`, `playCard`, `requestTrumpReveal`, `declarePair`
- Implement round resolution and score updates.
- Add feature flag support for optional rules (pair, double, redouble variants).

## Tests
- Unit tests for every transition and invalid action rejection.
- Golden scenario tests for full round progression.

## Acceptance Criteria
- Engine rejects all illegal moves with explicit reason codes.
- Same input action sequence always produces identical final state.
- Rule behavior matches baseline sections in `docs/RULES.md`.
