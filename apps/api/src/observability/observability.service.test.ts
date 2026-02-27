import { describe, expect, it } from 'vitest';
import { ObservabilityService } from './observability.service';

describe('ObservabilityService', () => {
  it('tracks counters and returns metrics snapshot', () => {
    const service = new ObservabilityService();

    service.trackSocketConnected('lobby', 'user-1');
    service.recordActionReceived();
    service.recordActionReceived();
    service.recordInvalidAction();
    service.recordActionLatency(15);
    service.recordActionLatency(35);
    service.trackSocketDisconnected('lobby', 'user-1');
    service.trackSocketConnected('lobby', 'user-1');

    const snapshot = service.getSnapshot(2);

    expect(snapshot.activeLobbies).toBe(2);
    expect(snapshot.websocketConnections.lobby).toBe(1);
    expect(snapshot.actionValidation.total).toBe(2);
    expect(snapshot.actionValidation.invalid).toBe(1);
    expect(snapshot.actionLatencyMs.samples).toBe(2);
    expect(snapshot.reconnect.success).toBeGreaterThanOrEqual(1);
  });
});
