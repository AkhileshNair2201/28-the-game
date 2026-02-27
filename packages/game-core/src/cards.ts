import { Card, RANKS, Rank, SUITS, Suit } from "./types";

const rankStrengthMap: Record<Rank, number> = {
  J: 8,
  "9": 7,
  A: 6,
  "10": 5,
  K: 4,
  Q: 3,
  "8": 2,
  "7": 1
};

const rankPointMap: Record<Rank, number> = {
  J: 3,
  "9": 2,
  A: 1,
  "10": 1,
  K: 0,
  Q: 0,
  "8": 0,
  "7": 0
};

export function createDeck32(): Card[] {
  const deck: Card[] = [];

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }

  return deck;
}

export function compareRanks(a: Rank, b: Rank): number {
  return rankStrengthMap[a] - rankStrengthMap[b];
}

export function rankStrength(rank: Rank): number {
  return rankStrengthMap[rank];
}

export function cardPoints(card: Card): number {
  return rankPointMap[card.rank];
}

export function handPoints(cards: Card[]): number {
  return cards.reduce((sum, card) => sum + cardPoints(card), 0);
}

export function hasSuit(cards: Card[], suit: Suit): boolean {
  return cards.some((card) => card.suit === suit);
}

export function legalCardsForLeadSuit(cards: Card[], leadSuit: Suit | null): Card[] {
  if (!leadSuit) {
    return [...cards];
  }

  if (!hasSuit(cards, leadSuit)) {
    return [...cards];
  }

  return cards.filter((card) => card.suit === leadSuit);
}

export function removeCardFromHand(cards: Card[], cardToRemove: Card): Card[] {
  const index = cards.findIndex(
    (card) => card.suit === cardToRemove.suit && card.rank === cardToRemove.rank
  );

  if (index < 0) {
    return [...cards];
  }

  return [...cards.slice(0, index), ...cards.slice(index + 1)];
}
