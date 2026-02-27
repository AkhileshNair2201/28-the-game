import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import { MatchDomainEvent } from './match-events.types';

const MATCH_EVENT_NAME = 'match_event';

@Injectable()
export class MatchEventsService {
  private readonly emitter = new EventEmitter();

  emit(event: MatchDomainEvent): void {
    this.emitter.emit(MATCH_EVENT_NAME, event);
  }

  subscribe(handler: (event: MatchDomainEvent) => void): () => void {
    this.emitter.on(MATCH_EVENT_NAME, handler);

    return () => {
      this.emitter.off(MATCH_EVENT_NAME, handler);
    };
  }
}
