import { describe, expect, it } from 'vitest';
import { shuffleDeck } from '../src/index';

describe('deck shuffle', () => {
  it('produces deterministic deck shuffle by seed', () => {
    const a = shuffleDeck('seed-1').map((card) => card.id);
    const b = shuffleDeck('seed-1').map((card) => card.id);
    const c = shuffleDeck('seed-2').map((card) => card.id);

    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });
});
