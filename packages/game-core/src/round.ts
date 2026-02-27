import { GameRuleError } from './errors';
import { nextSeatCounterClockwise } from './helpers';
import { shuffleDeck } from './deck';
import { RoundScore, RoundState, Seat } from './types';

export function createRoundState(input: {
  dealerSeat: Seat;
  seed: string | number;
  initialMatchScore?: RoundScore;
}): RoundState {
  const deck = shuffleDeck(input.seed);

  const state: RoundState = {
    dealerSeat: input.dealerSeat,
    currentTurnSeat: nextSeatCounterClockwise(input.dealerSeat),
    phase: 'auction',

    deck,
    drawIndex: 0,
    hands: {
      0: [],
      1: [],
      2: [],
      3: []
    },

    bid: {
      highestBid: null,
      highestBidder: null,
      passCountSinceLastBid: 0
    },
    bidValue: null,
    bidderSeat: null,
    bidderTeam: null,
    effectiveTarget: null,

    trumpSuit: null,
    trumpRevealed: false,
    hiddenTrumpCard: null,

    currentTrick: [],
    trickLeaderSeat: null,
    completedTricks: [],
    tricksWon: { A: 0, B: 0 },
    cardPointsWon: { A: 0, B: 0 },
    tricksWonAfterReveal: { A: 0, B: 0 },

    mustTrumpSeat: null,
    pair: {
      declaredByTeam: null
    },

    matchScore: {
      A: input.initialMatchScore?.A ?? 0,
      B: input.initialMatchScore?.B ?? 0
    },
    roundWinnerTeam: null,
    roundBidSucceeded: null
  };

  return dealCards(state, 4);
}

export function dealCards(state: RoundState, cardsPerPlayer: number): RoundState {
  const next = structuredClone(state);
  let seat = nextSeatCounterClockwise(next.dealerSeat);

  for (let round = 0; round < cardsPerPlayer; round += 1) {
    for (let offset = 0; offset < 4; offset += 1) {
      const card = next.deck[next.drawIndex];
      if (!card) {
        throw new GameRuleError('INVALID_PHASE', 'Deck exhausted while dealing cards.');
      }

      next.hands[seat].push(card);
      next.drawIndex += 1;
      seat = nextSeatCounterClockwise(seat);
    }
  }

  return next;
}
