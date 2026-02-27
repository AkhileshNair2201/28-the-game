import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  UseGuards
} from '@nestjs/common';
import { AuthGuard } from '../common/auth.guard';
import { CurrentUserId } from '../common/current-user-id.decorator';
import { MatchIntent } from './matches.types';
import { MatchesService } from './matches.service';
import { StructuredLoggerService } from '../common/structured-logger.service';
import { ObservabilityService } from '../observability/observability.service';

@Controller('matches')
@UseGuards(AuthGuard)
export class MatchesController {
  constructor(
    @Inject(MatchesService) private readonly matchesService: MatchesService,
    @Inject(StructuredLoggerService) private readonly logger: StructuredLoggerService,
    @Inject(ObservabilityService) private readonly observabilityService: ObservabilityService
  ) {}

  @Post('start')
  startMatch(@CurrentUserId() actorUserId: string, @Body() body: { roomCode?: string }) {
    if (!body?.roomCode) {
      throw new BadRequestException('roomCode is required');
    }

    const state = this.matchesService.startMatch(body.roomCode, actorUserId);
    this.logger.info('match.started', {
      roomCode: body.roomCode,
      matchId: state.matchId,
      userId: actorUserId,
      version: state.version
    });

    return state;
  }

  @Get(':matchId/state')
  getState(@Param('matchId') matchId: string, @CurrentUserId() actorUserId: string) {
    return this.matchesService.getProjectedState(matchId, actorUserId);
  }

  @Get('room/:roomCode/state')
  getStateByRoom(@Param('roomCode') roomCode: string, @CurrentUserId() actorUserId: string) {
    return this.matchesService.getProjectedStateByRoom(roomCode, actorUserId);
  }

  @Post(':matchId/intents')
  applyIntent(
    @Param('matchId') matchId: string,
    @CurrentUserId() actorUserId: string,
    @Body() body: MatchIntent
  ) {
    const start = performance.now();
    this.observabilityService.recordActionReceived();

    try {
      const result = this.matchesService.applyIntent(matchId, actorUserId, body);
      this.logger.info('match.intent_accepted', {
        matchId,
        userId: actorUserId,
        requestId: body.request_id,
        type: body.type,
        version: result.version
      });
      return result;
    } catch (error) {
      this.observabilityService.recordInvalidAction();
      this.logger.warn('match.intent_rejected', {
        matchId,
        userId: actorUserId,
        requestId: body.request_id,
        type: body.type,
        reason: error instanceof Error ? error.message : 'unknown'
      });
      throw error;
    } finally {
      this.observabilityService.recordActionLatency(performance.now() - start);
    }
  }
}
