import { Controller, Delete, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUserId } from '../common/current-user-id.decorator';
import { AuthGuard } from '../common/auth.guard';
import { LobbiesService } from './lobbies.service';

@Controller('lobbies')
@UseGuards(AuthGuard)
export class LobbiesController {
  constructor(@Inject(LobbiesService) private readonly lobbiesService: LobbiesService) {}

  @Post()
  createLobby(@CurrentUserId() userId: string) {
    return this.lobbiesService.createLobby(userId);
  }

  @Post(':roomCode/join')
  joinLobby(@Param('roomCode') roomCode: string, @CurrentUserId() userId: string) {
    return this.lobbiesService.joinLobby(roomCode, userId);
  }

  @Get(':roomCode')
  getLobby(@Param('roomCode') roomCode: string) {
    return this.lobbiesService.getLobby(roomCode);
  }

  @Delete(':roomCode')
  deleteLobby(@Param('roomCode') roomCode: string, @CurrentUserId() userId: string) {
    this.lobbiesService.deleteLobby(roomCode, userId);

    return {
      deleted: true,
      roomCode
    };
  }
}
