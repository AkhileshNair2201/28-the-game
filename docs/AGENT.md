# AGENT.md - Stack Guide for Twenty-Eight (28)

This file defines the standard tech stack and system instructions for implementing Twenty-Eight (28) as a production-ready multiplayer web application.

Reference gameplay rules: `docs/RULES.md`.

## 1. Product Scope

Build a 4-player, 2-team multiplayer web app for Twenty-Eight with:
- Server-authoritative game rules
- Real-time gameplay
- Private hands + shared public table state
- Reconnect-safe sessions
- Optional lobby rule variants

## 2. Standard Tech Stack

## 2.1 Frontend (Required)
- Framework: `React` + `TypeScript`
- Markup/Styling: `HTML`, `CSS`, `Tailwind CSS`
- Build option: `Vite` (recommended) or `Next.js`
- State management: `React Context` or `Zustand`

## 2.2 Backend (Use proficiency stack)
- Runtime: `Node.js`
- Framework: `NestJS`
- Language: `TypeScript` (preferred), `JavaScript` allowed for utility scripts
- API style: REST + WebSocket gateway (NestJS WebSockets)
- Validation: `class-validator` / `zod`
- Auth/session: JWT-based auth in NestJS

## 2.3 Databases
Use one primary DB based on deployment needs:
- `PostgreSQL` (recommended default for transactional match state)
- `MySQL` (alternative)
- `MongoDB` (alternative for document/event models)
- `Firebase` (optional for auth/notifications/supporting services)

## 2.4 Cloud and Infra
- Cloud: `AWS` or `GCP`
- Suggested AWS services: ECS/EKS or EC2, RDS, ElastiCache, CloudWatch
- Suggested GCP services: GKE or Cloud Run, Cloud SQL, Memorystore, Cloud Logging
- Data/analytics pipelines (optional): `AWS Glue`

## 2.5 Tooling and Delivery
- Version control: `Git`
- Project management: `Jira`
- Process: `Agile` (sprint-based delivery)
- CI/CD: GitHub Actions (or cloud-native pipeline)

## 3. Architecture Rules (Must Follow)

1. Server-authoritative game engine.
- Clients send intents only (`place_bid`, `play_card`, etc.).
- Backend validates and applies all state transitions.

2. Single source of truth.
- Canonical match/round state lives in backend DB.
- Realtime events are delivery, not authority.

3. Pure rules core.
- Implement game rules from `docs/RULES.md` as pure functions.
- Keep DB/network outside the rules engine.

4. Deterministic transitions.
- Each valid action maps one state -> one next state (+ emitted events).

5. Private state projection.
- Never expose other players' hidden hands.
- Build seat-specific projections for every outbound update.

## 4. Backend Contract

## 4.1 Client -> Server intents
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

Each intent includes:
- `match_id`
- `actor_id`
- `request_id`
- `expected_version`
- action-specific payload

## 4.2 Server -> Client realtime events
- `state_delta`
- `trick_resolved`
- `round_resolved`
- `match_resolved`
- `player_disconnected`
- `player_reconnected`

## 4.3 Reliability requirements
- Optimistic concurrency using `version` or `action_seq`
- Idempotency via `request_id`
- Reconnect flow must support full state resync

## 5. Recommended Repository Structure

```
/apps
  /web                # React app (UI)
  /api                # NestJS backend (REST + WebSocket)
/packages
  /game-core          # Pure rules engine + types + validators
  /shared             # DTOs/event contracts
/docs
  RULES.md
  AGENT.md
```

## 6. Core Domain Model

Define strongly typed models:
- `Card`, `Suit`, `Rank`
- `PlayerSeat` (0-3), `Team` (A/B)
- `BidState`, `TrickState`, `RoundState`, `MatchState`
- `LobbyOptions` (pair rule, double/redouble, optional variants)

Minimum state fields:
- dealer seat
- current turn seat
- phase (`auction`, `play_before_trump`, `play_after_trump`, `round_end`, `match_end`)
- bid value + bidder
- trump suit + revealed flag
- hands per seat (private)
- trick cards on table
- won tricks and card points per team
- score per team
- state version

## 7. Security and Validation

- Validate identity for every intent.
- Reject turn-bound actions from non-current player.
- Enforce authorization at route/gateway level.
- Sanitize payloads and validate schemas strictly.

## 8. Testing Minimum Bar

1. Unit tests:
- trick winner resolution (before/after trump reveal)
- follow-suit validation
- overtrump behavior (if enabled)
- bidding resolution
- scoring with pair/double variants

2. Integration tests:
- full round happy path
- illegal action rejection
- concurrency conflict handling
- idempotent replay of same `request_id`
- reconnect and full resync

3. E2E tests:
- create lobby -> play one complete round
- disconnect/reconnect mid-round

## 9. Optional Web3 Extension (Only if explicitly enabled)

Given Solidity/Ethers proficiency, optionally add an isolated module for:
- escrowed entry/settlement logic
- signed match result submission
- on-chain payout

Rules:
- Off-chain gameplay remains authoritative for turn logic.
- On-chain integration must be optional and not block core gameplay.

## 10. Delivery Plan

1. Implement `game-core` from `docs/RULES.md`.
2. Build NestJS APIs and WebSocket gateways for intents/events.
3. Add DB schema for matches, rounds, actions, idempotency, versioning.
4. Build React + Tailwind UI with legal-move highlighting and reconnect UX.
5. Add optional rule flags and advanced variants.
6. Add observability, load testing, and deployment hardening on AWS/GCP.
