# Release Checklist (Phase 08)

## Environment
- [ ] Production `.env` values configured.
- [ ] `JWT_SECRET` rotated and stored in secret manager.
- [ ] `JWT_TTL_SECONDS` approved by security policy.
- [ ] `CORS_ORIGIN` restricted to production web origin.
- [ ] `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX` tuned.

## Database
- [ ] PostgreSQL reachable from API runtime.
- [ ] DB migration process validated for target environment.
- [ ] Backup and restore rehearsal completed.

## Runtime and Security
- [ ] CORS enabled with strict origin policy.
- [ ] Rate limiting enabled and verified (`429`).
- [ ] Security headers verified in responses.
- [ ] Authorization checks validated for lobby/match endpoints.

## Observability
- [ ] Structured logs include `roomCode`, `matchId`, `userId`, `requestId` where relevant.
- [ ] Metrics endpoint available: `GET /api/observability/metrics`.
- [ ] Alerting/monitoring wired for error spikes and reconnect degradation.
- [ ] Error tracking integration enabled (Sentry or equivalent, if configured).

## Verification
- [ ] `pnpm lint` green.
- [ ] `pnpm test` green.
- [ ] `pnpm build` green.
- [ ] Manual 4-player smoke test completed.
