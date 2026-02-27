# AGENT.md - Vercel + Supabase Realtime Implementation Guide for Twenty-Eight (28)

This file defines the standard tech stack and system instructions for implementing this game as a production-ready web application on Vercel.

## 1. Product Scope

Build a multiplayer web app for the 4-player partnership trick-taking game Twenty-Eight.

Primary goals:
- Deterministic game rules (server authoritative)
- Real-time multiplayer gameplay
- Private player hands + public shared table state
- Reconnect-safe sessions
- Extensible rules via lobby options

Reference gameplay rules: `RULES.md`.

## 2. Standard Tech Stack

## 2.1 Frontend
- Framework: `Next.js` (App Router) + `React` + `TypeScript`
- Styling: `Tailwind CSS`
- UI components: `shadcn/ui` (or headless primitives)
- Client state: `Zustand`

## 2.2 Backend on Vercel
- Compute: `Next.js Route Handlers` and/or `Server Actions`
- Runtime: `Node.js` runtime on Vercel Functions
- Validation: `zod`
- Auth/session: `Supabase Auth` (or JWT session)

Important:
- Do not host your own WebSocket server on Vercel Functions.
- Use Supabase Realtime for publish/subscribe and presence.

## 2.3 Data + Realtime
- Database: `Supabase Postgres`
- Realtime transport: `Supabase Realtime` channels
- Optional cache/queue: add only if needed after profiling

## 2.4 Infra / DevOps
- Hosting: `Vercel` for web app and backend functions
- Managed backend services: `Supabase`
- CI: `GitHub Actions`

## 2.5 Testing and Quality
- Unit tests: `Vitest`
- API/integration tests: `Vitest` + route handler tests
- E2E tests: `Playwright`
- Linting: `ESLint`
- Formatting: `Prettier`

## 3. Architecture Rules (Must Follow)

1. Server-authoritative game engine.
- Never trust client-declared outcomes.
- Client sends intents (`place_bid`, `play_card`, `request_trump_reveal`), server validates and applies.

2. Single source of truth.
- Canonical round/match state lives in Postgres.
- Realtime events are transport, not authority.

3. Pure rules core.
- Implement core game logic as pure functions.
- No DB/network calls in rules engine.

4. Deterministic transitions.
- Every valid move maps current state -> one next state + event set.

5. Event-driven sync.
- Persist action log and emit deltas via Supabase Realtime.
- Clients can fully resync by fetching canonical state from API.

## 4. Key Implementation Rules (Required)

1. Authoritative validation
- All intents must be verified in backend functions before state mutation.

2. Optimistic concurrency
- Use `version` (or `action_seq`) on round/match rows.
- Update with compare-and-swap semantics (`WHERE version = ?`).
- On conflict, reject and ask client to resync.

3. Idempotency
- Every client intent must include `request_id`.
- Store processed request IDs per match/player window.
- Replayed requests return the same result without double-applying moves.

4. Reconnect and resync
- On reconnect, client fetches authoritative projected state via API.
- Realtime stream is then used for subsequent deltas only.

5. Private state projection
- Never broadcast hidden hand cards of other players.
- Build per-seat projected state views before emitting.

## 5. Repository Structure (Recommended)

```
/apps
  /web                # Next.js app (UI + route handlers)
/packages
  /game-core          # Pure rules engine + types + validators
  /shared             # DTOs/event contracts
/docs
  RULES.md
  AGENT.md
```

## 6. Core Domain Model

Use strongly typed models:
- `Card`, `Suit`, `Rank`
- `PlayerSeat` (0-3), `Team` (A/B)
- `BidState`, `TrickState`, `RoundState`, `MatchState`
- `LobbyOptions` (pair rule, double/redouble, etc.)

Minimum game state fields:
- dealer seat
- current turn seat
- phase (`auction`, `play_before_trump`, `play_after_trump`, `round_end`, `match_end`)
- bid value and bidder
- trump suit + revealed flag
- hands per seat (private)
- trick cards on table
- won tricks and point totals per team
- score per team
- state version

