import { describe, expect, it } from 'vitest';
import { getGameCoreVersion, isBidInRange } from '../src/index';

describe('version and bid range', () => {
  it('returns stable version and bid checks', () => {
    expect(getGameCoreVersion()).toEqual({ major: 1, minor: 0 });
    expect(isBidInRange(14)).toBe(true);
    expect(isBidInRange(28)).toBe(true);
    expect(isBidInRange(13)).toBe(false);
  });
});
