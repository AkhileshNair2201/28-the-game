export type LobbyStatus = 'waiting' | 'in_game' | 'closed';

export interface LobbyPlayer {
  userId: string;
  nickname: string;
  seat: number | null;
  ready: boolean;
  joinedAt: string;
}

export interface LobbyRecord {
  lobbyId: string;
  roomCode: string;
  ownerUserId: string;
  status: LobbyStatus;
  version: number;
  players: LobbyPlayer[];
  createdAt: string;
  updatedAt: string;
}

export interface LobbyView {
  lobbyId: string;
  roomCode: string;
  ownerUserId: string;
  status: LobbyStatus;
  version: number;
  players: LobbyPlayer[];
  createdAt: string;
  updatedAt: string;
}
