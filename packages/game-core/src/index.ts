export interface GameCoreVersion {
  major: number;
  minor: number;
}

export function getGameCoreVersion(): GameCoreVersion {
  return {
    major: 0,
    minor: 1
  };
}

export function isBidInRange(bid: number): boolean {
  return bid >= 14 && bid <= 28;
}
