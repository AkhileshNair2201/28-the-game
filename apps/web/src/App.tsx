import { FormEvent, ReactElement, useEffect, useMemo, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  createGuest,
  createLobby,
  deleteLobby,
  getCurrentUser,
  getLobbySocketUrl,
  joinLobby,
  setLobbyReady,
  updateNickname
} from './lib/api';
import { clearSession, getStoredSession, saveSession } from './lib/session';
import { GuestSession, LobbyView } from './lib/types';

type Status = 'idle' | 'loading' | 'saving' | 'error';
type Screen = 'onboarding' | 'profile' | 'lobby';

function statusText(status: Status): string {
  if (status === 'loading') {
    return 'Processing request...';
  }

  if (status === 'saving') {
    return 'Saving changes...';
  }

  return '';
}

export function App(): ReactElement {
  const [session, setSession] = useState<GuestSession | null>(null);
  const [screen, setScreen] = useState<Screen>('onboarding');
  const [lobby, setLobby] = useState<LobbyView | null>(null);
  const [nicknameInput, setNicknameInput] = useState('');
  const [editNicknameInput, setEditNicknameInput] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [presenceMessage, setPresenceMessage] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

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

  const actionHint = useMemo(() => statusText(status), [status]);

  useEffect(() => {
    if (!session || !lobby || screen !== 'lobby') {
      setIsSocketConnected(false);
      setPresenceMessage('');
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
      setIsSocketConnected(true);
      socket.emit('lobby_subscribe', { roomCode: lobby.roomCode });
    });

    socket.on('disconnect', () => {
      setIsSocketConnected(false);
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
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to create guest user.');
      setStatus('error');
      return;
    }

    setStatus('idle');
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
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to update nickname.');
      setStatus('error');
      return;
    }

    setStatus('idle');
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
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to create lobby.');
      setStatus('error');
      return;
    }

    setStatus('idle');
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
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to join lobby.');
      setStatus('error');
      return;
    }

    setStatus('idle');
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
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to delete lobby.');
      setStatus('error');
      return;
    }

    setStatus('idle');
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
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to update ready state.');
      setStatus('error');
      return;
    }

    setStatus('idle');
  }

  function onClearSession() {
    clearSession();
    setSession(null);
    setLobby(null);
    setEditNicknameInput('');
    setRoomCodeInput('');
    setError('');
    setStatus('idle');
    setScreen('onboarding');
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-table to-emerald-900 text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center px-6 py-12">
        {screen === 'onboarding' ? (
          <section className="w-full rounded-2xl bg-white/10 p-8 shadow-2xl backdrop-blur-sm">
            <p className="text-sm uppercase tracking-[0.2em] text-amber-200">Phase 02</p>
            <h1 className="mt-2 text-4xl font-bold">Guest Onboarding</h1>
            <p className="mt-3 max-w-2xl text-emerald-100">
              Enter a nickname or continue with an auto-generated guest name. Your unique user ID will
              be created automatically.
            </p>

            <form className="mt-8 flex flex-col gap-4 sm:flex-row" onSubmit={onCreateGuest}>
              <input
                className="w-full rounded-lg border border-white/30 bg-black/20 px-4 py-3 text-base text-white outline-none placeholder:text-white/50 focus:border-amber-400"
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
          <section className="w-full rounded-2xl bg-white/10 p-8 shadow-2xl backdrop-blur-sm">
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

            <div className="mt-6 rounded-xl border border-white/20 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-wider text-white/70">Unique User ID (Read Only)</p>
              <p className="mt-2 break-all font-mono text-sm text-emerald-100">{session.userId}</p>
            </div>

            <form className="mt-6 flex flex-col gap-4 sm:flex-row" onSubmit={onUpdateNickname}>
              <input
                className="w-full rounded-lg border border-white/30 bg-black/20 px-4 py-3 text-base text-white outline-none placeholder:text-white/50 focus:border-amber-400"
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
          <section className="w-full rounded-2xl bg-white/10 p-8 shadow-2xl backdrop-blur-sm">
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
                    className="w-full rounded-lg border border-white/30 bg-black/20 px-4 py-3 text-base uppercase text-white outline-none placeholder:text-white/50 focus:border-amber-400"
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
              <div className="mt-6 rounded-xl border border-white/20 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-wider text-white/70">Active Lobby</p>
                <p className="mt-2 text-xl font-semibold">Room: {lobby.roomCode}</p>
                <p className="mt-2 text-sm text-emerald-100">
                  Realtime: {isSocketConnected ? 'Connected' : 'Disconnected'}
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
                    className="mt-4 rounded-lg border border-rose-300/60 px-4 py-2 text-sm text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Delete Lobby
                  </button>
                ) : null}
              </div>
            )}

            {actionHint ? <p className="mt-4 text-sm text-emerald-100">{actionHint}</p> : null}
            {presenceMessage ? <p className="mt-2 text-xs text-emerald-200">{presenceMessage}</p> : null}
            {error ? <p className="mt-4 text-sm text-rose-200">{error}</p> : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}
