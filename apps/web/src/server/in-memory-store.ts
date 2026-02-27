import {
  chooseTrump,
  createDeck32,
  createInitialRoundState,
  passBid,
  placeBid,
  playCard,
  requestTrumpReveal,
  RoundState
} from "@thegame/game-core";
import {
  ApiResponse,
  CreateLobbyIntent,
  GameplayIntent,
  JoinLobbyIntent,
  ReadyToggleIntent,
  StartMatchIntent
} from "@thegame/shared";

type LobbyPlayer = {
  actorId: string;
  seat: 0 | 1 | 2 | 3;
  ready: boolean;
};

type Lobby = {
  id: string;
  code: string;
  ownerId: string;
  name: string;
  status: "waiting" | "started";
  players: LobbyPlayer[];
  createdAt: string;
  matchId: string | null;
};

type StoredMatch = {
  id: string;
  lobbyId: string;
  version: number;
  round: RoundState;
  seatsByActor: Map<string, 0 | 1 | 2 | 3>;
  actorBySeat: Map<0 | 1 | 2 | 3, string>;
};

type ProjectedState = {
  match_id: string;
  version: number;
  lobby_id: string;
  you: {
    actor_id: string;
    seat: 0 | 1 | 2 | 3;
  } | null;
  players: Array<{
    actor_id: string;
    seat: 0 | 1 | 2 | 3;
    ready: boolean;
  }>;
  score: {
    teamA: number;
    teamB: number;
    cardPointsA: number;
    cardPointsB: number;
  };
  round: {
    phase: RoundState["phase"];
    bidValue: number | null;
    bidderSeat: number | null;
    currentTurnSeat: number;
    trumpSuit: RoundState["trumpSuit"];
    trumpRevealed: boolean;
    currentTrick: RoundState["currentTrick"];
    completedTricks: RoundState["completedTricks"];
    hand: RoundState["hands"][0] | null;
    handCountBySeat: Record<0 | 1 | 2 | 3, number>;
  };
};

const lobbies = new Map<string, Lobby>();
const matches = new Map<string, StoredMatch>();
const idempotency = new Map<string, ApiResponse<ProjectedState>>();

export function createLobby(payload: CreateLobbyIntent): ApiResponse<{ lobby: Lobby }> {
  const lobbyId = crypto.randomUUID();
  const ownerSeat = 0;

  const lobby: Lobby = {
    id: lobbyId,
    code: lobbyId.slice(0, 6).toUpperCase(),
    ownerId: payload.actor_id,
    name: payload.name,
    status: "waiting",
    players: [{ actorId: payload.actor_id, seat: ownerSeat, ready: false }],
    createdAt: new Date().toISOString(),
    matchId: null
  };

  lobbies.set(lobby.id, lobby);
  return { ok: true, data: { lobby } };
}

export function getLobby(lobbyId: string): ApiResponse<{ lobby: Lobby }> {
  const lobby = lobbies.get(lobbyId);
  if (!lobby) {
    return {
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: "Lobby not found."
      }
    };
  }

  return { ok: true, data: { lobby } };
}

export function joinLobby(payload: JoinLobbyIntent): ApiResponse<{ lobby: Lobby }> {
  const lobby = lobbies.get(payload.lobby_id);
  if (!lobby) {
    return {
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: "Lobby not found."
      }
    };
  }

  if (lobby.status !== "waiting") {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN",
        message: "Cannot join a lobby that has already started."
      }
    };
  }

  const existing = lobby.players.find((p) => p.actorId === payload.actor_id);
  if (existing) {
    return { ok: true, data: { lobby } };
  }

  if (lobby.players.length >= 4) {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN",
        message: "Lobby is full."
      }
    };
  }

  const usedSeats = new Set(lobby.players.map((player) => player.seat));
  let seat: 0 | 1 | 2 | 3 = 0;
  while (usedSeats.has(seat) && seat < 3) {
    seat = (seat + 1) as 0 | 1 | 2 | 3;
  }

  lobby.players.push({ actorId: payload.actor_id, seat, ready: false });
  lobby.players.sort((a, b) => a.seat - b.seat);

  return { ok: true, data: { lobby } };
}

