import { NextResponse } from "next/server";

import { gameplayIntentSchema } from "@thegame/shared";

import { applyIntent } from "@/src/server/in-memory-store";
import { publishMatchEvent } from "@/src/server/realtime";

type Params = {
  params: Promise<{ matchId: string }>;
};

export async function POST(request: Request, { params }: Params): Promise<NextResponse> {
  const { matchId } = await params;
  const payload = await request.json();
  const parsed = gameplayIntentSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "BAD_REQUEST",
          message: "Invalid intent payload",
          details: parsed.error.flatten()
        }
      },
      { status: 400 }
    );
  }

  const result = applyIntent(matchId, parsed.data);
  const status = result.ok ? 200 : result.error.code === "CONFLICT_STALE_STATE" ? 409 : 400;

  if (result.ok) {
    await publishMatchEvent(matchId, {
      type: "state_delta",
      match_id: matchId,
      version: result.data.version,
      occurred_at: new Date().toISOString(),
      delta: {
        action: parsed.data.action,
        phase: result.data.round.phase
      }
    });
  }

  return NextResponse.json(result, { status });
}
