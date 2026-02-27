import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { UsersService } from '../users/users.service';
import { LobbyRecord, LobbyView } from './lobbies.types';
import { LobbyEventsService } from './lobby-events.service';
import { generateRoomCode } from './room-code';

const MAX_LOBBY_PLAYERS = 4;
const MAX_ROOM_CODE_ATTEMPTS = 20;

@Injectable()
export class LobbiesService {
  private readonly lobbiesByRoomCode = new Map<string, LobbyRecord>();

  constructor(
    @Inject(UsersService) private readonly usersService: UsersService,
    @Inject(LobbyEventsService) private readonly lobbyEventsService: LobbyEventsService
  ) {}

  createLobby(ownerUserId: string): LobbyView {
    const owner = this.usersService.getById(ownerUserId);
    const now = new Date().toISOString();
    const roomCode = this.generateUniqueRoomCode();

    const lobby: LobbyRecord = {
      lobbyId: randomUUID(),
      roomCode,
      ownerUserId,
      status: 'waiting',
      version: 1,
      players: [
        {
          userId: owner.userId,
          nickname: owner.nickname,
          seat: 0,
          ready: false,
          joinedAt: now
        }
      ],
      createdAt: now,
      updatedAt: now
    };

    this.lobbiesByRoomCode.set(roomCode, lobby);
    const view = this.toView(lobby);
    this.emitLobbySnapshot(view);
    return view;
  }

  joinLobby(roomCode: string, userId: string): LobbyView {
    const lobby = this.getLobbyRecord(roomCode);
    const user = this.usersService.getById(userId);

    if (lobby.status !== 'waiting') {
      throw new ConflictException('Lobby is not open for joining.');
    }

    const existingPlayer = lobby.players.find((player) => player.userId === userId);
    if (existingPlayer) {
      return this.toView(lobby);
    }

    const duplicateNickname = lobby.players.find(
      (player) => player.nickname.toLowerCase() === user.nickname.toLowerCase()
    );

    if (duplicateNickname) {
      throw new ConflictException('Nickname already exists in this lobby.');
    }

    if (lobby.players.length >= MAX_LOBBY_PLAYERS) {
      throw new ConflictException('Lobby is full.');
    }

    const seat = this.getNextSeat(lobby);
    lobby.players.push({
      userId: user.userId,
      nickname: user.nickname,
      seat,
      ready: false,
      joinedAt: new Date().toISOString()
    });

    this.bumpLobbyVersion(lobby);

    const view = this.toView(lobby);
    this.lobbyEventsService.emit({
      type: 'player_joined',
      roomCode: lobby.roomCode,
      userId: user.userId,
      lobby: view
    });
    this.emitLobbySnapshot(view);

    return view;
  }

  setReady(roomCode: string, userId: string, ready: boolean): LobbyView {
    const lobby = this.getLobbyRecord(roomCode);
    const player = lobby.players.find((entry) => entry.userId === userId);

    if (!player) {
      throw new ForbiddenException('Only lobby members can toggle ready state.');
    }

    player.ready = ready;
    this.bumpLobbyVersion(lobby);

    const view = this.toView(lobby);
    this.lobbyEventsService.emit({
      type: 'ready_updated',
      roomCode: lobby.roomCode,
      userId,
      ready,
      lobby: view
    });
    this.emitLobbySnapshot(view);

    return view;
  }

  getLobby(roomCode: string): LobbyView {
    const lobby = this.getLobbyRecord(roomCode);
    return this.toView(lobby);
  }

  deleteLobby(roomCode: string, actorUserId: string): void {
    const lobby = this.getLobbyRecord(roomCode);

    if (lobby.ownerUserId !== actorUserId) {
      throw new ForbiddenException('Only lobby owner can delete this lobby.');
    }

    this.lobbiesByRoomCode.delete(roomCode);
    this.lobbyEventsService.emit({
      type: 'lobby_deleted',
      roomCode: lobby.roomCode,
      actorUserId
    });
  }

  isPlayerInLobby(roomCode: string, userId: string): boolean {
    const lobby = this.getLobbyRecord(roomCode);
    return lobby.players.some((player) => player.userId === userId);
  }

  private generateUniqueRoomCode(): string {
    for (let attempt = 0; attempt < MAX_ROOM_CODE_ATTEMPTS; attempt += 1) {
      const roomCode = generateRoomCode(6);

      if (!this.lobbiesByRoomCode.has(roomCode)) {
        return roomCode;
      }
    }

    throw new ConflictException('Failed to allocate unique room code.');
  }

  private getLobbyRecord(roomCode: string): LobbyRecord {
    if (!roomCode || roomCode.length !== 6) {
      throw new BadRequestException('Room code must be exactly 6 characters.');
    }

    const lobby = this.lobbiesByRoomCode.get(roomCode);

    if (!lobby) {
      throw new NotFoundException('Lobby not found.');
    }

    return lobby;
  }

  private getNextSeat(lobby: LobbyRecord): number {
    const occupiedSeats = new Set(lobby.players.map((player) => player.seat).filter((seat) => seat !== null));

    for (let seat = 0; seat < MAX_LOBBY_PLAYERS; seat += 1) {
      if (!occupiedSeats.has(seat)) {
        return seat;
      }
    }

    throw new ConflictException('No seats available in lobby.');
  }

  private toView(lobby: LobbyRecord): LobbyView {
    return {
      lobbyId: lobby.lobbyId,
      roomCode: lobby.roomCode,
      ownerUserId: lobby.ownerUserId,
      status: lobby.status,
      version: lobby.version,
      players: lobby.players.map((player) => ({ ...player })),
      createdAt: lobby.createdAt,
      updatedAt: lobby.updatedAt
    };
  }

  private bumpLobbyVersion(lobby: LobbyRecord): void {
    lobby.version += 1;
    lobby.updatedAt = new Date().toISOString();
  }

  private emitLobbySnapshot(lobby: LobbyView): void {
    this.lobbyEventsService.emit({
      type: 'lobby_snapshot',
      roomCode: lobby.roomCode,
      lobby
    });
  }
}
