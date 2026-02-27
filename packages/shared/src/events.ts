import { z } from "zod";

const eventBaseSchema = z.object({
  match_id: z.string().min(1),
  version: z.number().int().min(0),
  occurred_at: z.string().datetime()
});

export const lobbyUpdatedEventSchema = z.object({
  type: z.literal("lobby_updated"),
  lobby_id: z.string().min(1),
  occurred_at: z.string().datetime()
});

export const matchStartedEventSchema = eventBaseSchema.extend({
  type: z.literal("match_started")
});

export const roundStartedEventSchema = eventBaseSchema.extend({
  type: z.literal("round_started"),
  round_no: z.number().int().min(1)
});

export const stateDeltaEventSchema = eventBaseSchema.extend({
  type: z.literal("state_delta"),
  delta: z.record(z.string(), z.unknown())
});

export const trickResolvedEventSchema = eventBaseSchema.extend({
  type: z.literal("trick_resolved"),
  winner_seat: z.number().int().min(0).max(3)
});

export const roundResolvedEventSchema = eventBaseSchema.extend({
  type: z.literal("round_resolved"),
  team_a_score: z.number().int(),
  team_b_score: z.number().int()
});

export const matchResolvedEventSchema = eventBaseSchema.extend({
  type: z.literal("match_resolved"),
  winner_team: z.enum(["A", "B"])
});

export const playerDisconnectedEventSchema = eventBaseSchema.extend({
  type: z.literal("player_disconnected"),
  actor_id: z.string().min(1)
});

export const playerReconnectedEventSchema = eventBaseSchema.extend({
  type: z.literal("player_reconnected"),
  actor_id: z.string().min(1)
});

export const serverEventSchema = z.discriminatedUnion("type", [
  lobbyUpdatedEventSchema,
  matchStartedEventSchema,
  roundStartedEventSchema,
  stateDeltaEventSchema,
  trickResolvedEventSchema,
  roundResolvedEventSchema,
  matchResolvedEventSchema,
  playerDisconnectedEventSchema,
  playerReconnectedEventSchema
]);

export type ServerEvent = z.infer<typeof serverEventSchema>;
