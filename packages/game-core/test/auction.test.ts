import { describe, expect, it } from 'vitest';
import { createRoundState, legalBids, passBid, placeBid } from '../src/index';

describe('auction flow', () => {
  it('runs auction to choose trump phase after three passes', () => {
    let state = createRoundState({ dealerSeat: 0, seed: 'auction-seed' });

    const bidder = state.currentTurnSeat;
    const legal = legalBids(state, bidder);
    expect(legal.values[0]).toBe(14);

    state = placeBid(state, bidder, 16);
    state = passBid(state, state.currentTurnSeat);
    state = passBid(state, state.currentTurnSeat);
    state = passBid(state, state.currentTurnSeat);

    expect(state.phase).toBe('choose_trump');
    expect(state.currentTurnSeat).toBe(bidder);
    expect(state.bidValue).toBe(16);
    expect(state.bidderSeat).toBe(bidder);
    expect(state.effectiveTarget).toBe(16);
  });
});
