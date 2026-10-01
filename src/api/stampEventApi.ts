import { apiJson } from './client';

export interface StampState {
  campaign: string;
  stamps: number[];
  complete: boolean;
  redeemedAt: string | null;
  alreadyCollected?: boolean;
  alreadyRedeemed?: boolean;
}
export const EVENT_PARTICIPATED = 'noplan.event.participated';
export const EVENT_RETURN = 'noplan.event.return';
let sessionRequest: Promise<StampState> | undefined;
export function startEventSession() {
  if (!sessionRequest) {
    sessionRequest = apiJson<StampState>('/api/stamp-event/session', { method: 'POST', body: '{}' })
      .then(result => { try { localStorage.setItem(EVENT_PARTICIPATED, '1'); } catch { /* HttpOnly cookie keeps the record. */ } return result; })
      .finally(() => { sessionRequest = undefined; });
  }
  return sessionRequest;
}
export const getStamps = () => apiJson<StampState>('/api/stamp-event/state');
export const collectStamp = (id: number) => apiJson<StampState>(`/api/stamp-event/stamps/${id}`, { method: 'POST', body: '{}' });
export const redeemEventReward = () => apiJson<StampState>('/api/stamp-event/redeem', { method: 'POST', body: '{}' });

const entries = new Map<string, Promise<StampState>>();
export function enterStampCard(identity: string, id?: number) {
  const key = `${identity}:${id || 'card'}`;
  if (!entries.has(key)) {
    entries.set(key, startEventSession().then(state => id ? collectStamp(id) : state).finally(() => entries.delete(key)));
  }
  return entries.get(key)!;
}
