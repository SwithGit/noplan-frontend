import { apiJson } from './client';
import type { NopiAttraction } from '../features/trips/nopiModel';
import { hasTravelNeeds, type TravelNeeds, type TravelSupport } from '../features/trips/travelNeeds';

type SupportCatalog = { items: TravelSupport[]; checked: number; partial: boolean; unavailable: boolean };
export type Discovery = { items: (NopiAttraction & { centralRank?: number; relatedRank?: number })[]; status: 'ok' | 'unavailable'; baseYm?: string; partial?: boolean };
const cached = new Map<string, { value: TravelSupport; expires: number }>();
const pending = new Map<string, Promise<TravelSupport | undefined>>();
const queued: { id: string; resolve: (value: TravelSupport | undefined) => void; reject: (error: unknown) => void }[] = [];
function remember(items: TravelSupport[]) { for (const item of items) if (item.pet.status === 'ok' && item.access.status === 'ok') cached.set(item.contentId, { value: item, expires: Date.now() + 3600000 }); }
async function flush() {
  const batch = queued.splice(0, 20);
  if (queued.length) setTimeout(() => void flush(), 100);
  try {
    const data = await apiJson<{ items: TravelSupport[] }>(`/api/tourism/travel-support/places?ids=${batch.map(p => p.id).join(',')}`, { signal: AbortSignal.timeout(60000) });
    remember(data.items);
    batch.forEach(p => p.resolve(data.items.find(item => item.contentId === p.id)));
  } catch (error) { batch.forEach(p => p.reject(error)); }
  finally { batch.forEach(p => pending.delete(p.id)); }
}
export function getPlaceSupport(id: string): Promise<TravelSupport | undefined> {
  const hit = cached.get(id); if (hit && hit.expires > Date.now()) return Promise.resolve(hit.value);
  const previous = pending.get(id); if (previous) return previous;
  const task = new Promise<TravelSupport | undefined>((resolve, reject) => { if (!queued.length) setTimeout(() => void flush(), 40); queued.push({ id, resolve, reject }); });
  pending.set(id, task); return task;
}
export async function getSupportCatalog(destination: string, needs: TravelNeeds, signal: AbortSignal): Promise<SupportCatalog> {
  if (!hasTravelNeeds(needs)) return { items: [], checked: 0, partial: false, unavailable: false };
  const query = new URLSearchParams({ destination, pet: needs.pet.enabled ? '1' : '0', access: Object.keys(needs.facilities).length ? '1' : '0', requiredAccess: Object.values(needs.facilities).includes('required') ? '1' : '0' });
  // Species, weight and individual facility choices are evaluated locally, not logged in API queries.
  try { return await apiJson<SupportCatalog>(`/api/tourism/travel-support/catalog?${query}`, { signal: AbortSignal.any([signal, AbortSignal.timeout(90000)]) }); }
  catch { signal.throwIfAborted(); throw Error('여행 조건 정보를 불러오지 못했어요. 잠시 후 다시 확인해 주세요.'); }
}
export function getDiscovery(destination: string, anchorId?: string, signal?: AbortSignal) {
  return apiJson<Discovery>(`/api/tourism/travel-support/discovery?${new URLSearchParams({ destination, ...(anchorId ? { anchorId } : {}) })}`, { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(60000)]) : AbortSignal.timeout(60000) });
}
