import { Card, Rank, Suit } from "./types";

export type PlayerSeat = 0 | 1 | 2 | 3;

export type BidEntry = {
  seat: PlayerSeat;
  value: number;
};

export type RoundPhase = "auction" | "trump_selection" | "play_before_trump" | "play_after_trump" | "round_end";

export type RoundOptions = {
  overtrumpRequired: boolean;
};

export type RoundState = {
  dealerSeat: PlayerSeat;
  currentTurnSeat: PlayerSeat;
  phase: RoundPhase;
  minBid: number;
  maxBid: number;
  highestBid: BidEntry | null;
  bidderSeat: PlayerSeat | null;
  bidValue: number | null;
  auctionPassesInRow: number;
  trumpSuit: Suit | null;
  trumpRevealed: boolean;
  hiddenTrumpCard: { suit: Suit; rank: Rank } | null;
  hands: Record<PlayerSeat, Card[]>;
  currentTrick: Array<{ seat: PlayerSeat; card: Card }>;
  completedTricks: Array<{ winnerSeat: PlayerSeat; cards: Array<{ seat: PlayerSeat; card: Card }> }>;
  options: RoundOptions;
};

export type TransitionError = {
  code: string;
  message: string;
};

export type TransitionResult =
  | {
      ok: true;
      state: RoundState;
    }
  | {
      ok: false;
      error: TransitionError;
      state: RoundState;
    };