export function readyToggle(payload: ReadyToggleIntent): ApiResponse<{ lobby: Lobby }> {
  const lobby = lobbies.get(payload.lobby_id);
  if (!lobby) {
    return {
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: "Lobby not found."
      }
    };
  }

  const player = lobby.players.find((p) => p.actorId === payload.actor_id);
  if (!player) {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN",
        message: "Player is not in this lobby."
      }
    };
  }

  player.ready = payload.ready;
  return { ok: true, data: { lobby } };
}

export function startMatch(payload: StartMatchIntent): ApiResponse<{ lobby: Lobby; match_id: string }> {
  const lobby = lobbies.get(payload.lobby_id);
  if (!lobby) {
    return {
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: "Lobby not found."
      }
    };
  }

  if (lobby.ownerId !== payload.actor_id) {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN",
        message: "Only lobby owner can start the match."
      }
    };
  }

  if (lobby.players.length !== 4) {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN",
        message: "Exactly 4 players are required."
      }
    };
  }

  if (!lobby.players.every((player) => player.ready)) {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN",
        message: "All players must be ready before starting."
      }
    };
  }

  if (lobby.matchId) {
    return { ok: true, data: { lobby, match_id: lobby.matchId } };
  }

  const matchId = crypto.randomUUID();
  const dealtHands = dealHands();
  const round = createInitialRoundState({ dealerSeat: 0, hands: dealtHands });

  const seatsByActor = new Map<string, 0 | 1 | 2 | 3>();
  const actorBySeat = new Map<0 | 1 | 2 | 3, string>();
  for (const player of lobby.players) {
    seatsByActor.set(player.actorId, player.seat);
    actorBySeat.set(player.seat, player.actorId);
  }

  const match: StoredMatch = {
    id: matchId,
    lobbyId: lobby.id,
    version: 0,
    round,
    seatsByActor,
    actorBySeat
  };

  matches.set(matchId, match);
  lobby.status = "started";
  lobby.matchId = matchId;

  return { ok: true, data: { lobby, match_id: matchId } };
}

export function getProjectedState(matchId: string, actorId?: string): ApiResponse<ProjectedState> {
  const match = matches.get(matchId);
  if (!match) {
    return {
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: "Match not found."
      }
    };
  }

  const lobby = lobbies.get(match.lobbyId);
  if (!lobby) {
    return {
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: "Lobby not found for match."
      }
    };
  }

  const projected = buildProjection(match, lobby, actorId ?? "");
  return { ok: true, data: projected };
}

export function applyIntent(matchId: string, intent: GameplayIntent): ApiResponse<ProjectedState> {
  const idemKey = `${matchId}:${intent.actor_id}:${intent.request_id}`;
  const cached = idempotency.get(idemKey);
  if (cached) {
    return cached;
  }

  const match = matches.get(matchId);
  if (!match) {
    return {
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: "Match not found."
      }
    };
  }

  const seat = match.seatsByActor.get(intent.actor_id);
  if (seat === undefined) {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN",
        message: "Actor is not part of this match."
      }
    };
  }

  if (intent.expected_version !== match.version) {
    return {
      ok: false,
      error: {
        code: "CONFLICT_STALE_STATE",
        message: `Expected version ${intent.expected_version}, current is ${match.version}`
      }
    };
  }

  const result = applyGameplayTransition(match.round, intent, seat);
  if (!result.ok) {
    return {
      ok: false,
      error: {
        code: "ILLEGAL_ACTION",
        message: result.error.message,
        details: {
          transition_code: result.error.code
        }
      }
    };
  }

  match.round = result.state;
  match.version += 1;

  const lobby = lobbies.get(match.lobbyId);
  if (!lobby) {
    return {
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: "Lobby not found for match."
      }
    };
  }

  const response: ApiResponse<ProjectedState> = {
    ok: true,
    data: buildProjection(match, lobby, intent.actor_id)
  };

  idempotency.set(idemKey, response);
  return response;
}

