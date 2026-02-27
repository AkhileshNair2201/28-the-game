import { MatchIntentType } from './matches.types';

export type MatchEventType =
  | 'match_state_delta'
  | 'match_action_applied'
  | 'match_resolved';

export interface MatchDomainEvent {
  type: MatchEventType;
  matchId: string;
  roomCode: string;
  version: number;
  actorId?: string;
  intentType?: MatchIntentType;
  at: string;
}