## 7. API + Realtime Contract

## 7.1 Client -> API intents
- `create_lobby`
- `join_lobby`
- `ready_toggle`
- `start_match`
- `place_bid`
- `pass_bid`
- `choose_trump`
- `play_card`
- `request_trump_reveal`
- `declare_pair`
- `call_double`
- `call_redouble`
- `leave_room`

Each intent payload includes:
- `match_id`
- `actor_id`
- `request_id`
- `expected_version`
- action-specific fields

## 7.2 Server -> Realtime events
Publish to channel `match:{id}`:
- `state_delta`
- `trick_resolved`
- `round_resolved`
- `match_resolved`
- `player_disconnected`
- `player_reconnected`

## 7.3 Security constraints
- Validate actor identity for every intent.
- Reject turn-bound intents from non-current player.
- Enforce row-level security policies in Supabase.

## 8. Matchmaking and Room Lifecycle

- Lobby size fixed to 4 players.
- Seating deterministic and visible.
- Match starts only when all players are ready.
- On disconnect, keep seat reserved for reconnect window.
- If timeout expires, end with technical result (configurable policy).

## 9. Persistence Strategy

Persist:
- user/session identity
- lobby config
- match metadata
- round snapshots
- action log (with request IDs)
- final results

Use transactions for each accepted move:
- lock/load state
- validate/apply transition
- persist state + action log
- publish realtime event

## 10. UI/UX Requirements

- Mobile + desktop responsive.
- Clear trick table with seat-relative orientation.
- Show legal playable cards clearly.
- Always show:
  - current turn
  - bid and bidder
  - trump status (hidden/revealed)
  - team scores
  - trick history
- Include reconnect flow with loading + state resync.

## 11. Performance and Reliability

- Target P95 intent-to-update latency < 250ms.
- Prevent double-submit via request IDs.
- Handle out-of-order client events using version checks.
- Fallback to full state fetch when drift is detected.

## 12. Observability

- Structured logs with match/lobby/player/request IDs.
- Metrics:
  - active lobbies
  - match duration
  - disconnect rate
  - invalid action rate
  - concurrency conflict rate
  - reconnection success rate
- Error tracking integration (e.g., Sentry).

## 13. Test Minimum Bar

1. Unit tests for:
- trick winner resolution (before/after trump reveal)
- follow-suit validation
- trump reveal flow
- bidding resolution
- round scoring including pair/double options

2. Integration tests for:
- full round happy path
- illegal action rejection
- optimistic concurrency conflicts
- idempotent replay of same `request_id`
- reconnect and full resync

3. E2E tests for:
- create lobby -> play one complete round
- disconnect/reconnect mid-round

No feature is complete without automated coverage for affected rules.

## 14. Coding Standards

- TypeScript strict mode enabled.
- Avoid `any`; use discriminated unions for action/event types.
- Prefer pure functions and explicit return types.
- Version API/event contracts for breaking changes.

## 15. Delivery Plan (Implementation Order)

1. Build `game-core` with complete baseline rules from `RULES.md`.
2. Define Postgres schema for lobbies/matches/rounds/action-log/versioning.
3. Implement route handlers for all intents with transactional validation.
4. Publish state deltas through Supabase Realtime channels.
5. Build minimal playable UI with reconnect + resync.
6. Add optional variants via lobby feature flags.
7. Harden with tests, observability, and operational safeguards.

## 16. Non-Goals (Initial Version)

- AI opponents with advanced strategy
- Tournament ladders/ranked matchmaking
- Voice/video chat
- Cosmetic-heavy animations before rules stability

## 17. Decision Policy

When ambiguity exists between implementation convenience and rules correctness:
- Choose correctness.
- Record the decision in docs.
- Keep behavior configurable only for known house-rule variants.
