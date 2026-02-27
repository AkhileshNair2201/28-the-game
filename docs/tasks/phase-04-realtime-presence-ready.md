# Phase 04 - Realtime Presence and Ready State

## Objective
Broadcast lobby changes live when players join/leave/ready.

## NestJS DI Safety
- Use explicit constructor injection with `@Inject(...)` for every provider dependency.
- Do not rely on metadata-only injection in dev/watch runtime.

## Scope
- Realtime updates for:
  - player joined
  - player left/disconnected
  - ready toggled
  - lobby deleted
- All connected clients see identical lobby state.

## Realtime Design
- NestJS WebSocket gateway namespace: `/lobby`.
- Channel/room: `lobby:{roomCode}`.
- Event types:
  - `lobby_snapshot`
  - `player_joined`
  - `player_left`
  - `ready_updated`
  - `lobby_deleted`

## Tasks
- Build WS auth middleware from JWT.
- Implement presence heartbeat (`ping`/`pong`) and disconnect timeout.
- Publish authoritative updates after DB transaction commit.
- Add version number to lobby payload for ordering.
- Add frontend subscription hooks + optimistic UI fallback.

## Acceptance Criteria
- Join/ready changes appear on all clients in under 500ms on local environment.
- Reconnecting client receives latest snapshot and resumes updates.
- Lobby owner delete triggers immediate close event to all members.
