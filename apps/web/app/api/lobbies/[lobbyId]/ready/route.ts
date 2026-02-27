import { NextResponse } from "next/server";

import { readyToggleIntentSchema } from "@thegame/shared";

import { readyToggle } from "@/src/server/in-memory-store";

type Params = {
  params: Promise<{ lobbyId: string }>;
};

export async function POST(request: Request, { params }: Params): Promise<NextResponse> {
  const { lobbyId } = await params;
  const payload = await request.json();
  const parsed = readyToggleIntentSchema.safeParse({ ...payload, lobby_id: lobbyId });

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "BAD_REQUEST",
          message: "Invalid ready toggle payload",
          details: parsed.error.flatten()
        }
      },
      { status: 400 }
    );
  }

  const result = readyToggle(parsed.data);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
