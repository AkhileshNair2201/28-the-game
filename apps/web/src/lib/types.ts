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
