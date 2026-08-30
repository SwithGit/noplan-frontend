import type { UserSession } from '../types/noplan';
import { ApiError, apiJson, storeLoggedInUser } from './client';

interface AuthUser {
  id: string;
  nickname?: string;
  profileURL?: string;
}

export async function fetchAuthSession(): Promise<UserSession | null | undefined> {
  try {
    const result = await apiJson<{ success?: boolean; user?: AuthUser }>('/api/auth/session');
    if (!result.success || !result.user?.id) return null;
    return storeLoggedInUser(result.user);
  } catch (error) {
    // 새 프론트를 먼저 배포할 때 구 백엔드가 아직 /session을 모르면 현재 화면 상태를 유지합니다.
    if (error instanceof ApiError && error.status === 404) return undefined;
    return null;
  }
}

export async function logoutSession() {
  try {
    await apiJson('/api/auth/logout', { method: 'POST' });
  } finally {
    localStorage.removeItem('loggedInUser');
  }
}

export async function createOAuthState(provider: 'google' | 'kakao' | 'naver') {
  try {
    const result = await apiJson<{ success?: boolean; state?: string }>(`/api/auth/oauth-state/${provider}`);
    if (!result.success || !result.state) throw new Error('소셜 로그인을 시작하지 못했습니다.');
    return result.state;
  } catch (error) {
    // 배포 전환 중 구 백엔드는 state 발급 API가 없지만 소셜 제공자에는 임시 state를 보냅니다.
    if (error instanceof ApiError && error.status === 404) return crypto.randomUUID();
    throw error;
  }
}
