import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  chooseTrump,
  createRoundState,
  declarePair,
  passBid,
  placeBid,
  playCard,
  requestTrumpReveal,
  seatToTeam,
  type RoundState,
  type Seat
} from '@twentyeight/game-core';
import { randomUUID } from 'node:crypto';
import { LobbiesService } from '../lobbies/lobbies.service';
import { MatchEventsService } from './match-events.service';
import {
  MatchActionRecord,
  MatchIntent,
  MatchIntentResult,
  MatchPlayer,
  MatchRecord,
  ProjectedMatchState
} from './matches.types';

@Injectable()
export class MatchesService {
  private readonly matchesById = new Map<string, MatchRecord>();

  constructor(
    @Inject(LobbiesService) private readonly lobbiesService: LobbiesService,
    @Inject(MatchEventsService) private readonly matchEventsService: MatchEventsService
  ) {}

  startMatch(roomCode: string, actorUserId: string): ProjectedMatchState {
    const lobby = this.lobbiesService.getLobby(roomCode);

    if (lobby.ownerUserId !== actorUserId) {
      throw new ForbiddenException('Only lobby owner can start match.');
    }

    if (lobby.status !== 'waiting') {
      throw new ConflictException('Lobby is not in waiting status.');
    }

    if (lobby.players.length !== 4) {
      throw new ConflictException('Match requires exactly 4 players.');
    }

    const notReady = lobby.players.find((player) => !player.ready);
    if (notReady) {
      throw new ConflictException('All players must be ready before starting match.');
    }

    this.lobbiesService.setStatus(roomCode, actorUserId, 'in_game');

    const players = lobby.players
      .map((player) => {
        if (player.seat === null) {
          throw new ConflictException('Every lobby player must have a seat.');
        }

        return {
          userId: player.userId,
          nickname: player.nickname,
          seat: player.seat as Seat,
          team: seatToTeam(player.seat as Seat)
        };
      })
      .sort((a, b) => a.seat - b.seat) as MatchPlayer[];

    const matchId = randomUUID();
    const roundState = createRoundState({
      dealerSeat: 0,
      seed: `${roomCode}:${matchId}:round:1`
    });

    const now = new Date().toISOString();
    const record: MatchRecord = {
      matchId,
      roomCode,
      status: 'active',
      version: 1,
      players,
      roundState,
      actionLog: [],
      processedRequests: new Map<string, MatchIntentResult>(),
      createdAt: now,
      updatedAt: now
    };

    this.matchesById.set(matchId, record);

    const projection = this.projectForUser(record, actorUserId);

    this.matchEventsService.emit({
      type: 'match_state_delta',
      matchId,
      roomCode,
      version: record.version,
      at: now
    });

    return projection;
  }

  getProjectedState(matchId: string, actorUserId: string): ProjectedMatchState {
    const match = this.getMatchRecord(matchId);
    this.assertPlayerInMatch(match, actorUserId);
    return this.projectForUser(match, actorUserId);
  }

  getProjectedStateByRoom(roomCode: string, actorUserId: string): ProjectedMatchState {
    const match = [...this.matchesById.values()].find(
      (entry) => entry.roomCode === roomCode && entry.players.some((player) => player.userId === actorUserId)
    );

    if (!match) {
      throw new NotFoundException('Active match not found for room.');
    }

    return this.projectForUser(match, actorUserId);
  }

  applyIntent(matchId: string, actorUserId: string, intent: MatchIntent): MatchIntentResult {
    const match = this.getMatchRecord(matchId);
    this.assertPlayerInMatch(match, actorUserId);

    if (!intent.request_id?.trim()) {
      throw new BadRequestException('request_id is required.');
    }

    const idempotencyKey = `${actorUserId}:${intent.request_id}`;
    const existing = match.processedRequests.get(idempotencyKey);
    if (existing) {
      return existing;
    }

    if (intent.expected_version !== match.version) {
      throw new ConflictException(`Version conflict: expected ${match.version}, got ${intent.expected_version}.`);
    }

    const player = match.players.find((entry) => entry.userId === actorUserId);
    if (!player) {
      throw new ForbiddenException('Actor is not a match player.');
    }

    const fromVersion = match.version;
    match.roundState = this.applyRoundTransition(match.roundState, player.seat, intent);
    match.version += 1;
    match.updatedAt = new Date().toISOString();

    const actionRecord: MatchActionRecord = {
      seq: match.actionLog.length + 1,
      actorId: actorUserId,
      requestId: intent.request_id,
      type: intent.type,
      payload: intent.payload,
      acceptedAt: match.updatedAt,
      fromVersion,
      toVersion: match.version
    };

    match.actionLog.push(actionRecord);

    const result: MatchIntentResult = {
      accepted: true,
      matchId,
      version: match.version,
      state: this.projectForUser(match, actorUserId)
    };

    match.processedRequests.set(idempotencyKey, result);

    this.matchEventsService.emit({
      type: 'match_action_applied',
      matchId,
      roomCode: match.roomCode,
      version: match.version,
      actorId: actorUserId,
      intentType: intent.type,
      at: match.updatedAt
    });

    this.matchEventsService.emit({
      type: 'match_state_delta',
      matchId,
      roomCode: match.roomCode,
      version: match.version,
      actorId: actorUserId,
      intentType: intent.type,
      at: match.updatedAt
    });

    if (match.roundState.phase === 'round_end') {
      this.matchEventsService.emit({
        type: 'match_resolved',
        matchId,
        roomCode: match.roomCode,
        version: match.version,
        at: match.updatedAt
      });
    }

    return result;
  }

