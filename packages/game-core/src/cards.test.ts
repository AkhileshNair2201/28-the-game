import { describe, expect, it } from "vitest";

import { cardPoints, compareRanks, createDeck32, handPoints, legalCardsForLeadSuit } from "./cards";
import { Card } from "./types";

describe("cards utilities", () => {
  it("creates a 32-card deck", () => {
    const deck = createDeck32();
    expect(deck).toHaveLength(32);
  });

  it("applies rank ordering J > 9 > A > 10 > K > Q > 8 > 7", () => {
    expect(compareRanks("J", "9")).toBeGreaterThan(0);
    expect(compareRanks("9", "A")).toBeGreaterThan(0);
    expect(compareRanks("A", "10")).toBeGreaterThan(0);
    expect(compareRanks("10", "K")).toBeGreaterThan(0);
    expect(compareRanks("K", "Q")).toBeGreaterThan(0);
    expect(compareRanks("Q", "8")).toBeGreaterThan(0);
    expect(compareRanks("8", "7")).toBeGreaterThan(0);
  });

  it("sums full deck points to 28", () => {
    const deck = createDeck32();
    expect(handPoints(deck)).toBe(28);
  });

  it("filters legal cards by lead suit when available", () => {
    const hand: Card[] = [
      { suit: "hearts", rank: "J" },
      { suit: "spades", rank: "9" },
      { suit: "hearts", rank: "7" }
    ];

    const legal = legalCardsForLeadSuit(hand, "hearts");
    expect(legal).toEqual([
      { suit: "hearts", rank: "J" },
      { suit: "hearts", rank: "7" }
    ]);
  });

  it("allows any card if lead suit is absent in hand", () => {
    const hand: Card[] = [
      { suit: "clubs", rank: "J" },
      { suit: "spades", rank: "9" }
    ];

    const legal = legalCardsForLeadSuit(hand, "hearts");
    expect(legal).toEqual(hand);
  });

  it("returns card points correctly", () => {
    expect(cardPoints({ suit: "hearts", rank: "J" })).toBe(3);
    expect(cardPoints({ suit: "hearts", rank: "9" })).toBe(2);
    expect(cardPoints({ suit: "hearts", rank: "A" })).toBe(1);
    expect(cardPoints({ suit: "hearts", rank: "10" })).toBe(1);
    expect(cardPoints({ suit: "hearts", rank: "K" })).toBe(0);
  });
});
