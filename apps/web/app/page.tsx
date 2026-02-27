"use client";

import { FormEvent, useMemo, useState } from "react";

type Card = {
  suit: "hearts" | "diamonds" | "clubs" | "spades";
  rank: "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";
};

type Lobby = {
  id: string;
  code: string;
  ownerId: string;
  name: string;
  status: "waiting" | "started";
  players: Array<{
    actorId: string;
    seat: 0 | 1 | 2 | 3;
    ready: boolean;
  }>;
  matchId: string | null;
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
    phase: "auction" | "trump_selection" | "play_before_trump" | "play_after_trump" | "round_end";
    bidValue: number | null;
    bidderSeat: number | null;
    currentTurnSeat: number;
    trumpSuit: "hearts" | "diamonds" | "clubs" | "spades" | null;
    trumpRevealed: boolean;
    currentTrick: Array<{ seat: 0 | 1 | 2 | 3; card: Card }>;
    completedTricks: Array<{ winnerSeat: 0 | 1 | 2 | 3; cards: Array<{ seat: 0 | 1 | 2 | 3; card: Card }> }>;
    hand: Card[] | null;
    handCountBySeat: Record<0 | 1 | 2 | 3, number>;
  };
};

type ApiResponse<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
      };
    };

const suitSymbol: Record<Card["suit"], string> = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠"
};

const seatLabel: Record<0 | 1 | 2 | 3, string> = {
  0: "Seat 0",
  1: "Seat 1",
  2: "Seat 2",
  3: "Seat 3"
};

