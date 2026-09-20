import { apiJson } from './client';

export type SignupProvider = 'google' | 'kakao' | 'naver';
export interface SignupOptions {
  available: boolean;
  phoneAvailable: boolean;
  policyVersion: string;
  documents: { terms: string; privacy: string; marketing: string };
}
export interface SignupProfile { name?: string; nickname?: string; email?: string; phone?: string; birthdate?: string; gender?: string }
export interface SignupSubmission extends SignupProfile {
  id?: string; pw?: string; registrationToken?: string; phoneToken: string;
  agreements: { terms: boolean; privacy: boolean; marketing: boolean; version: string };
}
const post = <T>(path: string, body: unknown) => apiJson<T>(path, { method: 'POST', body: JSON.stringify(body) });
export const getSignupOptions = () => apiJson<SignupOptions>('/api/auth/signup-options');
export const checkSignupId = (id: string) => post<{ available: boolean }>('/api/auth/check-id', { id });
export const sendSignupCode = (phone: string) => post<{ challengeId: string; expiresAt: number; retryAt: number }>('/api/auth/phone/send', { phone });
export const verifySignupCode = (phone: string, challengeId: string, code: string) => post<{ phoneToken: string; expiresAt: number }>('/api/auth/phone/verify', { phone, challengeId, code });
export const completeSignup = (body: SignupSubmission, provider?: SignupProvider) => post<{ success: boolean; user: { id: string; nickname?: string; profileURL?: string } }>(provider === 'naver' ? '/api/auth/naver-register' : provider ? `/api/auth/${provider}/${provider}-register` : '/api/auth/signup', body);
