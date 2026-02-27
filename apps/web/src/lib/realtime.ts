import { createClient, RealtimeChannel } from "@supabase/supabase-js";

import { ServerEvent } from "@thegame/shared";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function createRealtimeClient() {
  return createClient(supabaseUrl, supabaseAnon);
}

export function subscribeToMatchChannel(params: {
  matchId: string;
  currentVersion: number;
  onEvent: (event: ServerEvent) => void;
  onVersionGap: () => void;
}): RealtimeChannel {
  const client = createRealtimeClient();
  let version = params.currentVersion;

  const channel = client
    .channel(`match:${params.matchId}`)
    .on("broadcast", { event: "*" }, ({ payload }) => {
      const event = payload as ServerEvent;
      if (!("version" in event)) {
        params.onEvent(event);
        return;
      }

      if (event.version > version + 1) {
        params.onVersionGap();
        version = event.version;
        return;
      }

      version = Math.max(version, event.version);
      params.onEvent(event);
    })
    .subscribe();

  return channel;
}
