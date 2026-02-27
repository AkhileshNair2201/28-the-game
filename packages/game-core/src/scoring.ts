import { cardPoints } from "./cards";
import { PlayerSeat, RoundState } from "./round-types";

export type Team = "A" | "B";

export type ScoreOptions = {
  pairEnabled: boolean;
  doubleEnabled: boolean;
  redoubleEnabled: boolean;
  highBidTwoPoints: boolean;
};

export type ScoreContext = {
  pairAdjustment: number;
  stakeMultiplier: 1 | 2 | 4;
};

export type RoundResolution = {
  bidderTeam: Team;
  bidderPoints: number;
  defenderPoints: number;
  effectiveTarget: number;
  bidderSucceeded: boolean;
  scoreDelta: number;
};

export type MatchState = {
  teamScores: Record<Team, number>;
  winner: Team | null;
  loser: Team | null;
  ended: boolean;
};

export function teamOfSeat(seat: PlayerSeat): Team {
  return seat % 2 === 0 ? "A" : "B";
}

export function createInitialMatchState(): MatchState {
  return {
    teamScores: {
      A: 0,
      B: 0
    },
    winner: null,
    loser: null,
    ended: false
  };
}

export function resolveRoundScoring(
  round: RoundState,
  options: ScoreOptions,
  context: ScoreContext
): RoundResolution {
  if (round.bidderSeat === null || round.bidValue === null) {
    throw new Error("Cannot resolve scoring without bidder and bid value.");
  }

  const bidderTeam = teamOfSeat(round.bidderSeat);
  const bidderPoints = countTeamCardPoints(round, bidderTeam);
  const defenderPoints = 28 - bidderPoints;

  const effectiveTarget = clampEffectiveTarget(
    round.bidValue + (options.pairEnabled ? context.pairAdjustment : 0)
  );

  const bidderSucceeded = bidderPoints >= effectiveTarget;

  let baseStake = 1;
  if (options.highBidTwoPoints && round.bidValue >= 21) {
    baseStake = 2;
  }

  let multiplier = 1;
  if (options.doubleEnabled) {
    multiplier = context.stakeMultiplier;
    if (!options.redoubleEnabled && multiplier > 2) {
      multiplier = 2;
    }
  }

  const scoreDelta = baseStake * multiplier * (bidderSucceeded ? 1 : -1);

  return {
    bidderTeam,
    bidderPoints,
    defenderPoints,
    effectiveTarget,
    bidderSucceeded,
    scoreDelta
  };
}

export function applyRoundResolution(match: MatchState, result: RoundResolution): MatchState {
  const nextScores = {
    ...match.teamScores,
    [result.bidderTeam]: match.teamScores[result.bidderTeam] + result.scoreDelta
  };

  let winner: Team | null = null;
  let loser: Team | null = null;

  if (nextScores.A >= 6 || nextScores.B <= -6) {
    winner = "A";
    loser = "B";
  } else if (nextScores.B >= 6 || nextScores.A <= -6) {
    winner = "B";
    loser = "A";
  }

  return {
    ...match,
    teamScores: nextScores,
    winner,
    loser,
    ended: winner !== null
  };
}

function clampEffectiveTarget(value: number): number {
  return Math.max(0, Math.min(32, value));
}

function countTeamCardPoints(round: RoundState, team: Team): number {
  let points = 0;

  for (const trick of round.completedTricks) {
    if (teamOfSeat(trick.winnerSeat) !== team) {
      continue;
    }

    for (const trickCard of trick.cards) {
      points += cardPoints(trickCard.card);
    }
  }

  return points;
}
