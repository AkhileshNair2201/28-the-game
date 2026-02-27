import { describe, expect, it } from 'vitest';
import {
  createRoundState,
  legalCards,
  passBid,
  placeBid,
  playCard,
  seatToTeam,
  type Card,
  type Seat
} from '../src/index';
import { cardId, setHand } from './test-helpers';

describe('play rules and scoring', () => {
  it('enforces follow-suit and bidder trump lead restriction in phase 1', () => {
    let state = createRoundState({ dealerSeat: 0, seed: 'legal-cards-seed' });
    state = placeBid(state, state.currentTurnSeat, 14);
    state = passBid(state, state.currentTurnSeat);
    state = passBid(state, state.currentTurnSeat);
    state = passBid(state, state.currentTurnSeat);

    const bidder = state.bidderSeat as Seat;

    const bidderTrump: Card = { id: cardId('J', 'S'), rank: 'J', suit: 'S' };
    state.hands[bidder] = [
      bidderTrump,
      { id: cardId('7', 'H'), rank: '7', suit: 'H' },
      { id: cardId('8', 'H'), rank: '8', suit: 'H' }
    ];

    state.trumpSuit = 'S';
    state.hiddenTrumpCard = { id: cardId('9', 'S'), rank: '9', suit: 'S' };
    state.phase = 'play_before_trump';
    state.currentTurnSeat = bidder;
    state.currentTrick = [];

    const leadLegal = legalCards(state, bidder);
    expect(leadLegal.map((card) => card.id)).not.toContain(bidderTrump.id);

    const leadSeat = state.currentTurnSeat;
    state.hands[leadSeat] = [{ id: cardId('A', 'H'), rank: 'A', suit: 'H' }];
    state = playCard(state, leadSeat, cardId('A', 'H'));

    const nextSeat = state.currentTurnSeat;
    state.hands[nextSeat] = [
      { id: cardId('K', 'H'), rank: 'K', suit: 'H' },
      { id: cardId('7', 'C'), rank: '7', suit: 'C' }
    ];

    const secondLegal = legalCards(state, nextSeat).map((card) => card.id);
    expect(secondLegal).toEqual([cardId('K', 'H')]);
  });

  it('resolves trick with trump dominance after reveal and applies scoring at round end', () => {
    const state = createRoundState({ dealerSeat: 0, seed: 'score-seed' });
    state.phase = 'play_after_trump';
    state.bidValue = 14;
    state.bidderSeat = 0;
    state.bidderTeam = seatToTeam(0);
    state.effectiveTarget = 14;
    state.trumpSuit = 'S';
    state.trumpRevealed = true;

    state.currentTurnSeat = 0;
    setHand(state, 0, [cardId('A', 'H')]);
    setHand(state, 1, [cardId('J', 'S')]);
    setHand(state, 2, [cardId('9', 'H')]);
    setHand(state, 3, [cardId('10', 'H')]);

    let next = playCard(state, 0, cardId('A', 'H'));
    next = playCard(next, 1, cardId('J', 'S'));
    next = playCard(next, 2, cardId('9', 'H'));
    next = playCard(next, 3, cardId('10', 'H'));

    expect(next.completedTricks).toHaveLength(1);
    expect(next.completedTricks[0]?.winnerSeat).toBe(1);
    expect(next.cardPointsWon.B).toBe(7);

    next.completedTricks = Array.from({ length: 7 }, (_, index) => ({
      leaderSeat: 0,
      cards: [],
      winnerSeat: 0,
      winnerTeam: 'A',
      points: index === 0 ? 14 : 0,
      phase: 'play_after_trump' as const
    }));
    next.cardPointsWon.A = 14;
    next.cardPointsWon.B = 14;
    next.tricksWon.A = 4;
    next.tricksWon.B = 4;
    next.currentTrick = [];
    next.currentTurnSeat = 0;
    setHand(next, 0, [cardId('7', 'H')]);
    setHand(next, 1, [cardId('8', 'H')]);
    setHand(next, 2, [cardId('K', 'H')]);
    setHand(next, 3, [cardId('Q', 'H')]);

    next = playCard(next, 0, cardId('7', 'H'));
    next = playCard(next, 1, cardId('8', 'H'));
    next = playCard(next, 2, cardId('K', 'H'));
    next = playCard(next, 3, cardId('Q', 'H'));

    expect(next.phase).toBe('round_end');
    expect(next.roundBidSucceeded).toBe(true);
    expect(next.matchScore.A).toBe(1);
  });
});
