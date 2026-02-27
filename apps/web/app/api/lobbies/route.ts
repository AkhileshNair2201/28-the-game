import { NextResponse } from "next/server";

import { createLobbyIntentSchema } from "@thegame/shared";

import { createLobby } from "@/src/server/in-memory-store";

export async function POST(request: Request): Promise<NextResponse> {
  const payload = await request.json();
  const parsed = createLobbyIntentSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "BAD_REQUEST",
          message: "Invalid create lobby payload",
          details: parsed.error.flatten()
        }
      },
      { status: 400 }
    );
  }

  const result = createLobby(parsed.data);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
