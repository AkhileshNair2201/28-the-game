import { Injectable } from '@nestjs/common';

export interface ObservabilitySnapshot {
  activeLobbies: number;
  websocketConnections: {
    lobby: number;
    match: number;
    total: number;
  };
  actionLatencyMs: {
    p95: number;
    samples: number;
  };
  actionValidation: {
    total: number;
    invalid: number;
    invalidRate: number;
  };
  reconnect: {
    attempts: number;
    success: number;
    successRate: number;
  };
}

const RECONNECT_WINDOW_MS = 60_000;
const LATENCY_SAMPLE_LIMIT = 1000;

@Injectable()
export class ObservabilityService {
  private lobbySocketCount = 0;
  private matchSocketCount = 0;
  private reconnectAttempts = 0;
  private reconnectSuccess = 0;
  private totalActions = 0;
  private invalidActions = 0;
  private readonly actionLatenciesMs: number[] = [];
  private readonly lastDisconnectByChannelAndUser = new Map<string, number>();

  trackSocketConnected(channel: 'lobby' | 'match', userId: string): void {
    if (channel === 'lobby') {
      this.lobbySocketCount += 1;
    } else {
      this.matchSocketCount += 1;
    }

    const key = this.makeDisconnectKey(channel, userId);
    const lastDisconnectAt = this.lastDisconnectByChannelAndUser.get(key);
    if (!lastDisconnectAt) {
      return;
    }

    const elapsed = Date.now() - lastDisconnectAt;
    if (elapsed <= RECONNECT_WINDOW_MS) {
      this.reconnectAttempts += 1;
      this.reconnectSuccess += 1;
    }

    this.lastDisconnectByChannelAndUser.delete(key);
  }

  trackSocketDisconnected(channel: 'lobby' | 'match', userId: string): void {
    if (channel === 'lobby') {
      this.lobbySocketCount = Math.max(0, this.lobbySocketCount - 1);
    } else {
      this.matchSocketCount = Math.max(0, this.matchSocketCount - 1);
    }

    const key = this.makeDisconnectKey(channel, userId);
    this.lastDisconnectByChannelAndUser.set(key, Date.now());
  }

  recordActionLatency(milliseconds: number): void {
    if (milliseconds < 0 || Number.isNaN(milliseconds)) {
      return;
    }

    this.actionLatenciesMs.push(milliseconds);
    if (this.actionLatenciesMs.length > LATENCY_SAMPLE_LIMIT) {
      this.actionLatenciesMs.shift();
    }
  }

  recordActionReceived(): void {
    this.totalActions += 1;
  }

  recordInvalidAction(): void {
    this.invalidActions += 1;
  }

  getSnapshot(activeLobbies: number): ObservabilitySnapshot {
    const sorted = [...this.actionLatenciesMs].sort((a, b) => a - b);
    const p95Index = sorted.length > 0 ? Math.floor(0.95 * (sorted.length - 1)) : 0;
    const p95 = sorted.length > 0 ? sorted[p95Index] ?? 0 : 0;
    const totalSockets = this.lobbySocketCount + this.matchSocketCount;
    const invalidRate = this.totalActions === 0 ? 0 : this.invalidActions / this.totalActions;
    const reconnectRate = this.reconnectAttempts === 0 ? 1 : this.reconnectSuccess / this.reconnectAttempts;

    return {
      activeLobbies,
      websocketConnections: {
        lobby: this.lobbySocketCount,
        match: this.matchSocketCount,
        total: totalSockets
      },
      actionLatencyMs: {
        p95,
        samples: this.actionLatenciesMs.length
      },
      actionValidation: {
        total: this.totalActions,
        invalid: this.invalidActions,
        invalidRate
      },
      reconnect: {
        attempts: this.reconnectAttempts,
        success: this.reconnectSuccess,
        successRate: reconnectRate
      }
    };
  }

  private makeDisconnectKey(channel: 'lobby' | 'match', userId: string): string {
    return `${channel}:${userId}`;
  }
}
