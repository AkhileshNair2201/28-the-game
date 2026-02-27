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
import { generateRoomCode } from './room-code';

const MAX_LOBBY_PLAYERS = 4;
const MAX_ROOM_CODE_ATTEMPTS = 20;

@Injectable()
export class LobbiesService {
  private readonly lobbiesByRoomCode = new Map<string, LobbyRecord>();

  constructor(@Inject(UsersService) private readonly usersService: UsersService) {}

  createLobby(ownerUserId: string): LobbyView {
    const owner = this.usersService.getById(ownerUserId);
    const now = new Date().toISOString();
    const roomCode = this.generateUniqueRoomCode();

    const lobby: LobbyRecord = {
      lobbyId: randomUUID(),
      roomCode,
      ownerUserId,
      status: 'waiting',
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
    return this.toView(lobby);
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

    lobby.updatedAt = new Date().toISOString();

    return this.toView(lobby);
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
      players: lobby.players.map((player) => ({ ...player })),
      createdAt: lobby.createdAt,
      updatedAt: lobby.updatedAt
    };
  }
}
