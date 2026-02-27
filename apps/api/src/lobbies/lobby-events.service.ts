import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import { LobbyDomainEvent } from './lobby-events.types';

const LOBBY_EVENT_NAME = 'lobby_event';

@Injectable()
export class LobbyEventsService {
  private readonly emitter = new EventEmitter();

  emit(event: LobbyDomainEvent): void {
    this.emitter.emit(LOBBY_EVENT_NAME, event);
  }

  subscribe(handler: (event: LobbyDomainEvent) => void): () => void {
    this.emitter.on(LOBBY_EVENT_NAME, handler);

    return () => {
      this.emitter.off(LOBBY_EVENT_NAME, handler);
    };
  }
}