export default function HomePage() {
  const [actorId, setActorId] = useState("player-1");
  const [lobbyName, setLobbyName] = useState("28 Lobby");
  const [lobbyIdInput, setLobbyIdInput] = useState("");

  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [matchState, setMatchState] = useState<ProjectedState | null>(null);

  const [bidValue, setBidValue] = useState(14);
  const [trumpSuit, setTrumpSuit] = useState<Card["suit"]>("hearts");
  const [trumpRank, setTrumpRank] = useState<Card["rank"]>("J");

  const [pending, setPending] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const mySeat = matchState?.you?.seat ?? null;
  const myHand = matchState?.round.hand ?? [];

  const sortedPlayers = useMemo(() => {
    if (!lobby) return [];
    return [...lobby.players].sort((a, b) => a.seat - b.seat);
  }, [lobby]);

  const tableSeats = useMemo(() => {
    if (!matchState || mySeat === null) {
      return [] as Array<{ seat: 0 | 1 | 2 | 3; role: string }>;
    }

    const roleByDelta = ["You", "Left Opponent", "Partner", "Right Opponent"];
    return ([0, 1, 2, 3] as const).map((seat) => {
      const delta = (seat - mySeat + 4) % 4;
      return {
        seat,
        role: roleByDelta[delta]
      };
    });
  }, [matchState, mySeat]);

  const callApi = async <T,>(path: string, init?: RequestInit): Promise<ApiResponse<T> | null> => {
    if (pending) {
      return null;
    }

    setPending(true);
    setErrorBanner(null);

    try {
      const response = await fetch(path, init);
      const result = (await response.json()) as ApiResponse<T>;

      if (!result.ok) {
        setErrorBanner(`${result.error.code}: ${result.error.message}`);
      }

      return result;
    } catch {
      setErrorBanner("Network error. Please retry.");
      return null;
    } finally {
      setPending(false);
    }
  };

  const refreshLobby = async (): Promise<void> => {
    if (!lobby) return;
    const result = await callApi<{ lobby: Lobby }>(`/api/lobbies/${lobby.id}`);
    if (result?.ok) {
      setLobby(result.data.lobby);
      if (result.data.lobby.matchId) {
        await refreshMatch(result.data.lobby.matchId);
      }
    }
  };

  const refreshMatch = async (matchId?: string): Promise<void> => {
    const resolvedMatchId = matchId ?? lobby?.matchId;
    if (!resolvedMatchId) return;

    const result = await callApi<ProjectedState>(
      `/api/matches/${resolvedMatchId}/state?actor_id=${encodeURIComponent(actorId)}`
    );
    if (result?.ok) {
      setMatchState(result.data);
    }
  };

  const createLobby = async (): Promise<void> => {
    const result = await callApi<{ lobby: Lobby }>("/api/lobbies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actor_id: actorId, name: lobbyName })
    });

    if (result?.ok) {
      setLobby(result.data.lobby);
      setLobbyIdInput(result.data.lobby.id);
    }
  };

  const joinLobby = async (): Promise<void> => {
    if (!lobbyIdInput) return;
    const result = await callApi<{ lobby: Lobby }>(`/api/lobbies/${lobbyIdInput}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actor_id: actorId })
    });

    if (result?.ok) {
      setLobby(result.data.lobby);
    }
  };

  const setReady = async (ready: boolean): Promise<void> => {
    if (!lobby) return;
    const result = await callApi<{ lobby: Lobby }>(`/api/lobbies/${lobby.id}/ready`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actor_id: actorId, ready })
    });

    if (result?.ok) {
      setLobby(result.data.lobby);
    }
  };

  const startMatch = async (): Promise<void> => {
    if (!lobby) return;
    const result = await callApi<{ lobby: Lobby; match_id: string }>(`/api/lobbies/${lobby.id}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actor_id: actorId })
    });

    if (result?.ok) {
      setLobby(result.data.lobby);
      await refreshMatch(result.data.match_id);
    }
  };

  const sendIntent = async (payload: Record<string, unknown>): Promise<void> => {
    if (!matchState) return;

    const result = await callApi<ProjectedState>(`/api/matches/${matchState.match_id}/intents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (result?.ok) {
      setMatchState(result.data);
      return;
    }

    if (result && !result.ok && result.error.code === "CONFLICT_STALE_STATE") {
      await refreshMatch(matchState.match_id);
    }
  };

  const onBid = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!matchState) return;

    await sendIntent({
      action: "place_bid",
      match_id: matchState.match_id,
      actor_id: actorId,
      request_id: crypto.randomUUID(),
      expected_version: matchState.version,
      bid_value: bidValue
    });
  };

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 20, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ marginBottom: 8 }}>Twenty-Eight Multiplayer MVP</h1>
      <p style={{ marginTop: 0, color: "#555" }}>Phase-10 lobby + seat-relative table view</p>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <label>
          Actor ID
          <input
            value={actorId}
            onChange={(e) => setActorId(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          />
        </label>
        <label>
          Lobby Name
          <input
            value={lobbyName}
            onChange={(e) => setLobbyName(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          />
        </label>
      </section>

      {errorBanner ? (
        <div style={{ background: "#ffe8e8", color: "#8b0000", padding: 10, borderRadius: 8, marginBottom: 12 }}>
          {errorBanner}
        </div>
      ) : null}

      {!lobby ? (
        <section style={{ display: "grid", gap: 10, marginBottom: 16 }}>
          <button type="button" disabled={pending} onClick={createLobby}>
            Create Lobby
          </button>

          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
            <input
              value={lobbyIdInput}
              onChange={(e) => setLobbyIdInput(e.target.value)}
              placeholder="Lobby ID"
              style={{ padding: 8 }}
            />
            <button type="button" disabled={pending || !lobbyIdInput} onClick={joinLobby}>
              Join Lobby
            </button>
          </div>
        </section>
      ) : (
        <section style={{ marginBottom: 16, border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
          <h2 style={{ marginTop: 0 }}>Lobby: {lobby.name}</h2>
          <p style={{ margin: "4px 0" }}>
            ID: <code>{lobby.id}</code>
          </p>
          <p style={{ margin: "4px 0" }}>
            Status: <b>{lobby.status}</b>
          </p>
          <ul>
            {sortedPlayers.map((player) => (
              <li key={player.actorId}>
                {seatLabel[player.seat]} - <code>{player.actorId}</code> - {player.ready ? "ready" : "not ready"}
              </li>
            ))}
          </ul>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" disabled={pending} onClick={() => setReady(true)}>
              Mark Ready
            </button>
            <button type="button" disabled={pending} onClick={() => setReady(false)}>
              Mark Not Ready
            </button>
            <button type="button" disabled={pending} onClick={refreshLobby}>
              Refresh Lobby
            </button>
            <button type="button" disabled={pending || lobby.status !== "waiting"} onClick={startMatch}>
              Start Match
            </button>
          </div>
        </section>
      )}

      {matchState ? (
        <section style={{ border: "1px solid #222", borderRadius: 12, padding: 12 }}>
          <h2 style={{ marginTop: 0 }}>Table</h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
            {tableSeats.map((entry) => {
              const player = matchState.players.find((p) => p.seat === entry.seat);
              const isYou = entry.role === "You";
              const handCount = matchState.round.handCountBySeat[entry.seat];
              return (
                <div key={entry.seat} style={{ border: "1px solid #ccc", borderRadius: 8, padding: 8 }}>
                  <div style={{ fontWeight: 700 }}>{entry.role}</div>
                  <div>{seatLabel[entry.seat]}</div>
                  <div>
                    <code>{player?.actor_id ?? "-"}</code>
                  </div>
                  <div>{isYou ? `Cards in hand: ${myHand.length}` : `Hidden cards: ${handCount}`}</div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 8 }}>
              <div>
                Phase: <b>{matchState.round.phase}</b>
              </div>
              <div>
                Turn: <b>{seatLabel[matchState.round.currentTurnSeat as 0 | 1 | 2 | 3]}</b>
              </div>
              <div>
                Bid: <b>{matchState.round.bidValue ?? "-"}</b>
              </div>
              <div>
                Bidder: <b>{matchState.round.bidderSeat ?? "-"}</b>
              </div>
              <div>
                Trump: <b>{matchState.round.trumpRevealed ? matchState.round.trumpSuit ?? "-" : "hidden"}</b>
              </div>
            </div>

            <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 8 }}>
              <div>
                Team A card points: <b>{matchState.score.cardPointsA}</b>
              </div>
              <div>
                Team B card points: <b>{matchState.score.cardPointsB}</b>
              </div>
              <div>
                Completed tricks: <b>{matchState.round.completedTricks.length}</b>
              </div>
              <div>
                Version: <b>{matchState.version}</b>
              </div>
            </div>
          </div>

          <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 8, marginBottom: 12 }}>
            <b>Current Trick</b>
            {matchState.round.currentTrick.length === 0 ? (
              <div>None</div>
            ) : (
              <ul>
                {matchState.round.currentTrick.map((entry) => (
                  <li key={`${entry.seat}-${entry.card.suit}-${entry.card.rank}`}>
                    {seatLabel[entry.seat]}: {entry.card.rank}
                    {suitSymbol[entry.card.suit]}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {matchState.round.phase === "auction" ? (
              <form onSubmit={onBid} style={{ display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap" }}>
                <label>
                  Bid
                  <input
                    type="number"
                    min={14}
                    max={28}
                    value={bidValue}
                    onChange={(e) => setBidValue(Number(e.target.value))}
                    style={{ marginLeft: 8, width: 80 }}
                  />
                </label>
                <button type="submit" disabled={pending}>
                  Place Bid
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    sendIntent({
                      action: "pass_bid",
                      match_id: matchState.match_id,
                      actor_id: actorId,
                      request_id: crypto.randomUUID(),
                      expected_version: matchState.version
                    })
                  }
                >
                  Pass
                </button>
              </form>
            ) : null}

            {matchState.round.phase === "trump_selection" ? (
              <div style={{ display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap" }}>
                <label>
                  Trump Suit
                  <select value={trumpSuit} onChange={(e) => setTrumpSuit(e.target.value as Card["suit"])} style={{ marginLeft: 8 }}>
                    <option value="hearts">hearts</option>
                    <option value="diamonds">diamonds</option>
                    <option value="clubs">clubs</option>
                    <option value="spades">spades</option>
                  </select>
                </label>
                <label>
                  Hidden Rank
                  <select value={trumpRank} onChange={(e) => setTrumpRank(e.target.value as Card["rank"])} style={{ marginLeft: 8 }}>
                    <option value="J">J</option>
                    <option value="9">9</option>
                    <option value="A">A</option>
                    <option value="10">10</option>
                    <option value="K">K</option>
                    <option value="Q">Q</option>
                    <option value="8">8</option>
                    <option value="7">7</option>
                  </select>
                </label>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    sendIntent({
                      action: "choose_trump",
                      match_id: matchState.match_id,
                      actor_id: actorId,
                      request_id: crypto.randomUUID(),
                      expected_version: matchState.version,
                      trump_suit: trumpSuit,
                      hidden_trump_rank: trumpRank
                    })
                  }
                >
                  Confirm Trump
                </button>
              </div>
            ) : null}

            {(matchState.round.phase === "play_before_trump" || matchState.round.phase === "play_after_trump") && mySeat !== null ? (
              <div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                  {myHand.map((card) => (
                    <button
                      key={`${card.suit}-${card.rank}`}
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        sendIntent({
                          action: "play_card",
                          match_id: matchState.match_id,
                          actor_id: actorId,
                          request_id: crypto.randomUUID(),
                          expected_version: matchState.version,
                          card
                        })
                      }
                    >
                      {card.rank}
                      {suitSymbol[card.suit]}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    sendIntent({
                      action: "request_trump_reveal",
                      match_id: matchState.match_id,
                      actor_id: actorId,
                      request_id: crypto.randomUUID(),
                      expected_version: matchState.version
                    })
                  }
                >
                  Request Trump Reveal
                </button>
              </div>
            ) : null}

            <button type="button" disabled={pending} onClick={() => refreshMatch(matchState.match_id)}>
              Refresh Match State
            </button>
          </div>
        </section>
      ) : null}
    </main>
  );
}
