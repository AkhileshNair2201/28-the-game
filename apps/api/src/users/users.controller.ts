import { BadRequestException, Body, Controller, Get, Inject, Patch, UseGuards } from '@nestjs/common';
import { CurrentUserId } from '../common/current-user-id.decorator';
import { AuthGuard } from '../common/auth.guard';
import { UsersService } from './users.service';

interface UpdateNicknameBody {
  nickname: string;
}

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(@Inject(UsersService) private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUserId() userId: string) {
    const user = this.usersService.getById(userId);
    return this.usersService.toPublicUser(user);
  }

  @Patch('me/nickname')
  updateNickname(@CurrentUserId() userId: string, @Body() body: UpdateNicknameBody) {
    if (!body?.nickname) {
      throw new BadRequestException('Nickname is required.');
    }

    const user = this.usersService.updateNickname(userId, body.nickname);
    return this.usersService.toPublicUser(user);
  }
}
