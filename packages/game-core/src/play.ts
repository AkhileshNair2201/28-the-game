import { CARD_POINTS } from './constants';
import { GameRuleError } from './errors';
import { cloneState, compareRankStrength, oppositeTeam, seatToTeam } from './helpers';
import { Card, RoundState, Seat, Suit, TrickPlay } from './types';

export function legalCards(state: RoundState, actorSeat: Seat): Card[] {
  if (state.phase !== 'play_before_trump' && state.phase !== 'play_after_trump') {
    return [];
  }

  if (state.currentTurnSeat !== actorSeat) {
    return [];
  }

  const hand = state.hands[actorSeat];
  if (hand.length === 0) {
    return [];
  }

  const leadSuit = state.currentTrick[0]?.card.suit;

  if (!leadSuit) {
    return legalLeadCards(state, actorSeat);
  }

  const followSuitCards = hand.filter((card) => card.suit === leadSuit);
  if (followSuitCards.length > 0) {
    return followSuitCards;
  }

  if (
    state.phase === 'play_after_trump' &&
    state.mustTrumpSeat === actorSeat &&
    state.trumpSuit !== null
  ) {
    const trumpCards = hand.filter((card) => card.suit === state.trumpSuit);
    if (trumpCards.length > 0) {
      return applyOvertrumpConstraint(state, trumpCards);
    }
  }

  if (state.phase === 'play_after_trump') {
    return applyOvertrumpConstraint(state, hand);
  }

  return hand;
}

export function playCard(state: RoundState, actorSeat: Seat, cardId: string): RoundState {
  const next = cloneState(state);

  if (next.phase !== 'play_before_trump' && next.phase !== 'play_after_trump') {
    throw new GameRuleError('INVALID_PHASE', 'Cards can only be played during play phases.');
  }

  if (next.currentTurnSeat !== actorSeat) {
    throw new GameRuleError('INVALID_TURN', 'It is not this player\'s turn.');
  }

  const legal = legalCards(next, actorSeat);
  const selected = legal.find((card) => card.id === cardId);

  if (!selected) {
    const inHand = next.hands[actorSeat].some((card) => card.id === cardId);
    if (!inHand) {
      throw new GameRuleError('CARD_NOT_IN_HAND', 'Selected card is not in player hand.');
    }

    throw new GameRuleError('ILLEGAL_CARD', 'Selected card is not legal for current trick constraints.');
  }

  removeCardFromHand(next.hands[actorSeat], selected.id);

  if (next.currentTrick.length === 0) {
    next.trickLeaderSeat = actorSeat;
  }

  next.currentTrick.push({
    seat: actorSeat,
    card: selected
  });

  if (next.mustTrumpSeat === actorSeat) {
    next.mustTrumpSeat = null;
  }

  if (next.currentTrick.length < 4) {
    next.currentTurnSeat = ((actorSeat + 1) % 4) as Seat;
    return next;
  }

  return resolveCurrentTrick(next);
}

function resolveCurrentTrick(state: RoundState): RoundState {
  if (state.currentTrick.length !== 4 || state.trickLeaderSeat === null) {
    return state;
  }

  const leadSuit = state.currentTrick[0]?.card.suit;
  if (!leadSuit) {
    return state;
  }

  const isPhaseAfterReveal = state.phase === 'play_after_trump' || state.trumpRevealed;
  const winnerSeat = determineTrickWinner(state.currentTrick, leadSuit, state.trumpSuit, isPhaseAfterReveal);
  const winnerTeam = seatToTeam(winnerSeat);

  const trickPoints = state.currentTrick.reduce((sum, play) => sum + CARD_POINTS[play.card.rank], 0);

  state.tricksWon[winnerTeam] += 1;
  state.cardPointsWon[winnerTeam] += trickPoints;

  if (isPhaseAfterReveal) {
    state.tricksWonAfterReveal[winnerTeam] += 1;
  }

  state.completedTricks.push({
    leaderSeat: state.trickLeaderSeat,
    cards: state.currentTrick.map((play) => ({ seat: play.seat, card: { ...play.card } })),
    winnerSeat,
    winnerTeam,
    points: trickPoints,
    phase: isPhaseAfterReveal ? 'play_after_trump' : 'play_before_trump'
  });

  state.currentTrick = [];
  state.trickLeaderSeat = winnerSeat;
  state.currentTurnSeat = winnerSeat;

  if (state.completedTricks.length >= 8) {
    finalizeRound(state);
  }

  return state;
}

