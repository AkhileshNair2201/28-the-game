# Phase 02 - Guest Onboarding and Identity

## Objective
Support instant guest onboarding with unique generated ID and editable nickname.

## NestJS DI Safety
- Use explicit constructor injection with `@Inject(...)` for every provider dependency.
- Do not rely on metadata-only injection in dev/watch runtime.

## Scope
- No mandatory signup for first play.
- Generate immutable unique `userId` server-side.
- Allow user-defined `nickname` with validation.

## Data Model
- `users`
  - `user_id` (UUID/ULID, unique, immutable)
  - `nickname` (3-20 chars, unique per lobby, not globally required)
  - `is_guest` (boolean)
  - `created_at`, `updated_at`

## Tasks
- Add `POST /auth/guest` endpoint in NestJS.
- Generate `userId` using secure ID strategy (`uuidv7` or ULID).
- Return session token (JWT) containing `userId`.
- Add `PATCH /users/me/nickname` with profanity/basic validation.
- Store user identity in browser local storage and rehydrate on app load.

## UX Requirements
- First screen asks nickname only.
- Show generated `userId` in profile/help area (read-only).
- Allow nickname updates before joining a lobby.

## Acceptance Criteria
- New visitor gets a valid guest session in one click.
- `userId` remains stable across refresh/reconnect on same browser session.
- Nickname is editable and reflected in lobby/game screens.
