import { pcApiEndpoint, reportPcApiFailure } from './pcDiagnostics';

const configuredApiUrl = import.meta.env.VITE_APP_API_URL;

export const API_BASE_URL = (configuredApiUrl || 'http://localhost:3000').replace(/\/+$/, '');

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const endpoint = pcApiEndpoint(path);
  const requestId = endpoint ? crypto.randomUUID() : '';
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(endpoint ? { 'X-NoPlan-Request-Id': requestId, 'X-NoPlan-Client': 'pc-web' } : {}),
        ...(init?.headers || {}),
      },
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = data && typeof data === 'object' && 'message' in data
        ? String(data.message || 'API request failed.')
        : 'API request failed.';
      throw new ApiError(message, response.status, data);
    }

    return data as T;
  } catch (cause) {
    if (endpoint && !(cause instanceof Error && cause.name === 'AbortError')) reportPcApiFailure(endpoint, requestId, cause, cause instanceof ApiError ? cause.status : undefined);
    throw cause;
  }
}

export function storeLoggedInUser(user: { id: string; nickname?: string; profileURL?: string }) {
  const session = {
    userId: user.id,
    userNick: user.nickname || user.id,
    profileURL: user.profileURL || '',
  };
  localStorage.setItem('loggedInUser', JSON.stringify(session));
  return session;
}

export function getLoggedInUser() {
  const savedUser = localStorage.getItem('loggedInUser');

  if (!savedUser) return null;

  try {
    return JSON.parse(savedUser);
  } catch {
    return null;
  }
}
