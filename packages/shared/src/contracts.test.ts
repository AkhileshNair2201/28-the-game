import { describe, expect, it } from "vitest";

import { gameplayIntentSchema, serverEventSchema } from "./index";

describe("shared contracts", () => {
  it("parses a valid gameplay intent", () => {
    const parsed = gameplayIntentSchema.parse({
      action: "place_bid",
      match_id: "m-1",
      actor_id: "u-1",
      request_id: "r-1",
      expected_version: 1,
      bid_value: 18
    });

    expect(parsed.action).toBe("place_bid");
    if (parsed.action === "place_bid") {
      expect(parsed.bid_value).toBe(18);
    }
  });

  it("rejects an invalid gameplay intent", () => {
    const result = gameplayIntentSchema.safeParse({
      action: "place_bid",
      match_id: "m-1",
      actor_id: "u-1",
      request_id: "r-1",
      expected_version: 1,
      bid_value: 10
    });

    expect(result.success).toBe(false);
  });

  it("parses a valid realtime event", () => {
    const parsed = serverEventSchema.parse({
      type: "state_delta",
      match_id: "m-1",
      version: 2,
      occurred_at: new Date().toISOString(),
      delta: {
        phase: "auction"
      }
    });

    expect(parsed.type).toBe("state_delta");
  });
});
