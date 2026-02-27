import { FormEvent, ReactElement, useEffect, useMemo, useState } from 'react';
import { createGuest, getCurrentUser, updateNickname } from './lib/api';
import { clearSession, getStoredSession, saveSession } from './lib/session';
import { GuestSession } from './lib/types';

type Status = 'idle' | 'loading' | 'saving' | 'error';

function statusText(status: Status): string {
  if (status === 'loading') {
    return 'Creating guest profile...';
  }

  if (status === 'saving') {
    return 'Updating nickname...';
  }

  return '';
}

export function App(): ReactElement {
  const [session, setSession] = useState<GuestSession | null>(null);
  const [nicknameInput, setNicknameInput] = useState('');
  const [editNicknameInput, setEditNicknameInput] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string>('');

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
        saveSession(refreshedSession);
      })
      .catch(() => {
        clearSession();
        setSession(null);
      })
      .finally(() => {
        setStatus('idle');
      });
  }, []);

  const actionHint = useMemo(() => statusText(status), [status]);

  async function onCreateGuest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('loading');
    setError('');

    try {
      const nextSession = await createGuest(nicknameInput);
      setSession(nextSession);
      setEditNicknameInput(nextSession.nickname);
      setNicknameInput('');
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
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to update nickname.');
      setStatus('error');
      return;
    }

    setStatus('idle');
  }

  function onClearSession() {
    clearSession();
    setSession(null);
    setEditNicknameInput('');
    setError('');
    setStatus('idle');
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-table to-emerald-900 text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center px-6 py-12">
        {!session ? (
          <section className="w-full rounded-2xl bg-white/10 p-8 shadow-2xl backdrop-blur-sm">
            <p className="text-sm uppercase tracking-[0.2em] text-amber-200">Phase 02</p>
            <h1 className="mt-2 text-4xl font-bold">Guest Onboarding</h1>
            <p className="mt-3 max-w-2xl text-emerald-100">
              Enter a nickname or continue with an auto-generated guest name. Your unique user ID will
              be created automatically.
            </p>

            <form className="mt-8 flex flex-col gap-4 sm:flex-row" onSubmit={onCreateGuest}>
              <input
                className="w-full rounded-lg border border-white/30 bg-black/20 px-4 py-3 text-base text-white outline-none ring-0 placeholder:text-white/50 focus:border-amber-400"
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
        ) : (
          <section className="w-full rounded-2xl bg-white/10 p-8 shadow-2xl backdrop-blur-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-amber-200">Guest Profile</p>
                <h1 className="mt-2 text-3xl font-bold">Welcome, {session.nickname}</h1>
                <p className="mt-2 text-emerald-100">You are ready to join a lobby.</p>
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
              <p className="mt-2 font-mono text-sm break-all text-emerald-100">{session.userId}</p>
            </div>

            <form className="mt-6 flex flex-col gap-4 sm:flex-row" onSubmit={onUpdateNickname}>
              <input
                className="w-full rounded-lg border border-white/30 bg-black/20 px-4 py-3 text-base text-white outline-none ring-0 placeholder:text-white/50 focus:border-amber-400"
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
                Save Nickname
              </button>
            </form>

            {actionHint ? <p className="mt-4 text-sm text-emerald-100">{actionHint}</p> : null}
            {error ? <p className="mt-4 text-sm text-rose-200">{error}</p> : null}
          </section>
        )}
      </div>
    </main>
  );
}
