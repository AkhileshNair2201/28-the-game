import { NextResponse } from "next/server";

import { startMatchIntentSchema } from "@thegame/shared";

import { startMatch } from "@/src/server/in-memory-store";

type Params = {
  params: Promise<{ lobbyId: string }>;
};

export async function POST(request: Request, { params }: Params): Promise<NextResponse> {
  const { lobbyId } = await params;
  const payload = await request.json();
  const parsed = startMatchIntentSchema.safeParse({ ...payload, lobby_id: lobbyId });

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "BAD_REQUEST",
          message: "Invalid start match payload",
          details: parsed.error.flatten()
        }
      },
      { status: 400 }
    );
  }

  const result = startMatch(parsed.data);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
