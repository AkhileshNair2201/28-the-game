import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  applyMatchIntent,
  createGuest,
  createLobby,
  deleteLobby,
  getCurrentUser,
  getLobbySocketUrl,
  getMatchState,
  getMatchStateByRoom,
  joinLobby,
  setLobbyReady,
  startMatch,
  updateNickname
} from './lib/api';
import { clearSession, getStoredSession, saveSession } from './lib/session';
import {
  GuestSession,
  LobbyView,
  MatchCard,
  MatchPlayer,
  MatchSeat,
  ProjectedMatchState
} from './lib/types';

type Status = 'idle' | 'loading' | 'saving' | 'error';
type Screen = 'onboarding' | 'profile' | 'lobby' | 'table';
type RelativeSeat = 'self' | 'left' | 'top' | 'right';

const SUIT_SYMBOL: Record<string, string> = {
  S: '♠',
  H: '♥',
  D: '♦',
  C: '♣'
};

function statusText(status: Status): string {
  if (status === 'loading') {
    return 'Processing request...';
  }

  if (status === 'saving') {
    return 'Saving changes...';
  }

  return '';
}

function relativeSeat(viewerSeat: MatchSeat, seat: MatchSeat): RelativeSeat {
  const delta = (seat - viewerSeat + 4) % 4;

  if (delta === 0) {
    return 'self';
  }

  if (delta === 1) {
    return 'right';
  }

  if (delta === 2) {
    return 'top';
  }

  return 'left';
}

function seatLabel(seat: MatchSeat): string {
  return `Seat ${seat}`;
}

function getLegalCards(match: ProjectedMatchState): MatchCard[] {
  const viewer = match.players.find((player) => player.userId === match.viewerUserId);
  if (!viewer) {
    return [];
  }

  const phase = match.roundState.phase;
  if (phase !== 'play_before_trump' && phase !== 'play_after_trump') {
    return [];
  }

  if (match.roundState.currentTurnSeat !== viewer.seat) {
    return [];
  }

  const hand = match.roundState.hands[viewer.seat].visibleCards;
  const leadSuit = match.roundState.currentTrick[0]?.card.suit;

  if (!leadSuit) {
    return hand;
  }

  const followSuitCards = hand.filter((card) => card.suit === leadSuit);
  return followSuitCards.length > 0 ? followSuitCards : hand;
}

function CardFace({ card, compact = false }: { card: MatchCard; compact?: boolean }) {
  const isRed = card.suit === 'H' || card.suit === 'D';

  return (
    <div
      className={`card-face ${compact ? 'h-16 w-12 text-sm' : 'h-24 w-16 text-lg'} ${
        isRed ? 'text-red-600' : 'text-slate-900'
      }`}
    >
      <span>{card.rank}</span>
      <span>{SUIT_SYMBOL[card.suit]}</span>
    </div>
  );
}

function HiddenCards({ count }: { count: number }) {
  const renderCount = Math.min(Math.max(count, 0), 4);

  return (
    <div className="relative h-16 w-16">
      {Array.from({ length: renderCount }).map((_, index) => (
        <div
          key={index}
          className="card-back absolute h-16 w-12"
          style={{ left: `${index * 8}px`, zIndex: index }}
        />
      ))}
      <span className="absolute -bottom-5 left-0 text-xs text-emerald-100/90">{count} cards</span>
    </div>
  );
}

function PlayerSeatPanel({
  player,
  relative,
  isTurn,
  isDealer,
  isBidder,
  trickCount,
  points
}: {
  player: MatchPlayer;
  relative: RelativeSeat;
  isTurn: boolean;
  isDealer: boolean;
  isBidder: boolean;
  trickCount: number;
  points: number;
}) {
  return (
    <div className={`seat-panel seat-${relative} ${isTurn ? 'ring-2 ring-amber-300' : ''}`}>
      <p className="text-sm font-semibold text-white">{player.nickname}</p>
      <p className="text-[11px] text-emerald-100/90">{seatLabel(player.seat)}</p>
      <div className="mt-1 flex gap-2 text-[11px] text-emerald-100/90">
        <span>{`Team ${player.team}`}</span>
        {isDealer ? <span>Dealer</span> : null}
        {isBidder ? <span>Bidder</span> : null}
      </div>
      <p className="mt-1 text-[11px] text-emerald-100/90">Tricks: {trickCount} | Points: {points}</p>
    </div>
  );
}

