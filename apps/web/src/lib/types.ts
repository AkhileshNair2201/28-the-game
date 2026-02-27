export interface GuestSession {
  userId: string;
  nickname: string;
  token: string;
  isGuest: boolean;
}

export interface PublicUser {
  userId: string;
  nickname: string;
  isGuest: boolean;
}

export interface LobbyPlayer {
  userId: string;
  nickname: string;
  seat: number | null;
  ready: boolean;
  joinedAt: string;
}

export interface LobbyView {
  lobbyId: string;
  roomCode: string;
  ownerUserId: string;
  status: 'waiting' | 'in_game' | 'closed';
  version: number;
  players: LobbyPlayer[];
  createdAt: string;
  updatedAt: string;
}

export type MatchSuit = 'S' | 'H' | 'D' | 'C';
export type MatchRank = '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
export type MatchSeat = 0 | 1 | 2 | 3;

export interface MatchCard {
  id: string;
  suit: MatchSuit;
  rank: MatchRank;
}

export interface MatchPlayer {
  userId: string;
  nickname: string;
  seat: MatchSeat;
  team: 'A' | 'B';
}

export interface ProjectedMatchState {
  matchId: string;
  roomCode: string;
  status: 'active' | 'ended';
  version: number;
  viewerUserId: string;
  players: MatchPlayer[];
  roundState: {
    dealerSeat: MatchSeat;
    currentTurnSeat: MatchSeat;
    phase: 'auction' | 'choose_trump' | 'play_before_trump' | 'play_after_trump' | 'round_end';
    bidValue: number | null;
    bidderSeat: MatchSeat | null;
    bidderTeam: 'A' | 'B' | null;
    effectiveTarget: number | null;
    trumpSuit: MatchSuit | null;
    trumpRevealed: boolean;
    currentTrick: Array<{ seat: MatchSeat; card: MatchCard }>;
    completedTricksCount: number;
    tricksWon: { A: number; B: number };
    cardPointsWon: { A: number; B: number };
    roundBidSucceeded: boolean | null;
    roundWinnerTeam: 'A' | 'B' | null;
    matchScore: { A: number; B: number };
    hands: Record<MatchSeat, { visibleCards: MatchCard[]; hiddenCount: number }>;
  };
}

export interface MatchIntent {
  request_id: string;
  expected_version: number;
  type: 'place_bid' | 'pass_bid' | 'choose_trump' | 'play_card' | 'request_trump_reveal' | 'declare_pair';
  payload: {
    bid_value?: number;
    suit?: MatchSuit;
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
