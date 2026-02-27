import { GuestSession, LobbyView, PublicUser } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api';

interface ApiErrorPayload {
  message?: string | string[];
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const mergedHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init?.headers ?? {})
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: mergedHeaders
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
    const message = Array.isArray(payload.message)
      ? payload.message.join(', ')
      : payload.message ?? `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return (await response.json()) as T;
}

export function createGuest(nickname: string): Promise<GuestSession> {
  const payload = nickname.trim() ? { nickname: nickname.trim() } : {};

  return fetchJson<GuestSession>('/auth/guest', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateNickname(token: string, nickname: string): Promise<PublicUser> {
  return fetchJson<PublicUser>('/users/me/nickname', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ nickname })
  });
}

export function getCurrentUser(token: string): Promise<PublicUser> {
  return fetchJson<PublicUser>('/users/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function createLobby(token: string): Promise<LobbyView> {
  return fetchJson<LobbyView>('/lobbies', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function joinLobby(token: string, roomCode: string): Promise<LobbyView> {
  return fetchJson<LobbyView>(`/lobbies/${roomCode}/join`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function getLobby(token: string, roomCode: string): Promise<LobbyView> {
  return fetchJson<LobbyView>(`/lobbies/${roomCode}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function deleteLobby(token: string, roomCode: string): Promise<{ deleted: boolean; roomCode: string }> {
  return fetchJson<{ deleted: boolean; roomCode: string }>(`/lobbies/${roomCode}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}
