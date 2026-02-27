import { LobbyView } from './lobbies.types';

export interface LobbySnapshotEvent {
  type: 'lobby_snapshot';
  roomCode: string;
  lobby: LobbyView;
}

export interface PlayerJoinedEvent {
  type: 'player_joined';
  roomCode: string;
  userId: string;
  lobby: LobbyView;
}

export interface ReadyUpdatedEvent {
  type: 'ready_updated';
  roomCode: string;
  userId: string;
  ready: boolean;
  lobby: LobbyView;
}

export interface LobbyDeletedEvent {
  type: 'lobby_deleted';
  roomCode: string;
  actorUserId: string;
}

export type LobbyDomainEvent =
  | LobbySnapshotEvent
  | PlayerJoinedEvent
  | ReadyUpdatedEvent
  | LobbyDeletedEvent;
