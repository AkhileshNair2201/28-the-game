import { describe, expect, it } from 'vitest';
import { generateRoomCode, isValidRoomCode } from './room-code';

describe('room code', () => {
  it('generates valid room code format', () => {
    const code = generateRoomCode(6);

    expect(code).toHaveLength(6);
    expect(isValidRoomCode(code)).toBe(true);
  });

  it('rejects invalid room code format', () => {
    expect(isValidRoomCode('ABC123')).toBe(false);
    expect(isValidRoomCode('ab-12')).toBe(false);
    expect(isValidRoomCode('******')).toBe(false);
  });
});
