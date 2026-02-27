# Coding Conventions

## Request IDs
- Every client intent must include `request_id`.
- Format: UUID v7 preferred.
- `request_id` must be unique per actor intent.

## Versioning
- Server state snapshots include monotonically increasing `version`.
- Clients submit `expected_version` with each intent.
- Backend rejects mismatches with deterministic conflict errors.

## Event Naming
- Use `snake_case` names.
- Use domain prefixes when helpful, e.g. `lobby_player_joined`, `match_state_delta`.
- Events must be immutable payload contracts; introduce new fields in backward-compatible form.
