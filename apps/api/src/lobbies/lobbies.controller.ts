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

@Controller('lobbies')
@UseGuards(AuthGuard)
export class LobbiesController {
  constructor(@Inject(LobbiesService) private readonly lobbiesService: LobbiesService) {}

  @Patch(':roomCode/ready')
  setReady(@Param('roomCode') roomCode: string, @CurrentUserId() userId: string, @Body() body: { ready?: boolean }) {
    if (typeof body?.ready !== 'boolean') {
      throw new BadRequestException('`ready` boolean is required.');
    }

    return this.lobbiesService.setReady(roomCode, userId, body.ready);
  }

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
