import { GameCoreVersion } from './types';

export function getGameCoreVersion(): GameCoreVersion {
  return {
    major: 1,
    minor: 0
  };
}

export function isBidInRange(bid: number): boolean {
  return Number.isInteger(bid) && bid >= 14 && bid <= 28;
}
