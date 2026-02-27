import { describe, expect, it } from "vitest";

import { chooseTrump, createInitialRoundState, passBid, placeBid } from "./auction";
import { playCard, requestTrumpReveal } from "./play";
import { RoundState } from "./round-types";
import { Card } from "./types";

function startPlayState(): RoundState {
  const s0 = createInitialRoundState({
    dealerSeat: 0,
    hands: {
      0: [
        { suit: "clubs", rank: "7" },
        { suit: "hearts", rank: "9" }
      ],
      1: [
        { suit: "hearts", rank: "J" },
        { suit: "spades", rank: "A" }
      ],
      2: [
        { suit: "hearts", rank: "7" },
        { suit: "spades", rank: "9" }
      ],
      3: [
        { suit: "diamonds", rank: "10" },
        { suit: "spades", rank: "J" }
      ]
    }
  });

  const s1 = placeBid(s0, 1, 16);
  if (!s1.ok) throw new Error("unexpected");
  const s2 = passBid(s1.state, 2);
  if (!s2.ok) throw new Error("unexpected");
  const s3 = passBid(s2.state, 3);
  if (!s3.ok) throw new Error("unexpected");
  const s4 = passBid(s3.state, 0);
  if (!s4.ok) throw new Error("unexpected");
  const s5 = chooseTrump(s4.state, 1, "hearts", "J");
  if (!s5.ok) throw new Error("unexpected");

  return s5.state;
}

describe("play", () => {
  it("enforces follow-suit", () => {
    const state = startPlayState();

    const p1 = playCard(state, 1, { suit: "spades", rank: "A" });
    expect(p1.ok).toBe(true);
    if (!p1.ok) return;

    const p2 = playCard(p1.state, 2, { suit: "hearts", rank: "7" });
    expect(p2.ok).toBe(false);
    if (!p2.ok) {
      expect(p2.error.code).toBe("MUST_FOLLOW_SUIT");
    }
  });

  it("phase 1 ignores hidden trump when deciding winner", () => {
    let state = startPlayState();

    const moves: Array<[0 | 1 | 2 | 3, Card]> = [
      [1, { suit: "spades", rank: "A" }],
      [2, { suit: "spades", rank: "9" }],
      [3, { suit: "spades", rank: "J" }],
      [0, { suit: "hearts", rank: "9" }]
    ];

    for (const [seat, card] of moves) {
      const result = playCard(state, seat, card);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      state = result.state;
    }

    const firstCompleted = state.completedTricks[0];
    expect(firstCompleted?.winnerSeat).toBe(3);
  });

  it("transitions to phase 2 when reveal is requested legally", () => {
    const state = startPlayState();
    const revealReadyState: RoundState = {
      ...state,
      hands: {
        ...state.hands,
        2: [
          { suit: "hearts", rank: "7" },
          { suit: "diamonds", rank: "8" }
        ]
      }
    };
    const p1 = playCard(revealReadyState, 1, { suit: "spades", rank: "A" });
    if (!p1.ok) throw new Error("unexpected");

    const reveal = requestTrumpReveal(p1.state, 2);
    expect(reveal.ok).toBe(true);
    if (!reveal.ok) return;
    expect(reveal.state.phase).toBe("play_after_trump");
    expect(reveal.state.trumpRevealed).toBe(true);
  });

  it("prevents bidder from leading trump in phase 1 when non-trump exists", () => {
    const state = startPlayState();

    const result = playCard(state, 1, { suit: "hearts", rank: "J" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("BIDDER_TRUMP_LEAD_RESTRICTED");
    }
  });
});
