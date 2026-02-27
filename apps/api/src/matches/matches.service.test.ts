import { describe, expect, it } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { LobbyEventsService } from '../lobbies/lobby-events.service';
import { LobbiesService } from '../lobbies/lobbies.service';
import { MatchEventsService } from './match-events.service';
import { MatchesService } from './matches.service';

function setupServices() {
  const usersService = new UsersService();
  const lobbyEvents = new LobbyEventsService();
  const lobbiesService = new LobbiesService(usersService, lobbyEvents);
  const matchEvents = new MatchEventsService();
  const matchesService = new MatchesService(lobbiesService, matchEvents);

  return { usersService, lobbiesService, matchesService };
}

describe('MatchesService', () => {
  it('starts match from ready 4-player lobby with projected state', () => {
    const { usersService, lobbiesService, matchesService } = setupServices();

    const owner = usersService.createGuest('Owner01');
    const p2 = usersService.createGuest('Player02');
    const p3 = usersService.createGuest('Player03');
    const p4 = usersService.createGuest('Player04');

    const lobby = lobbiesService.createLobby(owner.userId);
    lobbiesService.joinLobby(lobby.roomCode, p2.userId);
    lobbiesService.joinLobby(lobby.roomCode, p3.userId);
    lobbiesService.joinLobby(lobby.roomCode, p4.userId);

    lobbiesService.setReady(lobby.roomCode, owner.userId, true);
    lobbiesService.setReady(lobby.roomCode, p2.userId, true);
    lobbiesService.setReady(lobby.roomCode, p3.userId, true);
    lobbiesService.setReady(lobby.roomCode, p4.userId, true);

    const projected = matchesService.startMatch(lobby.roomCode, owner.userId);

    expect(projected.players).toHaveLength(4);
    expect(projected.roundState.phase).toBe('auction');

    const ownerSeat = projected.players.find((entry) => entry.userId === owner.userId)?.seat;
    if (ownerSeat === undefined) {
      throw new Error('Owner seat not found in projection');
    }

    for (const seat of [0, 1, 2, 3] as const) {
      const hand = projected.roundState.hands[seat];

      if (seat === ownerSeat) {
        expect(hand.visibleCards.length).toBe(4);
        expect(hand.hiddenCount).toBe(0);
      } else {
        expect(hand.visibleCards.length).toBe(0);
        expect(hand.hiddenCount).toBe(4);
      }
    }
  });

  it('enforces idempotency by request_id and actor', () => {
    const { usersService, lobbiesService, matchesService } = setupServices();

    const owner = usersService.createGuest('Owner01');
    const p2 = usersService.createGuest('Player02');
    const p3 = usersService.createGuest('Player03');
    const p4 = usersService.createGuest('Player04');

    const lobby = lobbiesService.createLobby(owner.userId);
    lobbiesService.joinLobby(lobby.roomCode, p2.userId);
    lobbiesService.joinLobby(lobby.roomCode, p3.userId);
    lobbiesService.joinLobby(lobby.roomCode, p4.userId);

    lobbiesService.setReady(lobby.roomCode, owner.userId, true);
    lobbiesService.setReady(lobby.roomCode, p2.userId, true);
    lobbiesService.setReady(lobby.roomCode, p3.userId, true);
    lobbiesService.setReady(lobby.roomCode, p4.userId, true);

    const projected = matchesService.startMatch(lobby.roomCode, owner.userId);

    const currentSeat = projected.roundState.currentTurnSeat;
    const currentPlayer = projected.players.find((entry) => entry.seat === currentSeat);
    if (!currentPlayer) {
      throw new Error('Current turn player not found.');
    }

    const r1 = matchesService.applyIntent(projected.matchId, currentPlayer.userId, {
      request_id: 'req-1',
      expected_version: projected.version,
      type: 'place_bid',
      payload: {
        bid_value: 14
      }
    });

    const r2 = matchesService.applyIntent(projected.matchId, currentPlayer.userId, {
      request_id: 'req-1',
      expected_version: projected.version,
      type: 'place_bid',
      payload: {
        bid_value: 14
      }
    });

    expect(r2.version).toBe(r1.version);
    expect(r2.state.version).toBe(r1.state.version);
  });

  it('rejects version mismatch', () => {
    const { usersService, lobbiesService, matchesService } = setupServices();

    const owner = usersService.createGuest('Owner01');
    const p2 = usersService.createGuest('Player02');
    const p3 = usersService.createGuest('Player03');
    const p4 = usersService.createGuest('Player04');

    const lobby = lobbiesService.createLobby(owner.userId);
    lobbiesService.joinLobby(lobby.roomCode, p2.userId);
    lobbiesService.joinLobby(lobby.roomCode, p3.userId);
    lobbiesService.joinLobby(lobby.roomCode, p4.userId);

    lobbiesService.setReady(lobby.roomCode, owner.userId, true);
    lobbiesService.setReady(lobby.roomCode, p2.userId, true);
    lobbiesService.setReady(lobby.roomCode, p3.userId, true);
    lobbiesService.setReady(lobby.roomCode, p4.userId, true);

    const projected = matchesService.startMatch(lobby.roomCode, owner.userId);

    expect(() =>
      matchesService.applyIntent(projected.matchId, owner.userId, {
        request_id: 'req-2',
        expected_version: projected.version + 1,
        type: 'place_bid',
        payload: {
          bid_value: 14
        }
      })
    ).toThrow(ConflictException);
  });
});
