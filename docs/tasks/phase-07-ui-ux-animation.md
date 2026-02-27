# Phase 07 - Modern Table UI and Animations

## Objective
Deliver a modern, intuitive UI where all players are visible and card visibility rules are correct.

## Scope
- Single-screen table view showing all 4 players simultaneously.
- Only own hand cards are visible; opponents/partner cards stay hidden.
- Rich motion for deal, bid, trick play, and trick collection.

## Frontend Stack
- React + TypeScript + Tailwind CSS
- Animation: `framer-motion` (recommended)
- State: server snapshot + local UI interaction state

## UX Layout Requirements
- Center table for current trick cards.
- Four fixed seat panels around table (bottom self, top opponent, left/right seats).
- Always-visible HUD:
  - bid + bidder
  - trump status (hidden/revealed)
  - current turn indicator
  - team points and match score
- Legal cards highlighted; illegal cards disabled.

## Animation Requirements
- Card dealing animation: deck -> each seat in sequence.
- Bid animation: chip/label rise near player seat.
- Card play animation: seat hand -> table center.
- Trick win animation: stack slides to winner seat.
- Respect reduced motion preference (`prefers-reduced-motion`).

## Tasks
- Build responsive table at mobile + desktop breakpoints.
- Implement card components with hidden/back-face variants.
- Add realtime-to-UI reconciliation for smooth transitions.
- Add sound hooks (optional, muted by default).

## Acceptance Criteria
- All players always visible in one screen on desktop.
- Mobile view keeps all seats visible without breaking playability.
- Card privacy rules enforced in every rendered state.
- Deal/bid/play/trick animations run smoothly without desync.