function applyGameplayTransition(round: RoundState, intent: GameplayIntent, seat: 0 | 1 | 2 | 3) {
  switch (intent.action) {
    case "place_bid":
      return placeBid(round, seat, intent.bid_value);
    case "pass_bid":
      return passBid(round, seat);
    case "choose_trump":
      return chooseTrump(round, seat, intent.trump_suit, intent.hidden_trump_rank);
    case "play_card":
      return playCard(round, seat, intent.card);
    case "request_trump_reveal":
      return requestTrumpReveal(round, seat);
    case "declare_pair":
    case "call_double":
    case "call_redouble":
    case "leave_room":
      return {
        ok: false as const,
        state: round,
        error: {
          code: "NOT_IMPLEMENTED",
          message: `${intent.action} transition is not implemented yet.`
        }
      };
    default:
      return {
        ok: false as const,
        state: round,
        error: {
          code: "UNKNOWN_ACTION",
          message: "Unknown action"
        }
      };
  }
}

function buildProjection(match: StoredMatch, lobby: Lobby, actorId: string): ProjectedState {
  const youSeat = match.seatsByActor.get(actorId);
  const handCountBySeat: Record<0 | 1 | 2 | 3, number> = {
    0: match.round.hands[0].length,
    1: match.round.hands[1].length,
    2: match.round.hands[2].length,
    3: match.round.hands[3].length
  };

  const cardPointsA = countCardPointsByTeam(match.round, "A");
  const cardPointsB = countCardPointsByTeam(match.round, "B");

  return {
    match_id: match.id,
    version: match.version,
    lobby_id: lobby.id,
    you:
      youSeat === undefined
        ? null
        : {
            actor_id: actorId,
            seat: youSeat
          },
    players: lobby.players.map((player) => ({
      actor_id: player.actorId,
      seat: player.seat,
      ready: player.ready
    })),
    score: {
      teamA: 0,
      teamB: 0,
      cardPointsA,
      cardPointsB
    },
    round: {
      phase: match.round.phase,
      bidValue: match.round.bidValue,
      bidderSeat: match.round.bidderSeat,
      currentTurnSeat: match.round.currentTurnSeat,
      trumpSuit: match.round.trumpSuit,
      trumpRevealed: match.round.trumpRevealed,
      currentTrick: match.round.currentTrick,
      completedTricks: match.round.completedTricks,
      hand: youSeat === undefined ? null : match.round.hands[youSeat],
      handCountBySeat
    }
  };
}

function dealHands(): Record<0 | 1 | 2 | 3, RoundState["hands"][0]> {
  const deck = createDeck32();
  const hands: Record<0 | 1 | 2 | 3, RoundState["hands"][0]> = { 0: [], 1: [], 2: [], 3: [] };

  for (let i = 0; i < deck.length; i += 1) {
    const seat = (i % 4) as 0 | 1 | 2 | 3;
    const card = deck[i];
    if (!card) {
      continue;
    }
    hands[seat].push(card);
  }

  return hands;
}

function countCardPointsByTeam(round: RoundState, team: "A" | "B"): number {
  const points = { J: 3, "9": 2, A: 1, "10": 1, K: 0, Q: 0, "8": 0, "7": 0 } as const;
  let sum = 0;

  for (const trick of round.completedTricks) {
    const trickWinnerTeam = trick.winnerSeat % 2 === 0 ? "A" : "B";
    if (trickWinnerTeam !== team) {
      continue;
    }

    for (const played of trick.cards) {
      sum += points[played.card.rank];
    }
  }

  return sum;
}
