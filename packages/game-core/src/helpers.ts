import { RANK_STRENGTH } from './constants';
import { Rank, Seat, Team } from './types';

export function seatToTeam(seat: Seat): Team {
  return seat % 2 === 0 ? 'A' : 'B';
}

export function nextSeatCounterClockwise(seat: Seat): Seat {
  return ((seat + 1) % 4) as Seat;
}

export function compareRankStrength(a: Rank, b: Rank): number {
  return RANK_STRENGTH[a] - RANK_STRENGTH[b];
}

export function oppositeTeam(team: Team): Team {
  return team === 'A' ? 'B' : 'A';
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function cloneState<T>(value: T): T {
  return structuredClone(value);
}
