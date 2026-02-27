import { Body, Controller, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common';
import { AuthTokenService } from './auth-token.service';
import { UsersService } from '../users/users.service';

interface GuestAuthBody {
  nickname?: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(UsersService) private readonly usersService: UsersService,
    @Inject(AuthTokenService) private readonly authTokenService: AuthTokenService
  ) {}

  @Post('guest')
  @HttpCode(HttpStatus.CREATED)
  createGuest(@Body() body: GuestAuthBody) {
    const user = this.usersService.createGuest(body?.nickname);
    const token = this.authTokenService.createToken({ userId: user.userId });

    return {
      ...this.usersService.toPublicUser(user),
      token
    };
  }
}
