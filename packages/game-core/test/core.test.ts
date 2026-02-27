import { describe, expect, it } from 'vitest';
import { getGameCoreVersion, isBidInRange } from '../src/index';

describe('game-core', () => {
  it('returns scaffold version', () => {
    expect(getGameCoreVersion()).toEqual({ major: 0, minor: 1 });
  });

  it('validates bid range', () => {
    expect(isBidInRange(14)).toBe(true);
    expect(isBidInRange(28)).toBe(true);
    expect(isBidInRange(13)).toBe(false);
    expect(isBidInRange(29)).toBe(false);
  });
});
