# Twenty-Eight (28) - Rules and How to Play

This document defines a **web-app-ready** ruleset for the game **Twenty-Eight (28)** based on `docs/overview.txt`.

## 1. Game Summary

- Players: 4
- Teams: 2 fixed partnerships (players sitting opposite each other)
- Deck: 32 cards (`7, 8, 9, 10, J, Q, K, A` in each suit)
- Trick count per round: 8
- Goal: Bidding team must win at least its bid value in card points

## 2. Card Rank and Point Values

### Rank order (high to low)
`J > 9 > A > 10 > K > Q > 8 > 7`

### Card points
- `J` = 3
- `9` = 2
- `A` = 1
- `10` = 1
- `K, Q, 8, 7` = 0

Total points across all 32 cards = **28**.

## 3. Seating, Dealer, and Direction

- Play and bidding proceed **counter-clockwise**.
- Dealer rotates each round.
- Standard turn order at trick play: winner of previous trick leads next.

## 4. Round Structure

Each round has 5 stages:
1. Initial deal (4 cards each)
2. Auction (bidding)
3. Trump selection (hidden trump card)
4. Final deal (4 more cards each, 8 total)
5. Trick play and round scoring

## 5. Dealing and Auction

### Initial deal
- Dealer gives 4 cards to each player.

### Auction
- First bidder: player to dealer's right.
- Minimum opening bid: **14**.
- Maximum bid: **28**.
- A player may either:
  - bid higher than the current highest bid, or
  - pass.
- Auction ends when 3 players pass after a valid high bid.

### Auction winner
- Highest bidder becomes the **bidder**.
- Bidder chooses trump suit and places one card of that suit face down (hidden trump indicator).
- Other players do not know trump suit yet.

### Final deal
- Dealer deals 4 more cards to each player.
- Everyone now has 8 cards.

## 6. Trick Play: Two Phases

## 6.1 Phase 1 (Before trump reveal)

- First lead: player to dealer's right.
- Players must follow suit if possible.
- If all follow lead suit, highest-ranked card in lead suit wins.
- During Phase 1, hidden trump has **no power**.
  - Even if cards of the hidden trump suit are played, they do not beat lead suit.

### Important restriction for bidder
- Bidder may not lead trump in Phase 1 unless:
  - bidder has no non-trump cards, or
  - trump has already been led/opened by gameplay state that allows it.

### When a player cannot follow suit
The player may:
- Discard any card, or
- Ask to reveal trump before playing.

If trump is requested:
- Bidder flips hidden trump face up.
- Hidden trump card is now added back to bidder's active hand context.
- Requesting player must play a trump card if they have one; otherwise may discard.
- Game immediately enters Phase 2.

## 6.2 Phase 2 (After trump reveal)

- Any trick containing trump is won by highest trump.
- If no trump is played, highest card of lead suit wins.
- Players must follow lead suit if possible.
- If unable to follow, player may trump or discard.

### Overtrump rule (as given in source)
- If a trump has already been played to a trick and a later player cannot follow lead suit:
  - they must overtrump if possible,
  - otherwise they may play non-trump,
  - they may not play a lower trump when an overtrump is possible.

## 7. End of Round and Scoring

After 8 tricks:
- Each team totals card points from tricks won.
- If bidding team points >= bid: bidding team wins the round.
- Else: bidding team loses the round.

### Game points (default)
- Bid win: bidding team +1 game point.
- Bid fail: bidding team -1 game point.
- Non-bidding team game-point track remains unchanged in this baseline model.

## 8. Match Win Condition

Use pip-style team score tracking digitally:
- First team to reach **+6** wins match.
- Or if a team reaches **-6**, that team loses match.

For the web app, store score as integer in range `[-6, +6]` per team and end match when either limit is reached.

## 9. Pair Rule (King + Queen of trump)

Pair handling in the source contains regional differences. Baseline implementation:

- A "pair" means holding `K` and `Q` of trump suit.
- Pair can be declared only **after trump is revealed**.
- Team declaring pair must have already won at least one trick after reveal.
- Pair modifies bid target by 4:
  - If bidding team declares: effective target decreases by 4.
  - If defenders declare: effective target increases by 4.

Validation rule for app:
- Effective target must remain within `[0, 32]`.

## 10. Invalid Round / Redeal Conditions

For consistent online play, support these optional redeal triggers as toggles:
- A player has 8 cards worth 0 points.
- Opening player has no point cards in first 4 cards.

If enabled and condition is met before meaningful play, round is canceled and redealt.

## 11. Optional Competitive Rules (Feature Flags)

Implement these as lobby settings (off by default):

1. `double_enabled`
- Defenders may call Double after trump selection and before final deal.
- Stakes x2.

2. `redouble_enabled`
- Bidding team may answer Double with Redouble.
- Stakes x4 total.

3. `high_bid_two_points`
- Bids >= 21 are worth 2 game points (before double multipliers).

4. `last_trick_bonus` (for 29 variant)
- Winner of last trick gets +1 card point.

5. `single_hand_enabled`
- A player may declare Single Hand before first lead, attempting all 8 tricks alone with no partner play.
- Success/fail scoring configurable (common: +/-3 game points).

6. `auto_double_mode`
- Automatic stake escalation for high bids, per table rules.

7. `pair_restrictions_variant`
- Regional restrictions such as minimum bid threshold before pair can be shown.

## 12. Recommended Web App Rule Contract

For deterministic gameplay, backend should enforce:
- Turn order and legal card list per turn.
- Follow-suit obligations.
- Trump reveal state machine.
- Phase 1 vs Phase 2 winner logic.
- Overtrump constraint (if enabled).
- Bid fulfillment at round end using effective bid target.

Suggested round state fields:
- `dealer_seat`
- `current_turn_seat`
- `phase` (`auction`, `play_before_trump`, `play_after_trump`, `round_end`)
- `trump_suit` (hidden until reveal)
- `trump_revealed` (bool)
- `bid_value`
- `bidder_team`
- `effective_target`
- `tricks_won[team]`
- `card_points_won[team]`
- `stake_multiplier` (1/2/4)

## 13. Player-Facing "How to Play" (Short)

1. Receive 4 cards, then bid (14-28) for the right to pick trump.
2. Highest bidder secretly sets trump and everyone gets 4 more cards.
3. Play tricks counter-clockwise, following suit when possible.
4. If you cannot follow suit, you may request trump reveal; after reveal, trump beats other suits.
5. After 8 tricks, count points (`J=3, 9=2, A=1, 10=1`).
6. Bidding team must reach its bid target (adjusted by pair/double settings if used).
7. Win rounds to reach +6 game points first.

## 14. Notes on Source Ambiguity

`docs/overview.txt` mixes base rules with regional/house variants and includes contradictory lines. For production, keep one strict default ruleset and expose all deviations only through explicit lobby options.
