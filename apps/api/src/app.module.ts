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
import { LobbyEventsService } from './lobbies/lobby-events.service';
import { LobbyGateway } from './lobbies/lobby.gateway';
import { MatchesController } from './matches/matches.controller';
import { MatchesService } from './matches/matches.service';
import { MatchEventsService } from './matches/match-events.service';
import { MatchGateway } from './matches/match.gateway';

@Module({
  imports: [],
  controllers: [AppController, AuthController, UsersController, LobbiesController, MatchesController],
  providers: [
    AppService,
    AuthTokenService,
    UsersService,
    AuthGuard,
    LobbiesService,
    LobbyEventsService,
    LobbyGateway,
    MatchesService,
    MatchEventsService,
    MatchGateway
  ]
})
export class AppModule {}
