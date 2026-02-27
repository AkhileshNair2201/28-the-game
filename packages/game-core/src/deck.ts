import { RANKS, SUITS } from './constants';
import { Card } from './types';

export function createDeck(): Card[] {
  const deck: Card[] = [];

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `${rank}${suit}`,
        suit,
        rank
      });
    }
  }

  return deck;
}

export function shuffleDeck(seed: string | number): Card[] {
  const deck = createDeck();
  const rng = createSeededRng(seed);

  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const left = deck[i];
    const right = deck[j];

    if (!left || !right) {
      continue;
    }

    deck[i] = right;
    deck[j] = left;
  }

  return deck;
}

function createSeededRng(seed: string | number): () => number {
  const seedText = typeof seed === 'number' ? String(seed) : seed;
  let hash = 2166136261;

  for (let i = 0; i < seedText.length; i += 1) {
    hash ^= seedText.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  let state = hash >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