function finalizeRound(state: RoundState): void {
  if (state.bidValue === null || state.bidderTeam === null || state.effectiveTarget === null) {
    throw new GameRuleError('BID_REQUIRED', 'Cannot finalize round without completed auction.');
  }

  state.phase = 'round_end';

  const bidderPoints = state.cardPointsWon[state.bidderTeam];
  const success = bidderPoints >= state.effectiveTarget;
  state.roundBidSucceeded = success;
  state.roundWinnerTeam = success ? state.bidderTeam : oppositeTeam(state.bidderTeam);

  if (success) {
    state.matchScore[state.bidderTeam] += 1;
  } else {
    state.matchScore[state.bidderTeam] -= 1;
  }
}

function legalLeadCards(state: RoundState, actorSeat: Seat): Card[] {
  const hand = state.hands[actorSeat];

  if (
    state.phase === 'play_before_trump' &&
    state.bidderSeat === actorSeat &&
    state.trumpSuit !== null &&
    !state.trumpRevealed
  ) {
    const nonTrump = hand.filter((card) => card.suit !== state.trumpSuit);
    if (nonTrump.length > 0) {
      return nonTrump;
    }
  }

  return hand;
}

function applyOvertrumpConstraint(state: RoundState, cards: Card[]): Card[] {
  if (state.phase !== 'play_after_trump' || state.trumpSuit === null || state.currentTrick.length === 0) {
    return cards;
  }

  const leadSuit = state.currentTrick[0]?.card.suit;
  if (!leadSuit) {
    return cards;
  }

  const trumpsInTrick = state.currentTrick.filter((play) => play.card.suit === state.trumpSuit);
  if (trumpsInTrick.length === 0) {
    return cards;
  }

  const currentHighestTrump = trumpsInTrick.reduce((best, play) => {
    if (!best) {
      return play.card;
    }

    return compareRankStrength(play.card.rank, best.rank) > 0 ? play.card : best;
  }, null as Card | null);

  if (!currentHighestTrump) {
    return cards;
  }

  const overtrumps = cards.filter(
    (card) =>
      card.suit === state.trumpSuit && compareRankStrength(card.rank, currentHighestTrump.rank) > 0
  );

  if (overtrumps.length > 0) {
    return overtrumps;
  }

  return cards;
}

function determineTrickWinner(
  trick: TrickPlay[],
  leadSuit: Suit,
  trumpSuit: Suit | null,
  trumpActive: boolean
): Seat {
  const candidates = [...trick];

  if (trumpActive && trumpSuit !== null) {
    const trumpCards = candidates.filter((play) => play.card.suit === trumpSuit);
    if (trumpCards.length > 0) {
      return highestCardPlay(trumpCards).seat;
    }
  }

  const leadCards = candidates.filter((play) => play.card.suit === leadSuit);
  return highestCardPlay(leadCards).seat;
}

function highestCardPlay(plays: TrickPlay[]): TrickPlay {
  if (plays.length === 0) {
    throw new GameRuleError('ILLEGAL_CARD', 'Cannot determine highest card for empty trick subset.');
  }

  return plays.reduce((best, current) =>
    compareRankStrength(current.card.rank, best.card.rank) > 0 ? current : best
  );
}

function removeCardFromHand(hand: Card[], cardId: string): void {
  const index = hand.findIndex((card) => card.id === cardId);
  if (index < 0) {
    return;
  }

  hand.splice(index, 1);
}
