# Phase 03 - Lobby and Room Lifecycle

## Objective
Implement lobby creation, joining by room code, and creator-controlled deletion.

## Scope
- Any guest can create lobby.
- Lobby gets shareable 6-character room code.
- Lobby creator is the owner and can delete lobby.

## Room ID Rules
- Length: exactly 6.
- Charset: uppercase/lowercase letters + digits + safe special chars.
- Recommended charset: `A-Za-z0-9-_` (URL/share safe).
- Enforce uniqueness with DB unique index + retry on collision.

## Data Model
- `lobbies`
  - `lobby_id` (UUID)
  - `room_code` (CHAR(6), unique)
  - `owner_user_id`
  - `status` (`waiting`, `in_game`, `closed`)
  - `created_at`, `updated_at`
- `lobby_players`
  - `lobby_id`
  - `user_id`
  - `seat` (0-3 nullable until assigned)
  - `ready` (boolean)
  - `joined_at`

## Tasks
- Implement endpoints:
  - `POST /lobbies` (create, returns room code)
  - `POST /lobbies/:roomCode/join`
  - `DELETE /lobbies/:roomCode` (owner only)
  - `GET /lobbies/:roomCode`
- Add owner permission guard for delete/start actions.
- Add conflict handling when lobby is full or closed.

## Acceptance Criteria
- Creator can share room code and others can join using it.
- Only creator can delete lobby.
- Delete operation removes/archives lobby and disconnects subscribers.
- Room code format always matches 6-char mixed pattern.
