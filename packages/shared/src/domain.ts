export const SUITS = ["hearts", "diamonds", "clubs", "spades"] as const;
export type Suit = (typeof SUITS)[number];

export const RANKS = ["7", "8", "9", "10", "J", "Q", "K", "A"] as const;
export type Rank = (typeof RANKS)[number];

export type Card = {
  suit: Suit;
  rank: Rank;
};

export type PlayerSeat = 0 | 1 | 2 | 3;
export type Team = "A" | "B";

export const ROUND_PHASES = [
  "auction",
  "play_before_trump",
  "play_after_trump",
  "round_end",
  "match_end"
] as const;
export type RoundPhase = (typeof ROUND_PHASES)[number];
