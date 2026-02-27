import { describe, expect, it } from "vitest";

import { chooseTrump, createInitialRoundState, passBid, placeBid } from "./auction";

describe("auction", () => {
  it("starts auction with seat right of dealer", () => {
    const state = createInitialRoundState({ dealerSeat: 0 });
    expect(state.currentTurnSeat).toBe(1);
    expect(state.phase).toBe("auction");
  });

  it("requires opening seat to bid first", () => {
    const state = createInitialRoundState({ dealerSeat: 0 });
    const result = passBid(state, 1);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("OPENING_BID_REQUIRED");
    }
  });

  it("accepts increasing bids and closes after three passes", () => {
    const s0 = createInitialRoundState({ dealerSeat: 0 });
    const s1 = placeBid(s0, 1, 14);
    expect(s1.ok).toBe(true);
    if (!s1.ok) {
      return;
    }

    const s2 = passBid(s1.state, 2);
    const s3 = passBid(s2.state, 3);
    const s4 = passBid(s3.state, 0);

    expect(s4.ok).toBe(true);
    if (!s4.ok) {
      return;
    }

    expect(s4.state.phase).toBe("trump_selection");
    expect(s4.state.bidderSeat).toBe(1);
    expect(s4.state.bidValue).toBe(14);
  });

  it("only bidder can choose trump and move to play_before_trump", () => {
    const s0 = createInitialRoundState({ dealerSeat: 0 });
    const s1 = placeBid(s0, 1, 16);
    if (!s1.ok) {
      throw new Error("unexpected");
    }

    const s2 = passBid(s1.state, 2);
    if (!s2.ok) {
      throw new Error("unexpected");
    }

    const s3 = passBid(s2.state, 3);
    if (!s3.ok) {
      throw new Error("unexpected");
    }

    const s4 = passBid(s3.state, 0);
    if (!s4.ok) {
      throw new Error("unexpected");
    }

    const s5 = chooseTrump(s4.state, 1, "hearts", "J");
    expect(s5.ok).toBe(true);

    if (!s5.ok) {
      return;
    }

    expect(s5.state.phase).toBe("play_before_trump");
    expect(s5.state.trumpSuit).toBe("hearts");
    expect(s5.state.trumpRevealed).toBe(false);
  });
});
