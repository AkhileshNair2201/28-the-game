import { compareRanks, hasSuit, legalCardsForLeadSuit, removeCardFromHand } from "./cards";
import { nextSeat } from "./auction";
import { PlayerSeat, RoundState, TransitionResult } from "./round-types";
import { Card } from "./types";

export function requestTrumpReveal(state: RoundState, seat: PlayerSeat): TransitionResult {
  if (state.phase !== "play_before_trump") {
    return invalid(state, "INVALID_PHASE", "Trump can only be revealed during phase 1 play.");
  }

  if (seat !== state.currentTurnSeat) {
    return invalid(state, "OUT_OF_TURN", "It is not this player's turn.");
  }

  if (state.currentTrick.length === 0) {
    return invalid(state, "REVEAL_NOT_ALLOWED", "Trump cannot be revealed before lead card is played.");
  }

  const leadEntry = state.currentTrick[0];
  if (!leadEntry) {
    return invalid(state, "REVEAL_NOT_ALLOWED", "Trump cannot be revealed before lead card is played.");
  }
  const leadSuit = leadEntry.card.suit;
  const hand = state.hands[seat];
  if (hasSuit(hand, leadSuit)) {
    return invalid(state, "REVEAL_NOT_ALLOWED", "Player can follow suit and cannot request reveal.");
  }

  return {
    ok: true,
    state: {
      ...state,
      phase: "play_after_trump",
      trumpRevealed: true
    }
  };
}

export function playCard(state: RoundState, seat: PlayerSeat, card: Card): TransitionResult {
  if (state.phase !== "play_before_trump" && state.phase !== "play_after_trump") {
    return invalid(state, "INVALID_PHASE", "Cards can only be played during active trick phases.");
  }

  if (seat !== state.currentTurnSeat) {
    return invalid(state, "OUT_OF_TURN", "It is not this player's turn.");
  }

  const hand = state.hands[seat];
  const cardInHand = hand.some((c) => c.suit === card.suit && c.rank === card.rank);
  if (!cardInHand) {
    return invalid(state, "CARD_NOT_IN_HAND", "Card is not present in player's hand.");
  }

  const leadCard = state.currentTrick[0]?.card ?? null;
  const leadSuit = leadCard?.suit ?? null;

  if (
    state.phase === "play_before_trump" &&
    state.currentTrick.length === 0 &&
    state.bidderSeat === seat &&
    state.trumpSuit !== null &&
    card.suit === state.trumpSuit
  ) {
    const hasNonTrump = hand.some((h) => h.suit !== state.trumpSuit);
    if (hasNonTrump) {
      return invalid(
        state,
        "BIDDER_TRUMP_LEAD_RESTRICTED",
        "Bidder cannot lead trump before reveal while holding non-trump cards."
      );
    }
  }

  if (leadSuit) {
    const legalBySuit = legalCardsForLeadSuit(hand, leadSuit);
    const canFollow = legalBySuit.some((c) => c.suit === leadSuit);

    if (canFollow && card.suit !== leadSuit) {
      return invalid(state, "MUST_FOLLOW_SUIT", "Player must follow lead suit.");
    }

    if (!canFollow && state.phase === "play_after_trump" && state.options.overtrumpRequired) {
      const overtrumpErr = validateOvertrumpConstraint(state, hand, card);
      if (overtrumpErr) {
        return invalid(state, overtrumpErr.code, overtrumpErr.message);
      }
    }
  }

  const nextTrick = [...state.currentTrick, { seat, card }];
  const nextHands = {
    ...state.hands,
    [seat]: removeCardFromHand(hand, card)
  };

  if (nextTrick.length < 4) {
    return {
      ok: true,
      state: {
        ...state,
        hands: nextHands,
        currentTrick: nextTrick,
        currentTurnSeat: nextSeat(seat)
      }
    };
  }

  const winnerSeat = resolveTrickWinner(nextTrick, state.phase, state.trumpSuit);

  return {
    ok: true,
    state: {
      ...state,
      hands: nextHands,
      currentTrick: [],
      completedTricks: [...state.completedTricks, { winnerSeat, cards: nextTrick }],
      currentTurnSeat: winnerSeat
    }
  };
}

function resolveTrickWinner(
  trick: Array<{ seat: PlayerSeat; card: Card }>,
  phase: RoundState["phase"],
  trumpSuit: RoundState["trumpSuit"]
): PlayerSeat {
  const leadEntry = trick[0];
  if (!leadEntry) {
    throw new Error("Cannot resolve trick winner without cards.");
  }
  const leadSuit = leadEntry.card.suit;

  let candidates = trick.filter((entry) => entry.card.suit === leadSuit);

  if (phase === "play_after_trump" && trumpSuit) {
    const trumps = trick.filter((entry) => entry.card.suit === trumpSuit);
    if (trumps.length > 0) {
      candidates = trumps;
    }
  }

  if (candidates.length === 0) {
    throw new Error("Cannot resolve trick winner without candidates.");
  }

  const firstCandidate = candidates[0];
  if (!firstCandidate) {
    throw new Error("Cannot resolve trick winner without first candidate.");
  }

  let winner = firstCandidate;
  for (let i = 1; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    if (!candidate) {
      continue;
    }
    if (compareRanks(candidate.card.rank, winner.card.rank) > 0) {
      winner = candidate;
    }
  }

  return winner.seat;
}

function validateOvertrumpConstraint(
  state: RoundState,
  hand: Card[],
  playedCard: Card
): { code: string; message: string } | null {
  const trumpSuit = state.trumpSuit;
  if (!trumpSuit || state.currentTrick.length === 0) {
    return null;
  }

  const leadEntry = state.currentTrick[0];
  if (!leadEntry) {
    return null;
  }

  const leadSuit = leadEntry.card.suit;
  if (hasSuit(hand, leadSuit)) {
    return null;
  }

  const trumpsInTrick = state.currentTrick.filter((entry) => entry.card.suit === trumpSuit);
  if (trumpsInTrick.length === 0) {
    return null;
  }

  const firstTrump = trumpsInTrick[0];
  if (!firstTrump) {
    return null;
  }

  let currentHighestTrump = firstTrump.card;
  for (let i = 1; i < trumpsInTrick.length; i += 1) {
    const trumpEntry = trumpsInTrick[i];
    if (!trumpEntry) {
      continue;
    }
    if (compareRanks(trumpEntry.card.rank, currentHighestTrump.rank) > 0) {
      currentHighestTrump = trumpEntry.card;
    }
  }

  const higherTrumpInHand = hand.some(
    (card) => card.suit === trumpSuit && compareRanks(card.rank, currentHighestTrump.rank) > 0
  );

  if (higherTrumpInHand && playedCard.suit !== trumpSuit) {
    return {
      code: "MUST_OVERTRUMP",
      message: "Player must overtrump when possible."
    };
  }

  if (
    higherTrumpInHand &&
    playedCard.suit === trumpSuit &&
    compareRanks(playedCard.rank, currentHighestTrump.rank) <= 0
  ) {
    return {
      code: "LOWER_TRUMP_NOT_ALLOWED",
      message: "Cannot play lower trump when overtrump is possible."
    };
  }

  return null;
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
