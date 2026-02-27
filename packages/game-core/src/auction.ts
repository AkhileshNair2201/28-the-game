import { Rank, Suit } from "./types";

import { PlayerSeat, RoundState, TransitionResult } from "./round-types";

export function nextSeat(seat: PlayerSeat): PlayerSeat {
  return ((seat + 1) % 4) as PlayerSeat;
}

export function createInitialRoundState(input: {
  dealerSeat: PlayerSeat;
  hands?: Record<PlayerSeat, { suit: Suit; rank: Rank }[]>;
}): RoundState {
  const hands: Record<PlayerSeat, { suit: Suit; rank: Rank }[]> = input.hands ?? {
    0: [],
    1: [],
    2: [],
    3: []
  };

  return {
    dealerSeat: input.dealerSeat,
    currentTurnSeat: nextSeat(input.dealerSeat),
    phase: "auction",
    minBid: 14,
    maxBid: 28,
    highestBid: null,
    bidderSeat: null,
    bidValue: null,
    auctionPassesInRow: 0,
    trumpSuit: null,
    trumpRevealed: false,
    hiddenTrumpCard: null,
    hands,
    currentTrick: [],
    completedTricks: [],
    options: {
      overtrumpRequired: false
    }
  };
}

export function placeBid(state: RoundState, seat: PlayerSeat, value: number): TransitionResult {
  if (state.phase !== "auction") {
    return invalid(state, "INVALID_PHASE", "Bids are only allowed during auction.");
  }

  if (seat !== state.currentTurnSeat) {
    return invalid(state, "OUT_OF_TURN", "It is not this player's turn to bid.");
  }

  if (value < state.minBid || value > state.maxBid) {
    return invalid(state, "INVALID_BID_RANGE", "Bid is outside allowed range.");
  }

  if (state.highestBid && value <= state.highestBid.value) {
    return invalid(state, "BID_TOO_LOW", "Bid must be higher than current highest bid.");
  }

  const next: RoundState = {
    ...state,
    highestBid: { seat, value },
    bidderSeat: seat,
    bidValue: value,
    auctionPassesInRow: 0,
    currentTurnSeat: nextSeat(seat)
  };

  return { ok: true, state: next };
}

export function passBid(state: RoundState, seat: PlayerSeat): TransitionResult {
  if (state.phase !== "auction") {
    return invalid(state, "INVALID_PHASE", "Pass is only allowed during auction.");
  }

  if (seat !== state.currentTurnSeat) {
    return invalid(state, "OUT_OF_TURN", "It is not this player's turn to pass.");
  }

  if (!state.highestBid && seat === nextSeat(state.dealerSeat)) {
    return invalid(state, "OPENING_BID_REQUIRED", "Opening player must place a valid first bid.");
  }

  const passes = state.auctionPassesInRow + 1;

  if (state.highestBid && passes >= 3) {
    const next: RoundState = {
      ...state,
      phase: "trump_selection",
      bidderSeat: state.highestBid.seat,
      bidValue: state.highestBid.value,
      currentTurnSeat: state.highestBid.seat,
      auctionPassesInRow: passes
    };

    return { ok: true, state: next };
  }

  const next: RoundState = {
    ...state,
    auctionPassesInRow: passes,
    currentTurnSeat: nextSeat(seat)
  };

  return { ok: true, state: next };
}

export function chooseTrump(
  state: RoundState,
  seat: PlayerSeat,
  trumpSuit: Suit,
  hiddenTrumpRank: Rank
): TransitionResult {
  if (state.phase !== "trump_selection") {
    return invalid(state, "INVALID_PHASE", "Trump can only be chosen after auction ends.");
  }

  if (state.bidderSeat === null || seat !== state.bidderSeat) {
    return invalid(state, "UNAUTHORIZED", "Only bidder can choose trump.");
  }

  const next: RoundState = {
    ...state,
    trumpSuit,
    trumpRevealed: false,
    hiddenTrumpCard: {
      suit: trumpSuit,
      rank: hiddenTrumpRank
    },
    phase: "play_before_trump",
    currentTurnSeat: nextSeat(state.dealerSeat)
  };

  return { ok: true, state: next };
}

function invalid(state: RoundState, code: string, message: string): TransitionResult {
  return {
    ok: false,
    state,
    error: {
      code,
      message
    }
  };
}
