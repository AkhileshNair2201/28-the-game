# QA Test Plan (Phase 08)

## 1. Automated Gates
Run before every release:

```bash
pnpm lint
pnpm test
pnpm build
```

CI must pass on PR and `main`.

## 2. Unit Coverage Focus
- `packages/game-core`: bidding, trick winner, scoring, illegal action paths.
- `apps/api`: auth token validation, room code generation, DI wiring, observability counters.

## 3. Integration Validation
- Lobby permissions:
  - owner can delete lobby
  - non-owner cannot delete lobby
- Realtime propagation:
  - lobby join/ready updates are visible to all members
- Match safety:
  - idempotency via `request_id`
  - deterministic 409 on `expected_version` conflict
  - private hands not leaked to non-viewers

## 4. E2E Manual Flow
1. Create 4 users in separate browser sessions.
2. Join one lobby and mark all players ready.
3. Start match and complete one round.
4. During round, disconnect one user (close tab/network off), reconnect, and verify state resync.
5. Confirm all players eventually show same `version` and turn seat.

## 5. Security Regression Checks
- JWT required on protected REST routes.
- WebSocket auth rejects missing/invalid token.
- CORS policy configured by env.
- Rate limit blocks abusive request bursts (`429`).
- Security headers present on API responses.

## 6. Release Blocking Criteria
- No failing build/lint/test.
- No P0 privacy leak (card visibility / unauthorized room or match access).
- Full 4-player round stable under realtime updates.
