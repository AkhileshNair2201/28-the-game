import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, Injectable, OnModuleDestroy, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { AuthTokenService } from '../auth/auth-token.service';
import { MatchEventsService } from './match-events.service';
import { MatchesService } from './matches.service';
import { MatchDomainEvent } from './match-events.types';

interface SocketAuthData {
  userId: string;
}

@WebSocketGateway({
  namespace: '/match',
  cors: {
    origin: true,
    credentials: true
  }
})
@Injectable()
export class MatchGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy {
  @WebSocketServer()
  server!: Server;

  private readonly socketMatchMap = new Map<string, { matchId: string; userId: string }>();
  private unsubscribeEvents: (() => void) | null = null;

  constructor(
    @Inject(AuthTokenService) private readonly authTokenService: AuthTokenService,
    @Inject(MatchesService) private readonly matchesService: MatchesService,
    @Inject(MatchEventsService) private readonly matchEventsService: MatchEventsService
  ) {}

  onModuleInit(): void {
    this.unsubscribeEvents = this.matchEventsService.subscribe((event) => {
      this.forwardEvent(event);
    });
  }

  onModuleDestroy(): void {
    if (this.unsubscribeEvents) {
      this.unsubscribeEvents();
      this.unsubscribeEvents = null;
    }
  }

  handleConnection(client: Socket): void {
    const token = this.extractToken(client);
    const auth = this.authTokenService.verifyToken(token);

    client.data = {
      ...(client.data ?? {}),
      userId: auth.userId
    } as SocketAuthData;
  }

  handleDisconnect(client: Socket): void {
    this.socketMatchMap.delete(client.id);
  }

  @SubscribeMessage('match_subscribe')
  onSubscribe(@ConnectedSocket() client: Socket, @MessageBody() payload: { matchId?: string }): void {
    const userId = this.getUserId(client);
    const matchId = payload?.matchId?.trim();

    if (!matchId) {
      throw new UnauthorizedException('matchId is required.');
    }

    if (!this.matchesService.isPlayerInMatch(matchId, userId)) {
      throw new UnauthorizedException('User is not part of this match.');
    }

    client.join(this.getRoomName(matchId));
    this.socketMatchMap.set(client.id, { matchId, userId });

    const projected = this.matchesService.getProjectedState(matchId, userId);
    this.server.to(client.id).emit('match_state_delta', projected);
  }

  private forwardEvent(event: MatchDomainEvent): void {
    const roomName = this.getRoomName(event.matchId);
    const sockets = this.server.sockets.adapter.rooms.get(roomName);

    if (!sockets || sockets.size === 0) {
      return;
    }

    for (const socketId of sockets) {
      const context = this.socketMatchMap.get(socketId);
      if (!context) {
        continue;
      }

      const projected = this.matchesService.getProjectedState(event.matchId, context.userId);
      this.server.to(socketId).emit(event.type, {
        ...event,
        state: projected
      });
    }
  }

  private extractToken(client: Socket): string {
    const authToken = client.handshake.auth?.token;

    if (typeof authToken === 'string' && authToken.trim()) {
      return authToken;
    }

    const header = client.handshake.headers.authorization;
    if (typeof header !== 'string') {
      throw new UnauthorizedException('Missing websocket token.');
    }

    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid websocket authorization header.');
    }

    return token;
  }

  private getUserId(client: Socket): string {
    const data = client.data as SocketAuthData | undefined;
    if (!data?.userId) {
      throw new UnauthorizedException('Socket user not authenticated.');
    }

    return data.userId;
  }

  private getRoomName(matchId: string): string {
    return `match:${matchId}`;
  }
}
