import { createDeck, type RoundState, type Seat, type Suit } from '../src/index';

export function cardId(rank: string, suit: Suit): string {
  return `${rank}${suit}`;
}

export function setHand(state: RoundState, seat: Seat, ids: string[]): void {
  const deck = createDeck();
  state.hands[seat] = ids.map((id) => {
    const card = deck.find((entry) => entry.id === id);
    if (!card) {
      throw new Error(`Card ${id} not found`);
    }

    return card;
  });
}
