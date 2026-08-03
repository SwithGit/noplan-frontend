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
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
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
