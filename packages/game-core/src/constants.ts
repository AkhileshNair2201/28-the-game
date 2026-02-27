import { Rank, Suit } from './types';

export const SUITS: Suit[] = ['S', 'H', 'D', 'C'];
export const RANKS: Rank[] = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const RANK_STRENGTH: Record<Rank, number> = {
  J: 8,
  '9': 7,
  A: 6,
  '10': 5,
  K: 4,
  Q: 3,
  '8': 2,
  '7': 1
};

export const CARD_POINTS: Record<Rank, number> = {
  J: 3,
  '9': 2,
  A: 1,
  '10': 1,
  K: 0,
  Q: 0,
  '8': 0,
  '7': 0
};
