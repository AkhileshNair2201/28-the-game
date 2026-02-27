import { GameRuleError } from './errors';
import { cloneState, nextSeatCounterClockwise } from './helpers';
import { dealCards } from './round';
import { RoundState, Seat, Suit } from './types';

export function chooseTrump(state: RoundState, actorSeat: Seat, suit: Suit, hiddenCardId: string): RoundState {
  const next = cloneState(state);

  if (next.phase !== 'choose_trump') {
    throw new GameRuleError('INVALID_PHASE', 'Trump can only be selected after auction.');
  }

  if (next.bidderSeat !== actorSeat || next.currentTurnSeat !== actorSeat) {
    throw new GameRuleError('INVALID_TURN', 'Only the winning bidder can choose trump.');
  }

  const hand = next.hands[actorSeat];
  const hiddenCardIndex = hand.findIndex((card) => card.id === hiddenCardId);
  const hiddenCard = hiddenCardIndex >= 0 ? hand[hiddenCardIndex] : null;

  if (!hiddenCard) {
    throw new GameRuleError('INVALID_TRUMP', 'Hidden trump card must be from bidder hand.');
  }

  if (hiddenCard.suit !== suit) {
    throw new GameRuleError('INVALID_TRUMP', 'Hidden trump card must match selected trump suit.');
  }

  hand.splice(hiddenCardIndex, 1);
  next.hiddenTrumpCard = hiddenCard;
  next.trumpSuit = suit;
  next.trumpRevealed = false;

  const dealt = dealCards(next, 4);
  dealt.phase = 'play_before_trump';
  dealt.currentTurnSeat = nextSeatCounterClockwise(dealt.dealerSeat);
  dealt.trickLeaderSeat = null;

  return dealt;
}

export function requestTrumpReveal(state: RoundState, actorSeat: Seat): RoundState {
  const next = cloneState(state);

  if (next.phase !== 'play_before_trump') {
    throw new GameRuleError('TRUMP_REVEAL_NOT_ALLOWED', 'Trump can only be revealed in phase 1.');
  }

  if (next.currentTurnSeat !== actorSeat) {
    throw new GameRuleError('INVALID_TURN', 'Only current player can request trump reveal.');
  }

  if (!next.trumpSuit || !next.hiddenTrumpCard || next.bidderSeat === null || next.trumpRevealed) {
    throw new GameRuleError('TRUMP_NOT_AVAILABLE', 'No hidden trump available to reveal.');
  }

  const leadCard = next.currentTrick[0]?.card;
  if (!leadCard) {
    throw new GameRuleError('TRUMP_REVEAL_NOT_ALLOWED', 'Trump reveal can only happen after lead card.');
  }

  const hand = next.hands[actorSeat];
  const canFollow = hand.some((card) => card.suit === leadCard.suit);
  if (canFollow) {
    throw new GameRuleError('TRUMP_REVEAL_NOT_ALLOWED', 'Cannot request reveal while able to follow suit.');
  }

  next.trumpRevealed = true;
  next.phase = 'play_after_trump';
  next.hands[next.bidderSeat].push(next.hiddenTrumpCard);
  next.hiddenTrumpCard = null;
  next.mustTrumpSeat = actorSeat;

  return next;
}
