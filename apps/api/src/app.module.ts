import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './auth/auth.controller';
import { AuthTokenService } from './auth/auth-token.service';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';
import { AuthGuard } from './common/auth.guard';

@Module({
  imports: [],
  controllers: [AppController, AuthController, UsersController],
  providers: [AppService, AuthTokenService, UsersService, AuthGuard]
})
export class AppModule {}
