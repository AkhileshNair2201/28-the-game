import { GameRuleError } from './errors';
import { cloneState, nextSeatCounterClockwise, seatToTeam } from './helpers';
import { LegalBidsResult, RoundState, Seat } from './types';
import { isBidInRange } from './version';

export function legalBids(state: RoundState, actorSeat: Seat): LegalBidsResult {
  if (state.phase !== 'auction') {
    return {
      values: [],
      canPass: false
    };
  }

  if (state.currentTurnSeat !== actorSeat) {
    return {
      values: [],
      canPass: false
    };
  }

  const minimum = state.bid.highestBid === null ? 14 : state.bid.highestBid + 1;
  const values: number[] = [];

  for (let bid = minimum; bid <= 28; bid += 1) {
    values.push(bid);
  }

  return {
    values,
    canPass: true
  };
}

export function placeBid(state: RoundState, actorSeat: Seat, bidValue: number): RoundState {
  const next = cloneState(state);

  if (next.phase !== 'auction') {
    throw new GameRuleError('INVALID_PHASE', 'Bids are only allowed during auction phase.');
  }

  if (next.currentTurnSeat !== actorSeat) {
    throw new GameRuleError('INVALID_TURN', 'It is not this player\'s turn to bid.');
  }

  if (!isBidInRange(bidValue)) {
    throw new GameRuleError('INVALID_BID', 'Bid must be an integer between 14 and 28.');
  }

  const minimum = next.bid.highestBid === null ? 14 : next.bid.highestBid + 1;
  if (bidValue < minimum) {
    throw new GameRuleError('INVALID_BID', `Bid must be at least ${minimum}.`);
  }

  next.bid.highestBid = bidValue;
  next.bid.highestBidder = actorSeat;
  next.bid.passCountSinceLastBid = 0;
  next.currentTurnSeat = nextSeatCounterClockwise(actorSeat);

  return next;
}

export function passBid(state: RoundState, actorSeat: Seat): RoundState {
  const next = cloneState(state);

  if (next.phase !== 'auction') {
    throw new GameRuleError('INVALID_PHASE', 'Pass is only allowed during auction phase.');
  }

  if (next.currentTurnSeat !== actorSeat) {
    throw new GameRuleError('INVALID_TURN', 'It is not this player\'s turn to pass.');
  }

  next.bid.passCountSinceLastBid += 1;

  if (next.bid.highestBid === null && next.bid.passCountSinceLastBid >= 4) {
    throw new GameRuleError('BID_REQUIRED', 'At least one player must place a bid.');
  }

  if (next.bid.highestBid !== null && next.bid.passCountSinceLastBid >= 3) {
    if (next.bid.highestBidder === null) {
      throw new GameRuleError('BID_REQUIRED', 'Auction cannot end without a highest bidder.');
    }

    next.phase = 'choose_trump';
    next.currentTurnSeat = next.bid.highestBidder;
    next.bidValue = next.bid.highestBid;
    next.bidderSeat = next.bid.highestBidder;
    next.bidderTeam = seatToTeam(next.bid.highestBidder);
    next.effectiveTarget = next.bidValue;

    return next;
  }

  next.currentTurnSeat = nextSeatCounterClockwise(actorSeat);
  return next;
}
