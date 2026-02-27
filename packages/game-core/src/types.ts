export type Suit = 'S' | 'H' | 'D' | 'C';
export type Rank = '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
export type Seat = 0 | 1 | 2 | 3;
export type Team = 'A' | 'B';

export type RoundPhase =
  | 'auction'
  | 'choose_trump'
  | 'play_before_trump'
  | 'play_after_trump'
  | 'round_end';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
}

export interface TrickPlay {
  seat: Seat;
  card: Card;
}

export interface CompletedTrick {
  leaderSeat: Seat;
  cards: TrickPlay[];
  winnerSeat: Seat;
  winnerTeam: Team;
  points: number;
  phase: 'play_before_trump' | 'play_after_trump';
}

export interface BidState {
  highestBid: number | null;
  highestBidder: Seat | null;
  passCountSinceLastBid: number;
}

export interface RoundScore {
  A: number;
  B: number;
}

export interface PairState {
  declaredByTeam: Team | null;
}

export interface RoundState {
  dealerSeat: Seat;
  currentTurnSeat: Seat;
  phase: RoundPhase;

  deck: Card[];
  drawIndex: number;
  hands: Record<Seat, Card[]>;

  bid: BidState;
  bidValue: number | null;
  bidderSeat: Seat | null;
  bidderTeam: Team | null;
  effectiveTarget: number | null;

  trumpSuit: Suit | null;
  trumpRevealed: boolean;
  hiddenTrumpCard: Card | null;

  currentTrick: TrickPlay[];
  trickLeaderSeat: Seat | null;
  completedTricks: CompletedTrick[];
  tricksWon: RoundScore;
  cardPointsWon: RoundScore;
  tricksWonAfterReveal: RoundScore;

  mustTrumpSeat: Seat | null;
  pair: PairState;

  matchScore: RoundScore;
  roundWinnerTeam: Team | null;
  roundBidSucceeded: boolean | null;
}

export interface GameCoreVersion {
  major: number;
  minor: number;
}

export interface LegalBidsResult {
  values: number[];
  canPass: boolean;
}
