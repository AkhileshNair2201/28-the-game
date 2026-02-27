# Phase 09 - UI Refinement and Responsive UX

## Objective
Polish lobby/table usability and responsiveness for smoother real-user gameplay.

## Scope
1. Copyable room code in lobby.
2. Better spacing in center trick placeholders.
3. Responsive table behavior for small screens (avoid overlaps).
4. Global API error toast feedback.

## NestJS DI Safety
- Keep explicit constructor injection with `@Inject(...)` for all backend changes supporting this phase.
- Add/update tests whenever provider wiring changes.

## Tasks

### 1. Lobby Room Code Copy UX
- In lobby screen, add a `Copy Room ID` action next to displayed room code.
- Use Clipboard API (`navigator.clipboard.writeText`) with fallback for unsupported contexts.
- Show success/failure feedback via toast.

### 2. Center Trick Placeholder Spacing
- Increase spacing and improve alignment for the 4 trick placeholder slots in table center.
- Ensure placeholder cluster does not collide with hidden-deck visuals or player seat cards.
- Keep spacing consistent across desktop breakpoints.

### 3. Small-Screen Responsive Strategy
- Add small-screen mode for table layout (e.g., `< 900px` and `< 640px` breakpoints):
  - Always show:
    - own hand cards
    - center trick placeholders / played cards
    - top HUD (turn, bid, trump, score)
  - Hide non-essential remote seat card stacks to prevent overlap.
  - Add a `Players` action button/drawer/modal to view other player details (name, seat, team, tricks, points, ready-like status where relevant).
- Preserve playability: legal-card highlighting and action controls must remain fully usable.

### 4. Global Error Toasts
- Add lightweight toast system in web app for API and realtime errors.
- Replace inline-only error feedback with non-blocking toast notifications.
- Minimum toast variants:
  - `error` (API failure / intent reject)
  - `success` (copy room code, key state saves)
- Auto-dismiss + manual dismiss support.

## Acceptance Criteria
- Lobby room code can be copied in one click, with visible success feedback.
- Center trick placeholders are visually separated and not congested.
- On small screens, no card/placeholder overlap; play remains functional.
- Other player details remain accessible via button-triggered panel/modal.
- API errors surface as toast notifications consistently across onboarding, lobby, and table actions.
