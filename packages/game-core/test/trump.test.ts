import { describe, expect, it } from 'vitest';
import {
  chooseTrump,
  createRoundState,
  passBid,
  placeBid,
  requestTrumpReveal,
  playCard,
  legalCards,
  type Seat
} from '../src/index';
import { cardId } from './test-helpers';

describe('trump mechanics', () => {
  it('chooses hidden trump and transitions to play_before_trump with correct hand sizes', () => {
    let state = createRoundState({ dealerSeat: 1, seed: 'trump-seed' });

    state = placeBid(state, state.currentTurnSeat, 18);
    state = passBid(state, state.currentTurnSeat);
    state = passBid(state, state.currentTurnSeat);
    state = passBid(state, state.currentTurnSeat);

    const bidder = state.bidderSeat as Seat;
    const bidderHand = state.hands[bidder];
    const hidden = bidderHand.find((card) => card.suit === 'H') ?? bidderHand[0];

    if (!hidden) {
      throw new Error('Missing hidden trump card for test');
    }

    state = chooseTrump(state, bidder, hidden.suit, hidden.id);

    expect(state.phase).toBe('play_before_trump');
    expect(state.trumpSuit).toBe(hidden.suit);
    expect(state.hiddenTrumpCard?.id).toBe(hidden.id);
    expect(state.hands[bidder].length).toBe(7);

    for (const seat of [0, 1, 2, 3] as Seat[]) {
      if (seat === bidder) {
        continue;
      }

      expect(state.hands[seat].length).toBe(8);
    }
  });

  it('supports trump reveal request and mandatory trump for requester', () => {
    let state = createRoundState({ dealerSeat: 0, seed: 'reveal-seed' });
    state = placeBid(state, state.currentTurnSeat, 15);
    state = passBid(state, state.currentTurnSeat);
    state = passBid(state, state.currentTurnSeat);
    state = passBid(state, state.currentTurnSeat);

    const bidder = state.bidderSeat as Seat;

    state.phase = 'play_before_trump';
    state.trumpSuit = 'S';
    state.trumpRevealed = false;
    state.hiddenTrumpCard = { id: cardId('Q', 'S'), rank: 'Q', suit: 'S' };
    state.currentTurnSeat = 0;
    state.currentTrick = [];
    state.hands[0] = [{ id: cardId('A', 'H'), rank: 'A', suit: 'H' }];
    state = playCard(state, 0, cardId('A', 'H'));

    const requester = state.currentTurnSeat;
    state.hands[requester] = [
      { id: cardId('7', 'S'), rank: '7', suit: 'S' },
      { id: cardId('8', 'C'), rank: '8', suit: 'C' }
    ];

    if (bidder !== requester) {
      state.hands[bidder] = [{ id: cardId('9', 'D'), rank: '9', suit: 'D' }];
    }

    state = requestTrumpReveal(state, requester);

    expect(state.phase).toBe('play_after_trump');
    expect(state.trumpRevealed).toBe(true);

    const legalAfterReveal = legalCards(state, requester).map((card) => card.id);
    expect(legalAfterReveal.length).toBeGreaterThan(0);
    expect(legalAfterReveal.every((id) => id.endsWith('S'))).toBe(true);
  });
});
