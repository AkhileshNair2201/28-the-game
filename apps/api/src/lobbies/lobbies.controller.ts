import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards
} from '@nestjs/common';
import { CurrentUserId } from '../common/current-user-id.decorator';
import { AuthGuard } from '../common/auth.guard';
import { LobbiesService } from './lobbies.service';
import { StructuredLoggerService } from '../common/structured-logger.service';

@Controller('lobbies')
@UseGuards(AuthGuard)
export class LobbiesController {
  constructor(
    @Inject(LobbiesService) private readonly lobbiesService: LobbiesService,
    @Inject(StructuredLoggerService) private readonly logger: StructuredLoggerService
  ) {}

  @Patch(':roomCode/ready')
  setReady(@Param('roomCode') roomCode: string, @CurrentUserId() userId: string, @Body() body: { ready?: boolean }) {
    if (typeof body?.ready !== 'boolean') {
      throw new BadRequestException('`ready` boolean is required.');
    }

    const lobby = this.lobbiesService.setReady(roomCode, userId, body.ready);
    this.logger.info('lobby.ready_updated', {
      roomCode,
      userId,
      ready: body.ready,
      version: lobby.version
    });

    return lobby;
  }

  @Post()
  createLobby(@CurrentUserId() userId: string) {
    const lobby = this.lobbiesService.createLobby(userId);
    this.logger.info('lobby.created', { roomCode: lobby.roomCode, userId, lobbyId: lobby.lobbyId });
    return lobby;
  }

  @Post(':roomCode/join')
  joinLobby(@Param('roomCode') roomCode: string, @CurrentUserId() userId: string) {
    const lobby = this.lobbiesService.joinLobby(roomCode, userId);
    this.logger.info('lobby.joined', {
      roomCode,
      userId,
      players: lobby.players.length,
      version: lobby.version
    });
    return lobby;
  }

  @Get(':roomCode')
  getLobby(@Param('roomCode') roomCode: string) {
    return this.lobbiesService.getLobby(roomCode);
  }

  @Delete(':roomCode')
  deleteLobby(@Param('roomCode') roomCode: string, @CurrentUserId() userId: string) {
    this.lobbiesService.deleteLobby(roomCode, userId);
    this.logger.info('lobby.deleted', { roomCode, userId });

    return {
      deleted: true,
      roomCode
    };
  }
}
