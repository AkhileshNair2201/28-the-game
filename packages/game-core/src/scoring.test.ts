import { describe, expect, it } from "vitest";

import { createInitialRoundState } from "./auction";
import { applyRoundResolution, createInitialMatchState, resolveRoundScoring } from "./scoring";
import { RoundState } from "./round-types";

function buildRoundWithCompletedTricks(): RoundState {
  const state = createInitialRoundState({ dealerSeat: 0 });
  return {
    ...state,
    phase: "round_end",
    bidderSeat: 0,
    bidValue: 16,
    completedTricks: [
      {
        winnerSeat: 0,
        cards: [
          { seat: 0, card: { suit: "hearts", rank: "J" } },
          { seat: 1, card: { suit: "hearts", rank: "9" } },
          { seat: 2, card: { suit: "hearts", rank: "A" } },
          { seat: 3, card: { suit: "hearts", rank: "10" } }
        ]
      },
      {
        winnerSeat: 2,
        cards: [
          { seat: 0, card: { suit: "clubs", rank: "J" } },
          { seat: 1, card: { suit: "clubs", rank: "7" } },
          { seat: 2, card: { suit: "clubs", rank: "9" } },
          { seat: 3, card: { suit: "clubs", rank: "8" } }
        ]
      },
      {
        winnerSeat: 0,
        cards: [
          { seat: 0, card: { suit: "spades", rank: "J" } },
          { seat: 1, card: { suit: "spades", rank: "7" } },
          { seat: 2, card: { suit: "spades", rank: "A" } },
          { seat: 3, card: { suit: "spades", rank: "10" } }
        ]
      }
    ]
  };
}

describe("scoring", () => {
  it("resolves bidder success with baseline stake", () => {
    const round = buildRoundWithCompletedTricks();
    const result = resolveRoundScoring(
      round,
      {
        pairEnabled: false,
        doubleEnabled: false,
        redoubleEnabled: false,
        highBidTwoPoints: false
      },
      {
        pairAdjustment: 0,
        stakeMultiplier: 1
      }
    );

    expect(result.bidderTeam).toBe("A");
    expect(result.bidderSucceeded).toBe(true);
    expect(result.scoreDelta).toBe(1);
  });

  it("applies pair adjustment and can force failure", () => {
    const round = buildRoundWithCompletedTricks();
    const result = resolveRoundScoring(
      round,
      {
        pairEnabled: true,
        doubleEnabled: false,
        redoubleEnabled: false,
        highBidTwoPoints: false
      },
      {
        pairAdjustment: 8,
        stakeMultiplier: 1
      }
    );

    expect(result.effectiveTarget).toBe(24);
    expect(result.bidderSucceeded).toBe(false);
    expect(result.scoreDelta).toBe(-1);
  });

  it("applies double/redouble stake multipliers", () => {
    const round = buildRoundWithCompletedTricks();
    const result = resolveRoundScoring(
      round,
      {
        pairEnabled: false,
        doubleEnabled: true,
        redoubleEnabled: true,
        highBidTwoPoints: false
      },
      {
        pairAdjustment: 0,
        stakeMultiplier: 4
      }
    );

    expect(result.scoreDelta).toBe(4);
  });

  it("ends match at threshold", () => {
    const match = createInitialMatchState();

    const next = applyRoundResolution(match, {
      bidderTeam: "A",
      bidderPoints: 20,
      defenderPoints: 8,
      effectiveTarget: 16,
      bidderSucceeded: true,
      scoreDelta: 6
    });

    expect(next.ended).toBe(true);
    expect(next.winner).toBe("A");
  });
});
