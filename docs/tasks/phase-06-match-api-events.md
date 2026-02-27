# Phase 06 - Match APIs, Events, and Authority Flow

## Objective
Connect `game-core` to NestJS APIs/WebSockets with strict server authority and replay safety.

## Scope
- Convert client intents into validated transitions.
- Persist match state + action log.
- Broadcast seat-projected state updates.

## Backend Contracts
- REST for create/join/start/recover flows.
- WebSocket for in-game intents and realtime deltas.
- Idempotency via `request_id`.
- Optimistic concurrency via `expected_version`.

## Tasks
- Create tables:
  - `matches`, `rounds`, `match_players`, `action_log`, `idempotency_keys`
- Build intent handlers:
  - `start_match`, `place_bid`, `pass_bid`, `choose_trump`, `play_card`, `request_trump_reveal`, `declare_pair`
- Use DB transaction per accepted intent:
  - load state
  - validate `expected_version`
  - apply game-core transition
  - persist new snapshot + append action log
  - emit event
- Add seat projection layer to hide non-owner hand cards.

## Acceptance Criteria
- Duplicate `request_id` does not double-apply an action.
- Conflicting versions return deterministic conflict response.
- Hidden card information is never leaked to other seats.
- Full round can be played end-to-end through API + WS.
