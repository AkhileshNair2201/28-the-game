import {
  RoundState,
  Seat,
  Suit,
  Card
} from '@twentyeight/game-core';

export type MatchStatus = 'active' | 'ended';

export interface MatchPlayer {
  userId: string;
  nickname: string;
  seat: Seat;
  team: 'A' | 'B';
}

export interface MatchActionRecord {
  seq: number;
  actorId: string;
  requestId: string;
  type: MatchIntentType;
  payload: Record<string, unknown>;
  acceptedAt: string;
  fromVersion: number;
  toVersion: number;
}

export interface MatchRecord {
  matchId: string;
  roomCode: string;
  status: MatchStatus;
  version: number;
  players: MatchPlayer[];
  roundState: RoundState;
  actionLog: MatchActionRecord[];
  processedRequests: Map<string, MatchIntentResult>;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectedMatchState {
  matchId: string;
  roomCode: string;
  status: MatchStatus;
  version: number;
  viewerUserId: string;
  players: MatchPlayer[];
  roundState: {
    dealerSeat: Seat;
    currentTurnSeat: Seat;
    phase: RoundState['phase'];
    bidValue: number | null;
    bidderSeat: Seat | null;
    bidderTeam: 'A' | 'B' | null;
    effectiveTarget: number | null;
    trumpSuit: Suit | null;
    trumpRevealed: boolean;
    currentTrick: RoundState['currentTrick'];
    completedTricksCount: number;
    tricksWon: RoundState['tricksWon'];
    cardPointsWon: RoundState['cardPointsWon'];
    roundBidSucceeded: boolean | null;
    roundWinnerTeam: 'A' | 'B' | null;
    matchScore: RoundState['matchScore'];
    hands: Record<Seat, { visibleCards: Card[]; hiddenCount: number }>;
  };
}

export type MatchIntentType =
  | 'place_bid'
  | 'pass_bid'
  | 'choose_trump'
  | 'play_card'
  | 'request_trump_reveal'
  | 'declare_pair';

export interface MatchIntent {
  request_id: string;
  expected_version: number;
  type: MatchIntentType;
  payload: {
    bid_value?: number;
    suit?: Suit;
    hidden_card_id?: string;
    card_id?: string;
  };
}

export interface MatchIntentResult {
  accepted: boolean;
  matchId: string;
  version: number;
  state: ProjectedMatchState;
}
