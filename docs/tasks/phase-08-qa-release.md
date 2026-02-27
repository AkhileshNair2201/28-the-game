# Phase 08 - QA, Observability, and Release

## Objective
Harden reliability, test critical flows, and prepare production deployment.

## NestJS DI Safety
- Include DI regression checks for provider wiring in test coverage.
- Use explicit constructor injection with `@Inject(...)` for every provider dependency.
- Do not rely on metadata-only injection in dev/watch runtime.

## Scope
- End-to-end validation of lobby + gameplay + reconnect.
- Metrics, logs, and error monitoring.
- Release checklist for cloud deployment.

## Testing Plan
- Unit tests:
  - `game-core` rules, winner logic, scoring, illegal action paths
- Integration tests:
  - lobby create/join/delete permissions
  - realtime join/ready propagation
  - idempotency and version conflicts
- E2E tests:
  - 4 users from guest onboarding to round completion
  - disconnect/reconnect and resync

## Observability
- Structured logs with `roomCode`, `matchId`, `userId`, `requestId`.
- Metrics:
  - active lobbies
  - websocket connection count
  - action latency p95
  - invalid action rate
  - reconnect success rate
- Error tracking: Sentry or equivalent.

## Release Checklist
- Production env vars configured.
- DB migrations applied.
- CORS and rate limits enabled.
- Security headers and JWT expiry/refresh policy verified.
- Backup/restore tested for match tables.

## Acceptance Criteria
- All critical path tests green in CI.
- No P0 privacy/security issues in hand visibility or authorization.
- System supports complete 4-player round with stable realtime sync.
