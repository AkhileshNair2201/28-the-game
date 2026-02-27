import { BadRequestException, Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/auth.guard';
import { CurrentUserId } from '../common/current-user-id.decorator';
import { MatchIntent } from './matches.types';
import { MatchesService } from './matches.service';

@Controller('matches')
@UseGuards(AuthGuard)
export class MatchesController {
  constructor(@Inject(MatchesService) private readonly matchesService: MatchesService) {}

  @Post('start')
  startMatch(@CurrentUserId() actorUserId: string, @Body() body: { roomCode?: string }) {
    if (!body?.roomCode) {
      throw new BadRequestException('roomCode is required');
    }

    return this.matchesService.startMatch(body.roomCode, actorUserId);
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
    return this.matchesService.applyIntent(matchId, actorUserId, body);
  }
}
