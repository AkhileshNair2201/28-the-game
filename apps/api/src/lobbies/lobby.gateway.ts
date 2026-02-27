import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  UnauthorizedException
} from '@nestjs/common';
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
import { AuthTokenService } from '../auth/auth-token.service';
import { LobbiesService } from './lobbies.service';
import { LobbyEventsService } from './lobby-events.service';
import { LobbyDomainEvent } from './lobby-events.types';
import { ObservabilityService } from '../observability/observability.service';

const HEARTBEAT_TIMEOUT_MS = 30_000;
const HEARTBEAT_SWEEP_MS = 10_000;

interface SocketSessionData {
  userId: string;
}

interface SocketLobbyContext {
  roomCode: string;
  userId: string;
  lastSeen: number;
}

@WebSocketGateway({
  namespace: '/lobby',
  cors: {
    origin: true,
    credentials: true
  }
})
@Injectable()
export class LobbyGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy {
  @WebSocketServer()
  server!: Server;

  private readonly socketContexts = new Map<string, SocketLobbyContext>();
  private readonly roomUserSockets = new Map<string, Map<string, Set<string>>>();
  private unsubscribeDomainEvents: (() => void) | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(
    @Inject(AuthTokenService) private readonly authTokenService: AuthTokenService,
    @Inject(LobbiesService) private readonly lobbiesService: LobbiesService,
    @Inject(LobbyEventsService) private readonly lobbyEventsService: LobbyEventsService,
    @Inject(ObservabilityService) private readonly observabilityService: ObservabilityService
  ) {}

  onModuleInit(): void {
    this.unsubscribeDomainEvents = this.lobbyEventsService.subscribe((event) => {
      this.forwardDomainEvent(event);
    });

    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();

      for (const [socketId, context] of this.socketContexts.entries()) {
        if (now - context.lastSeen <= HEARTBEAT_TIMEOUT_MS) {
          continue;
        }

        const socket = this.server.sockets.sockets.get(socketId);
        if (socket) {
          socket.disconnect(true);
          continue;
        }

        this.cleanupSocketContext(socketId);
      }
    }, HEARTBEAT_SWEEP_MS);
  }

  onModuleDestroy(): void {
    if (this.unsubscribeDomainEvents) {
      this.unsubscribeDomainEvents();
      this.unsubscribeDomainEvents = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  handleConnection(client: Socket): void {
    const token = this.extractToken(client);
    const auth = this.authTokenService.verifyToken(token);
    this.observabilityService.trackSocketConnected('lobby', auth.userId);
    client.data = {
      ...(client.data ?? {}),
      userId: auth.userId
    } as SocketSessionData;
  }

  handleDisconnect(client: Socket): void {
    const data = client.data as SocketSessionData | undefined;
    if (data?.userId) {
      this.observabilityService.trackSocketDisconnected('lobby', data.userId);
    }
    this.cleanupSocketContext(client.id);
  }

  @SubscribeMessage('lobby_subscribe')
  onSubscribe(@ConnectedSocket() client: Socket, @MessageBody() payload: { roomCode?: string }): void {
    const userId = this.getUserId(client);
    const roomCode = payload?.roomCode?.trim();

    if (!roomCode) {
      throw new UnauthorizedException('Room code is required for subscription.');
    }

    if (!this.lobbiesService.isPlayerInLobby(roomCode, userId)) {
      throw new UnauthorizedException('User is not a member of this lobby.');
    }

    const roomName = this.getRoomName(roomCode);
    client.join(roomName);

    this.socketContexts.set(client.id, {
      roomCode,
      userId,
      lastSeen: Date.now()
    });

    const usersMap = this.roomUserSockets.get(roomCode) ?? new Map<string, Set<string>>();
    const socketIds = usersMap.get(userId) ?? new Set<string>();
    socketIds.add(client.id);
    usersMap.set(userId, socketIds);
    this.roomUserSockets.set(roomCode, usersMap);

    const lobby = this.lobbiesService.getLobby(roomCode);
    this.server.to(client.id).emit('lobby_snapshot', { roomCode, lobby });
  }

  @SubscribeMessage('presence_ping')
  onPresencePing(@ConnectedSocket() client: Socket): void {
    const context = this.socketContexts.get(client.id);

    if (!context) {
      return;
    }

    context.lastSeen = Date.now();
    this.socketContexts.set(client.id, context);

    this.server.to(client.id).emit('presence_pong', {
      roomCode: context.roomCode,
      ts: context.lastSeen
    });
  }

  private forwardDomainEvent(event: LobbyDomainEvent): void {
    const roomName = this.getRoomName(event.roomCode);
    this.server.to(roomName).emit(event.type, event);
  }

  private cleanupSocketContext(socketId: string): void {
    const context = this.socketContexts.get(socketId);

    if (!context) {
      return;
    }

    this.socketContexts.delete(socketId);

    const usersMap = this.roomUserSockets.get(context.roomCode);
    if (!usersMap) {
      return;
    }

    const socketIds = usersMap.get(context.userId);
    if (!socketIds) {
      return;
    }

    socketIds.delete(socketId);

    if (socketIds.size === 0) {
      usersMap.delete(context.userId);

      this.server.to(this.getRoomName(context.roomCode)).emit('player_left', {
        roomCode: context.roomCode,
        userId: context.userId,
        disconnectedAt: new Date().toISOString()
      });
    } else {
      usersMap.set(context.userId, socketIds);
    }

    if (usersMap.size === 0) {
      this.roomUserSockets.delete(context.roomCode);
    } else {
      this.roomUserSockets.set(context.roomCode, usersMap);
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
    const data = client.data as SocketSessionData | undefined;

    if (!data?.userId) {
      throw new UnauthorizedException('Socket is not authenticated.');
    }

    return data.userId;
  }

  private getRoomName(roomCode: string): string {
    return `lobby:${roomCode}`;
  }
}
