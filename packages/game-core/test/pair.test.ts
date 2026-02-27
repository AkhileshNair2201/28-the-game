import { describe, expect, it } from 'vitest';
import { createRoundState, declarePair, GameRuleError } from '../src/index';
import { cardId, setHand } from './test-helpers';

describe('pair declaration', () => {
  it('applies pair declaration target adjustment after reveal', () => {
    const state = createRoundState({ dealerSeat: 0, seed: 'pair-seed' });
    state.phase = 'play_after_trump';
    state.bidValue = 20;
    state.bidderSeat = 0;
    state.bidderTeam = 'A';
    state.effectiveTarget = 20;
    state.trumpSuit = 'S';
    state.trumpRevealed = true;
    state.tricksWonAfterReveal.A = 1;

    setHand(state, 0, [cardId('K', 'S'), cardId('Q', 'S')]);

    const next = declarePair(state, 0);
    expect(next.effectiveTarget).toBe(16);
    expect(next.pair.declaredByTeam).toBe('A');

    expect(() => declarePair(next, 0)).toThrow(GameRuleError);
  });
});
