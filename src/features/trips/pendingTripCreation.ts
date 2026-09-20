import { ApiError } from '../../api/client';
import { getTrip, saveTrip } from '../../api/tripsApi';
import { sameDocument } from './mergeTrip';
import type { TripRecord } from './tripModel';
import type { TripCreationDraft } from './tripCreationDraft';

export interface PendingTripCreation {
  trip: TripRecord; draft: TripCreationDraft; expiresAt: number;
  sourceUserId?: string; accountId?: string; focusDayId?: string; focusBlockId?: string;
}
const storageKey = 'noplan.trip.pendingCreation.v1';
let memory: PendingTripCreation | null = null;
const requests = new Map<string, Promise<TripRecord>>();

export function queueTripCreation(value: Omit<PendingTripCreation, 'expiresAt'>) {
  memory = { ...value, expiresAt: Date.now() + 2 * 60 * 60 * 1000 };
  try { sessionStorage.setItem(storageKey, JSON.stringify(memory)); } catch { /* Same-page login still works. */ }
  return memory;
}
export function readPendingTripCreation(): PendingTripCreation | null {
  try {
    const value = memory || JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    if (value?.expiresAt > Date.now() && typeof value.trip?.id === 'string' && value.trip.version === 0
      && Array.isArray(value.trip.document?.days) && value.trip.document.days.length && typeof value.draft?.destination === 'string') return value;
  } catch { /* Ignore malformed or unavailable storage. */ }
  clearPendingTripCreation();
  return null;
}
export function clearPendingTripCreation(id?: string) {
  if (id && readPendingTripCreation()?.trip.id !== id) return;
  memory = null;
  try { sessionStorage.removeItem(storageKey); } catch { /* Memory is already cleared. */ }
}

export function savePendingTripCreation(pending: PendingTripCreation, userId: string): Promise<TripRecord> {
  if (!userId) return Promise.reject(new Error('로그인 후 여행을 만들 수 있어요.'));
  if (pending.accountId && pending.accountId !== userId) return Promise.reject(new Error('로그인 계정이 바뀌었어요. 여행 조건을 확인하고 다시 만들어 주세요.'));
  const key = `${userId}:${pending.trip.id}`;
  const existing = requests.get(key);
  if (existing) return existing;
  // Bind a pending save to one account and reuse the same trip ID on retries.
  pending.accountId = userId;
  memory = pending;
  try { sessionStorage.setItem(storageKey, JSON.stringify(pending)); } catch { /* Retry in memory. */ }
  const request = (async () => {
    try { return await saveTrip(pending.trip); }
    catch (cause) {
      if (!(cause instanceof ApiError && cause.status === 409)) throw cause;
      const saved = await getTrip(pending.trip.id);
      if (!sameDocument(saved.document, pending.trip.document)) throw cause;
      return saved;
    }
  })();
  requests.set(key, request);
  void request.catch(() => { requests.delete(key); });
  if (requests.size > 20) requests.delete(requests.keys().next().value!);
  return request;
}