export function App() {
  const [session, setSession] = useState<GuestSession | null>(null);
  const [screen, setScreen] = useState<Screen>('onboarding');
  const [lobby, setLobby] = useState<LobbyView | null>(null);
  const [match, setMatch] = useState<ProjectedMatchState | null>(null);
  const [nicknameInput, setNicknameInput] = useState('');
  const [editNicknameInput, setEditNicknameInput] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [presenceMessage, setPresenceMessage] = useState('');
  const [tableMessage, setTableMessage] = useState('');
  const [isLobbySocketConnected, setIsLobbySocketConnected] = useState(false);
  const [isMatchSocketConnected, setIsMatchSocketConnected] = useState(false);
  const [dealAnimKey, setDealAnimKey] = useState(0);
  const [bidAnimSeat, setBidAnimSeat] = useState<MatchSeat | null>(null);
  const [trickCollectSeat, setTrickCollectSeat] = useState<MatchSeat | null>(null);
  const [selectedTrumpCardId, setSelectedTrumpCardId] = useState('');
  const [selectedBid, setSelectedBid] = useState(14);
  const [isIntentPending, setIsIntentPending] = useState(false);

  const previousMatchRef = useRef<ProjectedMatchState | null>(null);
  const actionHint = useMemo(() => statusText(status), [status]);

  function applyIncomingMatch(next: ProjectedMatchState) {
    const previous = previousMatchRef.current;

    if (!previous) {
      setDealAnimKey((value) => value + 1);
      setSelectedTrumpCardId('');
      setSelectedBid(14);
    } else {
      if (next.roundState.bidValue !== previous.roundState.bidValue && next.roundState.bidderSeat !== null) {
        setBidAnimSeat(next.roundState.bidderSeat);
        window.setTimeout(() => setBidAnimSeat(null), 900);
      }

      if (
        next.roundState.completedTricksCount > previous.roundState.completedTricksCount &&
        next.roundState.currentTurnSeat !== undefined
      ) {
        setTrickCollectSeat(next.roundState.currentTurnSeat);
        window.setTimeout(() => setTrickCollectSeat(null), 750);
      }
    }

    previousMatchRef.current = next;
    setMatch(next);
  }

  useEffect(() => {
    const storedSession = getStoredSession();
    if (!storedSession) {
      return;
    }

    setStatus('loading');
    getCurrentUser(storedSession.token)
      .then((currentUser) => {
        const refreshedSession: GuestSession = {
          ...storedSession,
          nickname: currentUser.nickname,
          isGuest: currentUser.isGuest
        };

        setSession(refreshedSession);
        setEditNicknameInput(refreshedSession.nickname);
        setScreen('profile');
        saveSession(refreshedSession);
      })
      .catch(() => {
        clearSession();
        setSession(null);
        setScreen('onboarding');
      })
      .finally(() => {
        setStatus('idle');
      });
  }, []);

  useEffect(() => {
    if (!session || !lobby || screen !== 'lobby') {
      setIsLobbySocketConnected(false);
      return;
    }

    const socket: Socket = io(`${getLobbySocketUrl()}/lobby`, {
      auth: {
        token: session.token
      },
      transports: ['websocket']
    });

    const pingTimer = window.setInterval(() => {
      socket.emit('presence_ping');
    }, 10_000);

    socket.on('connect', () => {
      setIsLobbySocketConnected(true);
      socket.emit('lobby_subscribe', { roomCode: lobby.roomCode });
    });

    socket.on('disconnect', () => {
      setIsLobbySocketConnected(false);
    });

    socket.on('lobby_snapshot', (event: { lobby: LobbyView }) => {
      setLobby(event.lobby);
    });

    socket.on('player_joined', (event: { lobby: LobbyView }) => {
      setLobby(event.lobby);
    });

    socket.on('ready_updated', (event: { lobby: LobbyView }) => {
      setLobby(event.lobby);
    });

    socket.on('player_left', (event: { userId: string }) => {
      setPresenceMessage(`Player disconnected: ${event.userId}`);
    });

    socket.on('lobby_deleted', (event: { roomCode: string }) => {
      if (event.roomCode === lobby.roomCode) {
        setLobby(null);
        setPresenceMessage('Lobby was deleted by owner.');
      }
    });

    return () => {
      window.clearInterval(pingTimer);
      socket.disconnect();
    };
  }, [session, lobby?.roomCode, screen]);

  useEffect(() => {
    if (!session || !match || screen !== 'table') {
      setIsMatchSocketConnected(false);
      return;
    }

    const socket: Socket = io(`${getLobbySocketUrl()}/match`, {
      auth: {
        token: session.token
      },
      transports: ['websocket']
    });

    socket.on('connect', () => {
      setIsMatchSocketConnected(true);
      socket.emit('match_subscribe', { matchId: match.matchId });
    });

    socket.on('disconnect', () => {
      setIsMatchSocketConnected(false);
    });

    const onMatchEvent = (event: ProjectedMatchState | { state?: ProjectedMatchState }) => {
      if ('state' in event && event.state) {
        applyIncomingMatch(event.state);
        return;
      }

      applyIncomingMatch(event as ProjectedMatchState);
    };

    socket.on('match_state_delta', onMatchEvent);
    socket.on('match_action_applied', onMatchEvent);

    return () => {
      socket.disconnect();
    };
  }, [session, match?.matchId, screen]);

  useEffect(() => {
    if (!session || !match || screen !== 'table') {
      return;
    }

    const syncTimer = window.setInterval(() => {
      void getMatchState(session.token, match.matchId)
        .then((latest) => {
          setMatch((current) => {
            if (!current || latest.version > current.version) {
              previousMatchRef.current = latest;
              return latest;
            }

            return current;
          });
        })
        .catch(() => {
          // Realtime stream is primary; polling is just a recovery path.
        });
    }, 2500);

    return () => {
      window.clearInterval(syncTimer);
    };
  }, [session, match?.matchId, screen]);

  useEffect(() => {
    if (!session || !lobby || screen !== 'lobby' || lobby.status !== 'in_game') {
      return;
    }

    void getMatchStateByRoom(session.token, lobby.roomCode)
      .then((projected) => {
        applyIncomingMatch(projected);
        setScreen('table');
      })
      .catch(() => {
        setPresenceMessage('Match started. Enter table once state is available.');
      });
  }, [session, lobby?.status, lobby?.roomCode, screen]);

  function onClearSession() {
    clearSession();
    setSession(null);
    setLobby(null);
    setMatch(null);
    previousMatchRef.current = null;
    setEditNicknameInput('');
    setRoomCodeInput('');
    setError('');
    setStatus('idle');
    setScreen('onboarding');
  }

  async function onCreateGuest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('loading');
    setError('');

    try {
      const nextSession = await createGuest(nicknameInput);
      setSession(nextSession);
      setEditNicknameInput(nextSession.nickname);
      setNicknameInput('');
      setScreen('profile');
      saveSession(nextSession);
      setStatus('idle');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to create guest user.');
      setStatus('error');
    }
  }

  async function onUpdateNickname(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      return;
    }

    setStatus('saving');
    setError('');

    try {
      const updatedUser = await updateNickname(session.token, editNicknameInput.trim());
      const updatedSession: GuestSession = {
        ...session,
        nickname: updatedUser.nickname,
        isGuest: updatedUser.isGuest
      };

      setSession(updatedSession);
      saveSession(updatedSession);
      setScreen('lobby');
      setStatus('idle');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to update nickname.');
      setStatus('error');
    }
  }

  async function onCreateLobby() {
    if (!session) {
      return;
    }

    setStatus('loading');
    setError('');

    try {
      const createdLobby = await createLobby(session.token);
      setLobby(createdLobby);
      setStatus('idle');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to create lobby.');
      setStatus('error');
    }
  }

  async function onJoinLobby(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      return;
    }

    setStatus('loading');
    setError('');

    try {
      const joinedLobby = await joinLobby(session.token, roomCodeInput.trim());
      setLobby(joinedLobby);
      setRoomCodeInput('');
      setStatus('idle');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to join lobby.');
      setStatus('error');
    }
  }

  async function onDeleteLobby() {
    if (!session || !lobby) {
      return;
    }

    setStatus('loading');
    setError('');

    try {
      await deleteLobby(session.token, lobby.roomCode);
      setLobby(null);
      setStatus('idle');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to delete lobby.');
      setStatus('error');
    }
  }

  async function onToggleReady(nextReady: boolean) {
    if (!session || !lobby) {
      return;
    }

    setStatus('saving');
    setError('');

    try {
      const updatedLobby = await setLobbyReady(session.token, lobby.roomCode, nextReady);
      setLobby(updatedLobby);
      setStatus('idle');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to update ready state.');
      setStatus('error');
    }
  }

  async function onStartMatch() {
    if (!session || !lobby) {
      return;
    }

    setStatus('loading');
    setError('');

    try {
      const projected = await startMatch(session.token, lobby.roomCode);
      applyIncomingMatch(projected);
      setScreen('table');
      setStatus('idle');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to start match.');
      setStatus('error');
    }
  }

  async function onEnterActiveMatch() {
    if (!session || !lobby) {
      return;
    }

    setStatus('loading');
    setError('');

    try {
      const projected = await getMatchStateByRoom(session.token, lobby.roomCode);
      applyIncomingMatch(projected);
      setScreen('table');
      setStatus('idle');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to open active match.');
      setStatus('error');
    }
  }

  async function onSendIntent(intent: {
    type: 'place_bid' | 'pass_bid' | 'choose_trump' | 'play_card' | 'request_trump_reveal' | 'declare_pair';
    payload: {
      bid_value?: number;
      suit?: 'S' | 'H' | 'D' | 'C';
      hidden_card_id?: string;
      card_id?: string;
    };
  }) {
    if (!session || !match) {
      return;
    }

    if (isIntentPending) {
      return;
    }

    setIsIntentPending(true);
    setStatus('saving');
    setError('');
    setTableMessage('');

    try {
      const result = await applyMatchIntent(session.token, match.matchId, {
        request_id: crypto.randomUUID(),
        expected_version: match.version,
        type: intent.type,
        payload: intent.payload
      });

      applyIncomingMatch(result.state);
      setStatus('idle');
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Intent rejected.';

      if (message.includes('Version conflict')) {
        try {
          const freshState = await getMatchState(session.token, match.matchId);
          applyIncomingMatch(freshState);
          setTableMessage('Action already processed. Synced latest state, please retry if needed.');
          setStatus('idle');
          return;
        } catch {
          setTableMessage('Version conflict detected and state refresh failed. Please reopen table.');
          setStatus('error');
          return;
        }
      }

      setTableMessage(message);
      setStatus('error');
    } finally {
      setIsIntentPending(false);
    }
  }

  const viewer = useMemo(() => {
    if (!match) {
      return null;
    }

    return match.players.find((player) => player.userId === match.viewerUserId) ?? null;
  }, [match]);

  const legalCards = useMemo(() => {
    if (!match) {
      return [];
    }

    return getLegalCards(match);
  }, [match]);

  const legalCardIds = useMemo(() => new Set(legalCards.map((card) => card.id)), [legalCards]);

  const bidOptions = useMemo(() => {
    if (!match) {
      return [];
    }

    const currentBid = match.roundState.bidValue;
    const minimum = currentBid === null ? 14 : currentBid + 1;
    const options: number[] = [];

    for (let value = minimum; value <= 28; value += 1) {
      options.push(value);
    }

    return options;
  }, [match]);

  useEffect(() => {
    if (bidOptions.length === 0) {
      return;
    }

    if (!bidOptions.includes(selectedBid)) {
      const firstOption = bidOptions[0];
      if (typeof firstOption === 'number') {
        setSelectedBid(firstOption);
      }
    }
  }, [bidOptions, selectedBid]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#0b5f45,_#04251b_65%)] text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-8 sm:px-6">
        {screen === 'onboarding' ? (
          <section className="w-full rounded-3xl border border-white/20 bg-black/20 p-8 shadow-2xl backdrop-blur-sm">
            <p className="text-sm uppercase tracking-[0.2em] text-amber-200">Phase 02</p>
            <h1 className="mt-2 text-4xl font-bold">Guest Onboarding</h1>
            <p className="mt-3 max-w-2xl text-emerald-100">
              Enter a nickname or continue with an auto-generated guest name. Your unique user ID will be
              created automatically.
            </p>

            <form className="mt-8 flex flex-col gap-4 sm:flex-row" onSubmit={onCreateGuest}>
              <input
                className="w-full rounded-lg border border-white/30 bg-black/30 px-4 py-3 text-base text-white outline-none placeholder:text-white/50 focus:border-amber-400"
                placeholder="Nickname (optional)"
                value={nicknameInput}
                onChange={(event) => setNicknameInput(event.target.value)}
                maxLength={20}
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="rounded-lg bg-amber-400 px-5 py-3 font-semibold text-slate-900 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Continue as Guest
              </button>
            </form>

            {actionHint ? <p className="mt-4 text-sm text-emerald-100">{actionHint}</p> : null}
            {error ? <p className="mt-4 text-sm text-rose-200">{error}</p> : null}
          </section>
        ) : null}

        {screen === 'profile' && session ? (
          <section className="w-full rounded-3xl border border-white/20 bg-black/20 p-8 shadow-2xl backdrop-blur-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-amber-200">Guest Profile</p>
                <h1 className="mt-2 text-3xl font-bold">Welcome, {session.nickname}</h1>
                <p className="mt-2 text-emerald-100">Save nickname to continue to lobby.</p>
              </div>
              <button
                type="button"
                onClick={onClearSession}
                className="rounded-lg border border-white/30 px-4 py-2 text-sm text-white transition hover:bg-white/10"
              >
                Reset Session
              </button>
            </div>

            <div className="mt-6 rounded-xl border border-white/20 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-wider text-white/70">Unique User ID (Read Only)</p>
              <p className="mt-2 break-all font-mono text-sm text-emerald-100">{session.userId}</p>
            </div>

            <form className="mt-6 flex flex-col gap-4 sm:flex-row" onSubmit={onUpdateNickname}>
              <input
                className="w-full rounded-lg border border-white/30 bg-black/30 px-4 py-3 text-base text-white outline-none placeholder:text-white/50 focus:border-amber-400"
                placeholder="Set nickname"
                value={editNicknameInput}
                onChange={(event) => setEditNicknameInput(event.target.value)}
                maxLength={20}
              />
              <button
                type="submit"
                disabled={status === 'saving'}
                className="rounded-lg bg-amber-400 px-5 py-3 font-semibold text-slate-900 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Save & Continue
              </button>
            </form>

            {actionHint ? <p className="mt-4 text-sm text-emerald-100">{actionHint}</p> : null}
            {error ? <p className="mt-4 text-sm text-rose-200">{error}</p> : null}
          </section>
        ) : null}

        {screen === 'lobby' && session ? (
          <section className="w-full rounded-3xl border border-white/20 bg-black/20 p-8 shadow-2xl backdrop-blur-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-amber-200">Lobby</p>
                <h1 className="mt-2 text-3xl font-bold">Hi {session.nickname}</h1>
                <p className="mt-2 text-emerald-100">Create a room or join with a 6-character code.</p>
              </div>
              <button
                type="button"
                onClick={onClearSession}
                className="rounded-lg border border-white/30 px-4 py-2 text-sm text-white transition hover:bg-white/10"
              >
                Reset Session
              </button>
            </div>

            {!lobby ? (
              <>
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={onCreateLobby}
                    disabled={status === 'loading'}
                    className="rounded-lg bg-amber-400 px-5 py-3 font-semibold text-slate-900 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Create Lobby
                  </button>
                </div>

                <form className="mt-6 flex flex-col gap-4 sm:flex-row" onSubmit={onJoinLobby}>
                  <input
                    className="w-full rounded-lg border border-white/30 bg-black/30 px-4 py-3 text-base uppercase text-white outline-none placeholder:text-white/50 focus:border-amber-400"
                    placeholder="Enter room code"
                    value={roomCodeInput}
                    onChange={(event) => setRoomCodeInput(event.target.value)}
                    maxLength={6}
                  />
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="rounded-lg border border-white/40 px-5 py-3 font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Join Lobby
                  </button>
                </form>
              </>
            ) : (
              <div className="mt-6 rounded-xl border border-white/20 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-wider text-white/70">Active Lobby</p>
                <p className="mt-2 text-xl font-semibold">Room: {lobby.roomCode}</p>
                <p className="mt-2 text-sm text-emerald-100">
                  Realtime: {isLobbySocketConnected ? 'Connected' : 'Disconnected'}
                </p>
                <p className="mt-1 text-xs text-emerald-200">Version: {lobby.version}</p>
                <p className="mt-3 text-sm text-emerald-100">Players ({lobby.players.length}/4):</p>
                <ul className="mt-2 space-y-1 text-sm text-emerald-100">
                  {lobby.players.map((player) => (
                    <li key={player.userId}>
                      Seat {player.seat ?? '-'}: {player.nickname}
                      {player.userId === lobby.ownerUserId ? ' (Owner)' : ''}
                      {player.ready ? ' [Ready]' : ' [Not Ready]'}
                    </li>
                  ))}
                </ul>

                {lobby.players.some((player) => player.userId === session.userId) ? (
                  <button
                    type="button"
                    onClick={() => {
                      const currentPlayer = lobby.players.find((player) => player.userId === session.userId);
                      const nextReady = !(currentPlayer?.ready ?? false);
                      void onToggleReady(nextReady);
                    }}
                    disabled={status === 'saving'}
                    className="mt-4 mr-3 rounded-lg border border-emerald-200/70 px-4 py-2 text-sm text-emerald-100 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Toggle Ready
                  </button>
                ) : null}

                {lobby.ownerUserId === session.userId ? (
                  <button
                    type="button"
                    onClick={onDeleteLobby}
                    disabled={status === 'loading'}
                    className="mt-4 mr-3 rounded-lg border border-rose-300/60 px-4 py-2 text-sm text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Delete Lobby
                  </button>
                ) : null}

                {lobby.ownerUserId === session.userId &&
                lobby.players.length === 4 &&
                lobby.players.every((player) => player.ready) &&
                lobby.status === 'waiting' ? (
                  <button
                    type="button"
                    onClick={onStartMatch}
                    disabled={status === 'loading'}
                    className="mt-4 rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Start Match
                  </button>
                ) : null}

                {lobby.status === 'in_game' ? (
                  <button
                    type="button"
                    onClick={onEnterActiveMatch}
                    disabled={status === 'loading'}
                    className="mt-4 rounded-lg border border-white/40 px-4 py-2 text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Enter Match Table
                  </button>
                ) : null}
              </div>
            )}

            {actionHint ? <p className="mt-4 text-sm text-emerald-100">{actionHint}</p> : null}
            {presenceMessage ? <p className="mt-2 text-xs text-emerald-200">{presenceMessage}</p> : null}
            {error ? <p className="mt-4 text-sm text-rose-200">{error}</p> : null}
          </section>
        ) : null}

        {screen === 'table' && session && match && viewer ? (
          <section className="w-full rounded-3xl border border-white/20 bg-black/20 p-4 shadow-2xl backdrop-blur-sm sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Match Table</p>
                <h1 className="text-2xl font-bold">Room {match.roomCode}</h1>
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-100">
                <span>v{match.version}</span>
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                <span>{isMatchSocketConnected ? 'Realtime connected' : 'Realtime disconnected'}</span>
              </div>
              <button
                type="button"
                onClick={() => setScreen('lobby')}
                className="rounded-lg border border-white/30 px-3 py-2 text-sm text-white transition hover:bg-white/10"
              >
                Back to Lobby
              </button>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <div className="rounded-xl border border-white/20 bg-black/25 p-3">
                <p className="text-white/70">Bid</p>
                <p className="text-base font-semibold">{match.roundState.bidValue ?? '--'}</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-black/25 p-3">
                <p className="text-white/70">Trump</p>
                <p className="text-base font-semibold">
                  {match.roundState.trumpRevealed && match.roundState.trumpSuit
                    ? `${SUIT_SYMBOL[match.roundState.trumpSuit]} (${match.roundState.trumpSuit})`
                    : 'Hidden'}
                </p>
              </div>
              <div className="rounded-xl border border-white/20 bg-black/25 p-3">
                <p className="text-white/70">Turn</p>
                <p className="text-base font-semibold">{seatLabel(match.roundState.currentTurnSeat)}</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-black/25 p-3">
                <p className="text-white/70">Score</p>
                <p className="text-base font-semibold">
                  A {match.roundState.matchScore.A} - B {match.roundState.matchScore.B}
                </p>
              </div>
            </div>

            <div className={`table-layout ${dealAnimKey % 2 === 0 ? 'deal-anim-a' : 'deal-anim-b'}`}>
              {match.players.map((player) => {
                const rs = relativeSeat(viewer.seat, player.seat);
                return (
                  <PlayerSeatPanel
                    key={player.userId}
                    player={player}
                    relative={rs}
                    isTurn={player.seat === match.roundState.currentTurnSeat}
                    isDealer={player.seat === match.roundState.dealerSeat}
                    isBidder={player.seat === match.roundState.bidderSeat}
                    trickCount={match.roundState.tricksWon[player.team]}
                    points={match.roundState.cardPointsWon[player.team]}
                  />
                );
              })}

              <div className="table-center">
                <div className="mb-2 text-center text-xs uppercase tracking-widest text-emerald-100/80">
                  Current Trick
                </div>
                <div className="trick-grid">
                  {(['top', 'left', 'right', 'self'] as RelativeSeat[]).map((slot) => {
                    const player = match.players.find((entry) => relativeSeat(viewer.seat, entry.seat) === slot);
                    const play = match.roundState.currentTrick.find((entry) => entry.seat === player?.seat);

                    return (
                      <div key={slot} className={`trick-slot trick-slot-${slot}`}>
                        {play ? <CardFace card={play.card} compact /> : <div className="empty-trick-slot" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {match.players.map((player) => {
                if (player.seat === viewer.seat) {
                  return null;
                }

                return (
                  <div
                    key={`hidden-${player.userId}`}
                    className={`hidden-hand hidden-hand-${relativeSeat(viewer.seat, player.seat)}`}
                  >
                    <HiddenCards count={match.roundState.hands[player.seat].hiddenCount} />
                  </div>
                );
              })}

              <div className="self-hand">
                {match.roundState.hands[viewer.seat].visibleCards.map((card, index) => {
                  const isLegal = legalCardIds.has(card.id);
                  const canPlay =
                    (match.roundState.phase === 'play_before_trump' || match.roundState.phase === 'play_after_trump') &&
                    match.roundState.currentTurnSeat === viewer.seat;

                  return (
                    <button
                      key={card.id}
                      type="button"
                      disabled={isIntentPending || (canPlay && !isLegal)}
                      onClick={() => {
                        if (!canPlay || !isLegal) {
                          return;
                        }

                        void onSendIntent({
                          type: 'play_card',
                          payload: {
                            card_id: card.id
                          }
                        });
                      }}
                      className={`card-button ${isLegal && canPlay ? 'card-legal' : 'card-disabled'} card-deal-${
                        index % 4
                      }`}
                    >
                      <CardFace card={card} />
                    </button>
                  );
                })}
              </div>

              {bidAnimSeat !== null ? (
                <div className={`bid-chip bid-chip-${relativeSeat(viewer.seat, bidAnimSeat)}`}>
                  Bid {match.roundState.bidValue}
                </div>
              ) : null}

              {trickCollectSeat !== null ? (
                <div className={`trick-collect trick-collect-${relativeSeat(viewer.seat, trickCollectSeat)}`}>+ Trick</div>
              ) : null}
            </div>

            <div className="mt-4 rounded-xl border border-white/20 bg-black/25 p-4">
              <p className="text-sm font-semibold text-emerald-100">Actions</p>
              <p className="mt-1 text-xs text-emerald-200">
                {match.roundState.currentTurnSeat === viewer.seat
                  ? 'Your turn'
                  : `Waiting for ${seatLabel(match.roundState.currentTurnSeat)}`}
              </p>

              {match.roundState.phase === 'auction' ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select
                    className="rounded-md border border-white/30 bg-black/40 px-2 py-2 text-sm"
                    value={selectedBid}
                    onChange={(event) => setSelectedBid(Number(event.target.value))}
                    disabled={isIntentPending || match.roundState.currentTurnSeat !== viewer.seat}
                  >
                    {bidOptions.map((bid) => (
                      <option key={bid} value={bid}>
                        {bid}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={
                      isIntentPending ||
                      match.roundState.currentTurnSeat !== viewer.seat ||
                      bidOptions.length === 0
                    }
                    onClick={() =>
                      void onSendIntent({
                        type: 'place_bid',
                        payload: { bid_value: selectedBid }
                      })
                    }
                    className="rounded-md bg-amber-400 px-3 py-2 text-sm font-semibold text-slate-900 disabled:opacity-40"
                  >
                    Place Bid
                  </button>
                  <button
                    type="button"
                    disabled={isIntentPending || match.roundState.currentTurnSeat !== viewer.seat}
                    onClick={() =>
                      void onSendIntent({
                        type: 'pass_bid',
                        payload: {}
                      })
                    }
                    className="rounded-md border border-white/30 px-3 py-2 text-sm text-white disabled:opacity-40"
                  >
                    Pass
                  </button>
                </div>
              ) : null}

              {match.roundState.phase === 'choose_trump' ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select
                    className="rounded-md border border-white/30 bg-black/40 px-2 py-2 text-sm"
                    value={selectedTrumpCardId}
                    onChange={(event) => setSelectedTrumpCardId(event.target.value)}
                    disabled={isIntentPending || match.roundState.currentTurnSeat !== viewer.seat}
                  >
                    <option value="">Choose hidden trump card</option>
                    {match.roundState.hands[viewer.seat].visibleCards.map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.rank}
                        {SUIT_SYMBOL[card.suit]} ({card.suit})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={
                      isIntentPending ||
                      match.roundState.currentTurnSeat !== viewer.seat ||
                      !selectedTrumpCardId
                    }
                    onClick={() => {
                      const selectedCard = match.roundState.hands[viewer.seat].visibleCards.find(
                        (card) => card.id === selectedTrumpCardId
                      );

                      if (!selectedCard) {
                        return;
                      }

                      void onSendIntent({
                        type: 'choose_trump',
                        payload: {
                          hidden_card_id: selectedCard.id,
                          suit: selectedCard.suit
                        }
                      });
                    }}
                    className="rounded-md bg-amber-400 px-3 py-2 text-sm font-semibold text-slate-900 disabled:opacity-40"
                  >
                    Confirm Trump
                  </button>
                </div>
              ) : null}

              {(match.roundState.phase === 'play_before_trump' || match.roundState.phase === 'play_after_trump') &&
              match.roundState.currentTurnSeat === viewer.seat ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isIntentPending}
                    onClick={() =>
                      void onSendIntent({
                        type: 'request_trump_reveal',
                        payload: {}
                      })
                    }
                    className="rounded-md border border-white/30 px-3 py-2 text-sm text-white disabled:opacity-40"
                  >
                    Request Trump Reveal
                  </button>
                  <button
                    type="button"
                    disabled={isIntentPending}
                    onClick={() =>
                      void onSendIntent({
                        type: 'declare_pair',
                        payload: {}
                      })
                    }
                    className="rounded-md border border-white/30 px-3 py-2 text-sm text-white disabled:opacity-40"
                  >
                    Declare Pair
                  </button>
                </div>
              ) : null}

              {match.roundState.phase === 'round_end' ? (
                <p className="mt-3 text-sm text-amber-200">
                  Round complete. Winner team: {match.roundState.roundWinnerTeam ?? '--'} | Bid
                  success: {String(match.roundState.roundBidSucceeded)}
                </p>
              ) : null}

              {tableMessage ? <p className="mt-3 text-sm text-rose-200">{tableMessage}</p> : null}
            </div>

            {actionHint ? <p className="mt-3 text-sm text-emerald-100">{actionHint}</p> : null}
            {error ? <p className="mt-2 text-sm text-rose-200">{error}</p> : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}
