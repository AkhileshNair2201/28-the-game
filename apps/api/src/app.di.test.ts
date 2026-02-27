import { describe, expect, it } from 'vitest';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AuthController } from './auth/auth.controller';
import { UsersController } from './users/users.controller';
import { LobbiesController } from './lobbies/lobbies.controller';
import { MatchesController } from './matches/matches.controller';
import { ObservabilityController } from './observability/observability.controller';

describe('AppModule DI wiring', () => {
  it('resolves critical controllers and services without undefined injections', async () => {
    const app = await NestFactory.createApplicationContext(AppModule, { logger: false });

    expect(app.get(AuthController)).toBeDefined();
    expect(app.get(UsersController)).toBeDefined();
    expect(app.get(LobbiesController)).toBeDefined();
    expect(app.get(MatchesController)).toBeDefined();
    expect(app.get(ObservabilityController)).toBeDefined();

    await app.close();
  });
});
