import { describe, expect, it } from 'vitest';
import type { Version } from './index';

describe('shared types', () => {
  it('accepts a numeric version', () => {
    const version: Version = 1;
    expect(version).toBe(1);
  });
});
