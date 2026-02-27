import { createClient } from "@supabase/supabase-js";

import { ServerEvent } from "@thegame/shared";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  supabaseUrl && supabaseServiceRole
    ? createClient(supabaseUrl, supabaseServiceRole, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      })
    : null;

export async function publishMatchEvent(matchId: string, event: ServerEvent): Promise<void> {
  if (!supabase) {
    return;
  }

  await supabase.channel(`match:${matchId}`).send({
    type: "broadcast",
    event: event.type,
    payload: event
  });
}
