import { NextResponse } from "next/server";

import { getProjectedState } from "@/src/server/in-memory-store";

type Params = {
  params: Promise<{ matchId: string }>;
};

export async function GET(request: Request, { params }: Params): Promise<NextResponse> {
  const { matchId } = await params;
  const url = new URL(request.url);
  const actorId = url.searchParams.get("actor_id") ?? undefined;
  const result = getProjectedState(matchId, actorId);

  return NextResponse.json(result, {
    status: result.ok ? 200 : 404
  });
}
