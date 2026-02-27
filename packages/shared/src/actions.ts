import { z } from "zod";

import { RANKS, ROUND_PHASES, SUITS } from "./domain";

export const matchIdSchema = z.string().min(1);
export const actorIdSchema = z.string().min(1);
export const requestIdSchema = z.string().min(1);
export const expectedVersionSchema = z.number().int().min(0);

const suitSchema = z.enum(SUITS);
const rankSchema = z.enum(RANKS);
const phaseSchema = z.enum(ROUND_PHASES);

const baseIntentSchema = z.object({
  match_id: matchIdSchema,
  actor_id: actorIdSchema,
  request_id: requestIdSchema,
  expected_version: expectedVersionSchema
});

export const createLobbyIntentSchema = z.object({
  actor_id: actorIdSchema,
  name: z.string().min(1).max(64),
  options: z.record(z.string(), z.boolean()).optional()
});

export const joinLobbyIntentSchema = z.object({
  actor_id: actorIdSchema,
  lobby_id: z.string().min(1)
});

export const readyToggleIntentSchema = z.object({
  actor_id: actorIdSchema,
  lobby_id: z.string().min(1),
  ready: z.boolean()
});

export const startMatchIntentSchema = z.object({
  actor_id: actorIdSchema,
  lobby_id: z.string().min(1)
});

export const placeBidIntentSchema = baseIntentSchema.extend({
  action: z.literal("place_bid"),
  bid_value: z.number().int().min(14).max(28)
});

export const passBidIntentSchema = baseIntentSchema.extend({
  action: z.literal("pass_bid")
});

export const chooseTrumpIntentSchema = baseIntentSchema.extend({
  action: z.literal("choose_trump"),
  trump_suit: suitSchema,
  hidden_trump_rank: rankSchema
});

export const playCardIntentSchema = baseIntentSchema.extend({
  action: z.literal("play_card"),
  card: z.object({
    suit: suitSchema,
    rank: rankSchema
  })
});

export const requestTrumpRevealIntentSchema = baseIntentSchema.extend({
  action: z.literal("request_trump_reveal")
});

export const declarePairIntentSchema = baseIntentSchema.extend({
  action: z.literal("declare_pair")
});

export const callDoubleIntentSchema = baseIntentSchema.extend({
  action: z.literal("call_double")
});

export const callRedoubleIntentSchema = baseIntentSchema.extend({
  action: z.literal("call_redouble")
});

export const leaveRoomIntentSchema = baseIntentSchema.extend({
  action: z.literal("leave_room")
});

export const gameplayIntentSchema = z.discriminatedUnion("action", [
  placeBidIntentSchema,
  passBidIntentSchema,
  chooseTrumpIntentSchema,
  playCardIntentSchema,
  requestTrumpRevealIntentSchema,
  declarePairIntentSchema,
  callDoubleIntentSchema,
  callRedoubleIntentSchema,
  leaveRoomIntentSchema
]);

export const stateQuerySchema = z.object({
  match_id: matchIdSchema,
  actor_id: actorIdSchema,
  phase: phaseSchema.optional()
});

export type CreateLobbyIntent = z.infer<typeof createLobbyIntentSchema>;
export type JoinLobbyIntent = z.infer<typeof joinLobbyIntentSchema>;
export type ReadyToggleIntent = z.infer<typeof readyToggleIntentSchema>;
export type StartMatchIntent = z.infer<typeof startMatchIntentSchema>;
export type PlaceBidIntent = z.infer<typeof placeBidIntentSchema>;
export type PassBidIntent = z.infer<typeof passBidIntentSchema>;
export type ChooseTrumpIntent = z.infer<typeof chooseTrumpIntentSchema>;
export type PlayCardIntent = z.infer<typeof playCardIntentSchema>;
export type RequestTrumpRevealIntent = z.infer<typeof requestTrumpRevealIntentSchema>;
export type DeclarePairIntent = z.infer<typeof declarePairIntentSchema>;
export type CallDoubleIntent = z.infer<typeof callDoubleIntentSchema>;
export type CallRedoubleIntent = z.infer<typeof callRedoubleIntentSchema>;
export type LeaveRoomIntent = z.infer<typeof leaveRoomIntentSchema>;
export type GameplayIntent = z.infer<typeof gameplayIntentSchema>;
