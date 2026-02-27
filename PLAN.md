# PLAN.md - Implementation Plan for Twenty-Eight Web App

This plan is based on:
- `docs/AGENT.md`
- `docs/ARCHITECTURE.md`
- `docs/RULES.md`

## 1. Delivery Strategy

Implementation will proceed in 8 phases:
1. Project setup and foundations
2. Game-core rules engine
3. Database and backend intent APIs
4. Realtime integration and sync correctness
5. Frontend playable experience
6. Scoring, match lifecycle, and variants
7. Reliability, observability, and hardening
8. Release readiness and production rollout

Definition of done:
- A full 4-player match is playable end-to-end.
- Rules are server-authoritative and deterministic.
- Reconnect and resync are reliable.
- Test suite covers core rules and critical flows.

## 2. Phase-by-Phase Plan

## Phase 1 - Foundations (Week 1)

Goals:
- Bootstrap monorepo structure and CI.
- Establish strict TypeScript and linting standards.

Tasks:
- Create structure:
  - `apps/web`
  - `packages/game-core`
  - `packages/shared`
- Setup toolchain: pnpm/npm workspace, TS config, ESLint, Prettier.
- Configure Vercel project and Supabase project.
- Add baseline CI for lint + unit test.

Acceptance criteria:
- CI passes on clean branch.
- App deploys to Vercel preview.
- Supabase connectivity verified.

## Phase 2 - Game-Core Rules Engine (Week 1-2)

Goals:
- Implement deterministic rules from `docs/RULES.md`.

Tasks:
- Define core types (`Card`, `RoundState`, `MatchState`, `Action`).
- Implement pure transitions:
  - bidding
  - trump selection/reveal
  - legal card play validation
  - trick winner resolution
  - round scoring
  - match score updates
- Add optional feature flags (pair, double, redouble) with defaults off.

Acceptance criteria:
- Unit tests cover all baseline rule paths.
- Same action sequence always yields same state.

## Phase 3 - Persistence + Intent APIs (Week 2)

Goals:
- Build authoritative backend intent processing.

Tasks:
- Create DB schema (matches, rounds, actions, idempotency keys).
- Implement `GET /api/matches/:id/state`.
- Implement intent endpoints with:
  - auth + authorization
  - schema validation
  - version checks (`expected_version`)
  - idempotency (`request_id`)
  - transactional write of state + action log

Acceptance criteria:
- Illegal actions rejected with explicit errors.
- Duplicate requests are idempotent.
- Version conflicts return deterministic `409` responses.

## Phase 4 - Supabase Realtime Integration (Week 2-3)

Goals:
- Push low-latency updates and maintain sync correctness.

Tasks:
- Create match channel strategy (`match:{id}`).
- Publish `state_delta`, `trick_resolved`, `round_resolved`, `match_resolved` events.
- Implement client subscription lifecycle and reconnect logic.
- Implement version gap detection -> full state resync.

Acceptance criteria:
- Multi-client updates visible in near-real time.
- Reconnect leads to correct canonical state.
- Event drops do not corrupt client state.

## Phase 5 - Playable Frontend (Week 3)

Goals:
- Deliver complete playable UX for one match.

Tasks:
- Build lobby flow (create/join/ready/start).
- Build table layout with seat-relative orientation.
- Implement bidding UI and trump interactions.
- Implement trick-play UI with legal move affordances.
- Display scores, current turn, bid, trump state, and trick history.

Acceptance criteria:
- 4 users can complete at least one full round.
- UI prevents obvious illegal actions and handles server rejections.

## Phase 6 - Match Lifecycle + Variants (Week 3-4)

Goals:
- Complete scoring progression and configurable rules.

Tasks:
- Implement match win/loss thresholds from rules.
- Implement lobby options for variants (pair/double/redouble).
- Ensure feature flags are enforced by game-core only (not UI logic).

Acceptance criteria:
- Match ends correctly by score thresholds.
- Variant settings change behavior deterministically.

## Phase 7 - Reliability + Observability (Week 4)

Goals:
- Harden operational behavior.

Tasks:
- Add structured logging with request/match identifiers.
- Add metrics for invalid actions, conflicts, reconnect success.
- Add error tracking integration.
- Add rate limiting on write endpoints.

Acceptance criteria:
- Core dashboards/alerts available.
- Fault scenarios are diagnosable via logs.

## Phase 8 - Release Readiness (Week 4-5)

Goals:
- Production-safe launch of v1.

Tasks:
- Run E2E suite on staging.
- Perform load and latency checks for target concurrency.
- Validate RLS and auth boundaries.
- Publish runbooks (incident, rollback, DB migration policy).

Acceptance criteria:
- Green CI, green E2E, acceptable latency.
- Documented rollback and support procedures.

## 3. Testing Plan

Unit tests (game-core):
- card ranking and trick winner logic
- follow-suit and trump-reveal enforcement
- bidder/trump constraints
- round scoring and match scoring

Integration tests (API + DB):
- happy path complete round
- illegal action rejection
- stale version conflict
- idempotent replay by same `request_id`

E2E tests:
- 4-player lobby -> play full round
- disconnect/reconnect during active round

## 4. Milestones

- M1: Foundation + CI ready
- M2: Rules engine complete with tests
- M3: Authoritative intent API complete
- M4: Realtime + reconnect stable
- M5: Playable MVP match flow
- M6: Variants + hardening complete
- M7: Production launch

## 5. Risk Register

1. State divergence between clients
- Mitigation: version checks + authoritative resync endpoint.

2. Race conditions under simultaneous actions
- Mitigation: CAS versioning and transactional updates.

3. Rule ambiguity due to house variants
- Mitigation: baseline strict defaults + explicit feature flags.

4. Realtime delivery gaps
- Mitigation: treat realtime as transport only; always recover from canonical API state.

## 6. Immediate Next Actions

1. Scaffold workspace and package boundaries.
2. Implement `packages/game-core` types and initial state generator.
3. Write first rule tests (bidding + trick resolution).
4. Design Supabase schema with versioned round state and action log.