  isPlayerInMatch(matchId: string, userId: string): boolean {
    const match = this.matchesById.get(matchId);
    if (!match) {
      return false;
    }

    return match.players.some((entry) => entry.userId === userId);
  }

  private applyRoundTransition(state: RoundState, actorSeat: Seat, intent: MatchIntent): RoundState {
    switch (intent.type) {
      case 'place_bid': {
        const bidValue = intent.payload.bid_value;
        if (typeof bidValue !== 'number') {
          throw new BadRequestException('payload.bid_value number is required for place_bid.');
        }

        return placeBid(state, actorSeat, bidValue);
      }

      case 'pass_bid':
        return passBid(state, actorSeat);

      case 'choose_trump': {
        const suit = intent.payload.suit;
        const hiddenCardId = intent.payload.hidden_card_id;

        if (!suit || !hiddenCardId) {
          throw new BadRequestException('payload.suit and payload.hidden_card_id are required.');
        }

        return chooseTrump(state, actorSeat, suit, hiddenCardId);
      }

      case 'play_card': {
        const cardId = intent.payload.card_id;
        if (!cardId) {
          throw new BadRequestException('payload.card_id is required for play_card.');
        }

        return playCard(state, actorSeat, cardId);
      }

      case 'request_trump_reveal':
        return requestTrumpReveal(state, actorSeat);

      case 'declare_pair':
        return declarePair(state, actorSeat);

      default:
        throw new BadRequestException(`Unsupported intent type: ${(intent as { type: string }).type}`);
    }
  }

  private projectForUser(match: MatchRecord, viewerUserId: string): ProjectedMatchState {
    const viewer = match.players.find((player) => player.userId === viewerUserId);
    if (!viewer) {
      throw new ForbiddenException('Viewer is not part of this match.');
    }

    const projectedHands: ProjectedMatchState['roundState']['hands'] = {
      0: { visibleCards: [], hiddenCount: 0 },
      1: { visibleCards: [], hiddenCount: 0 },
      2: { visibleCards: [], hiddenCount: 0 },
      3: { visibleCards: [], hiddenCount: 0 }
    };

    for (const seat of [0, 1, 2, 3] as Seat[]) {
      const cards = match.roundState.hands[seat];

      if (seat === viewer.seat) {
        projectedHands[seat] = {
          visibleCards: cards.map((card) => ({ ...card })),
          hiddenCount: 0
        };
      } else {
        projectedHands[seat] = {
          visibleCards: [],
          hiddenCount: cards.length
        };
      }
    }

    return {
      matchId: match.matchId,
      roomCode: match.roomCode,
      status: match.status,
      version: match.version,
      viewerUserId,
      players: match.players.map((player) => ({ ...player })),
      roundState: {
        dealerSeat: match.roundState.dealerSeat,
        currentTurnSeat: match.roundState.currentTurnSeat,
        phase: match.roundState.phase,
        bidValue: match.roundState.bidValue,
        bidderSeat: match.roundState.bidderSeat,
        bidderTeam: match.roundState.bidderTeam,
        effectiveTarget: match.roundState.effectiveTarget,
        trumpSuit: match.roundState.trumpRevealed ? match.roundState.trumpSuit : null,
        trumpRevealed: match.roundState.trumpRevealed,
        currentTrick: match.roundState.currentTrick.map((entry) => ({
          seat: entry.seat,
          card: { ...entry.card }
        })),
        completedTricksCount: match.roundState.completedTricks.length,
        tricksWon: { ...match.roundState.tricksWon },
        cardPointsWon: { ...match.roundState.cardPointsWon },
        roundBidSucceeded: match.roundState.roundBidSucceeded,
        roundWinnerTeam: match.roundState.roundWinnerTeam,
        matchScore: { ...match.roundState.matchScore },
        hands: projectedHands
      }
    };
  }

  private getMatchRecord(matchId: string): MatchRecord {
    const match = this.matchesById.get(matchId);

    if (!match) {
      throw new NotFoundException('Match not found.');
    }

    return match;
  }

  private assertPlayerInMatch(match: MatchRecord, userId: string): void {
    const hasPlayer = match.players.some((entry) => entry.userId === userId);

    if (!hasPlayer) {
      throw new ForbiddenException('User is not part of this match.');
    }
  }
}
