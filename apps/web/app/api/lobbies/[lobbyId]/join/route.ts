import { NextResponse } from "next/server";

import { joinLobbyIntentSchema } from "@thegame/shared";

import { joinLobby } from "@/src/server/in-memory-store";

type Params = {
  params: Promise<{ lobbyId: string }>;
};

export async function POST(request: Request, { params }: Params): Promise<NextResponse> {
  const { lobbyId } = await params;
  const payload = await request.json();
  const parsed = joinLobbyIntentSchema.safeParse({ ...payload, lobby_id: lobbyId });

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "BAD_REQUEST",
          message: "Invalid join lobby payload",
          details: parsed.error.flatten()
        }
      },
      { status: 400 }
    );
  }

  const result = joinLobby(parsed.data);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
