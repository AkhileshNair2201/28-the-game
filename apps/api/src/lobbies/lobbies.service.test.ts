import { describe, expect, it } from 'vitest';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { LobbiesService } from './lobbies.service';
import { UsersService } from '../users/users.service';
import { LobbyEventsService } from './lobby-events.service';

function createUsersAndLobbyService() {
  const usersService = new UsersService();
  const lobbyEventsService = new LobbyEventsService();
  const lobbiesService = new LobbiesService(usersService, lobbyEventsService);

  return { usersService, lobbiesService };
}

describe('LobbiesService', () => {
  it('creates lobby with owner as first player', () => {
    const { usersService, lobbiesService } = createUsersAndLobbyService();
    const owner = usersService.createGuest('OwnerOne');

    const lobby = lobbiesService.createLobby(owner.userId);

    expect(lobby.roomCode).toHaveLength(6);
    expect(lobby.ownerUserId).toBe(owner.userId);
    expect(lobby.players).toHaveLength(1);
    expect(lobby.players[0]?.nickname).toBe('OwnerOne');
  });

  it('joins lobby and enforces max 4 players', () => {
    const { usersService, lobbiesService } = createUsersAndLobbyService();
    const owner = usersService.createGuest('OwnerOne');
    const lobby = lobbiesService.createLobby(owner.userId);

    const p2 = usersService.createGuest('Player02');
    const p3 = usersService.createGuest('Player03');
    const p4 = usersService.createGuest('Player04');
    const p5 = usersService.createGuest('Player05');

    lobbiesService.joinLobby(lobby.roomCode, p2.userId);
    lobbiesService.joinLobby(lobby.roomCode, p3.userId);
    lobbiesService.joinLobby(lobby.roomCode, p4.userId);

    expect(() => lobbiesService.joinLobby(lobby.roomCode, p5.userId)).toThrow(ConflictException);
  });

  it('allows only owner to delete lobby', () => {
    const { usersService, lobbiesService } = createUsersAndLobbyService();
    const owner = usersService.createGuest('OwnerOne');
    const other = usersService.createGuest('Player02');
    const lobby = lobbiesService.createLobby(owner.userId);

    expect(() => lobbiesService.deleteLobby(lobby.roomCode, other.userId)).toThrow(ForbiddenException);

    lobbiesService.deleteLobby(lobby.roomCode, owner.userId);

    expect(() => lobbiesService.getLobby(lobby.roomCode)).toThrow();
  });

  it('updates ready state and bumps version', () => {
    const { usersService, lobbiesService } = createUsersAndLobbyService();
    const owner = usersService.createGuest('OwnerOne');
    const lobby = lobbiesService.createLobby(owner.userId);

    const updated = lobbiesService.setReady(lobby.roomCode, owner.userId, true);

    expect(updated.version).toBeGreaterThan(lobby.version);
    expect(updated.players.find((player) => player.userId === owner.userId)?.ready).toBe(true);
  });
});
