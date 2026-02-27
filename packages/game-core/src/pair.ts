import { GameRuleError } from './errors';
import { clamp, cloneState, seatToTeam } from './helpers';
import { RoundState, Seat } from './types';

export function declarePair(state: RoundState, actorSeat: Seat): RoundState {
  const next = cloneState(state);

  if (!next.trumpRevealed || next.trumpSuit === null) {
    throw new GameRuleError('PAIR_NOT_ALLOWED', 'Pair can only be declared after trump reveal.');
  }

  if (next.pair.declaredByTeam !== null) {
    throw new GameRuleError('PAIR_ALREADY_DECLARED', 'Pair has already been declared in this round.');
  }

  const team = seatToTeam(actorSeat);

  if (next.tricksWonAfterReveal[team] < 1) {
    throw new GameRuleError('PAIR_REQUIREMENTS_NOT_MET', 'Team must win at least one trick after reveal.');
  }

  const hand = next.hands[actorSeat];
  const hasKing = hand.some((card) => card.suit === next.trumpSuit && card.rank === 'K');
  const hasQueen = hand.some((card) => card.suit === next.trumpSuit && card.rank === 'Q');

  if (!hasKing || !hasQueen) {
    throw new GameRuleError('PAIR_REQUIREMENTS_NOT_MET', 'Player must hold K and Q of trump.');
  }

  if (next.effectiveTarget === null || next.bidderTeam === null) {
    throw new GameRuleError('PAIR_NOT_ALLOWED', 'Cannot declare pair before bid is established.');
  }

  if (team === next.bidderTeam) {
    next.effectiveTarget = clamp(next.effectiveTarget - 4, 0, 32);
  } else {
    next.effectiveTarget = clamp(next.effectiveTarget + 4, 0, 32);
  }

  next.pair.declaredByTeam = team;
  return next;
}
