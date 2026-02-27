# Twenty-Eight Implementation Tasks (Phase by Phase)

This folder breaks delivery into phases using:
- [RULES.md](/home/akhilesh/sandbox-dump/sandbox-28/28-the-game/docs/RULES.md)
- [AGENT.md](/home/akhilesh/sandbox-dump/sandbox-28/28-the-game/docs/AGENT.md)

Recommended stack used across phases:
- Frontend: React + TypeScript + HTML + CSS + Tailwind (Vite)
- Backend: Node.js + NestJS + TypeScript + WebSocket Gateway
- Database: PostgreSQL (primary), with Redis optional for pub/sub scaling
- Infra: AWS or GCP

## NestJS DI Safety Rule (Apply In All Phases)

- Do not rely on runtime metadata-only constructor injection in NestJS.
- Use explicit injection for services/guards/controllers:
  - `constructor(@Inject(ServiceToken) private readonly service: ServiceType) {}`
- Keep provider tokens registered in the owning module.
- Add/update tests when wiring new providers to catch DI regressions early.

## Phases

1. [Phase 01 - Foundation and Architecture](/home/akhilesh/sandbox-dump/sandbox-28/28-the-game/docs/tasks/phase-01-foundation.md)
2. [Phase 02 - Guest Onboarding and Identity](/home/akhilesh/sandbox-dump/sandbox-28/28-the-game/docs/tasks/phase-02-guest-onboarding.md)
3. [Phase 03 - Lobby and Room Lifecycle](/home/akhilesh/sandbox-dump/sandbox-28/28-the-game/docs/tasks/phase-03-lobby-room-lifecycle.md)
4. [Phase 04 - Realtime Presence and Ready State](/home/akhilesh/sandbox-dump/sandbox-28/28-the-game/docs/tasks/phase-04-realtime-presence-ready.md)
5. [Phase 05 - Core Game Rules Engine](/home/akhilesh/sandbox-dump/sandbox-28/28-the-game/docs/tasks/phase-05-game-core-rules.md)
6. [Phase 06 - Match APIs, Events, and Authority Flow](/home/akhilesh/sandbox-dump/sandbox-28/28-the-game/docs/tasks/phase-06-match-api-events.md)
7. [Phase 07 - Modern Table UI and Animations](/home/akhilesh/sandbox-dump/sandbox-28/28-the-game/docs/tasks/phase-07-ui-ux-animation.md)
8. [Phase 08 - QA, Observability, and Release](/home/akhilesh/sandbox-dump/sandbox-28/28-the-game/docs/tasks/phase-08-qa-release.md)
9. [Phase 09 - UI Refinement and Responsive UX](/home/akhilesh/sandbox-dump/sandbox-28/28-the-game/docs/tasks/phase-09-ui-refinement.md)

## User Minimum Requirements Mapping

- Guest onboarding + generated unique `userId`: Phase 02
- Create/share lobby with 6-char mixed room ID: Phase 03
- Live updates for join/ready: Phase 04
- Creator can delete lobby: Phase 03
- Full game flow: Phases 05 and 06
- Modern single-screen players/cards UX: Phase 07
- Animations for deal/bid/play: Phase 07
