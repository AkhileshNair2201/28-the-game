import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './auth/auth.controller';
import { AuthTokenService } from './auth/auth-token.service';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';
import { AuthGuard } from './common/auth.guard';
import { LobbiesController } from './lobbies/lobbies.controller';
import { LobbiesService } from './lobbies/lobbies.service';

@Module({
  imports: [],
  controllers: [AppController, AuthController, UsersController, LobbiesController],
  providers: [AppService, AuthTokenService, UsersService, AuthGuard, LobbiesService]
})
export class AppModule {}
