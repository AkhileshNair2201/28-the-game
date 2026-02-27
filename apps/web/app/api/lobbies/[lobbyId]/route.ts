import { NextResponse } from "next/server";

import { getLobby } from "@/src/server/in-memory-store";

type Params = {
  params: Promise<{ lobbyId: string }>;
};

export async function GET(_: Request, { params }: Params): Promise<NextResponse> {
  const { lobbyId } = await params;
  const result = getLobby(lobbyId);
  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}
