import type { TourismAttraction } from '../../api/tourismApi';
import { tomorrow, type TripDocument } from './tripModel';

export interface TripCreationDraft {
  destination: string; startDate: string; endDate: string;
  transport: TripDocument['transport']; outbound: TripDocument['outbound']; companion: string;
  attraction?: TourismAttraction; visitDuration: number; visitDate: string; visitSlot: number;
}
// Navigation works even when the browser does not allow session storage.
const memory = new Map<string, TripCreationDraft>();
const key = (userId?: string) => `noplan.trip.creation.v1:${userId || 'guest'}`;
export function readTripCreation(userId?: string): TripCreationDraft {
  const cached = memory.get(key(userId));
  if (cached) return cached;
  let transport: TripDocument['transport'] = 'walk';
  try {
    const saved = localStorage.getItem(`noplan.trip.transport:${userId || 'guest'}`);
    if (saved === 'car' || saved === 'transit') transport = saved;
  } catch { /* Keep the default when storage is unavailable. */ }
  const defaults: TripCreationDraft = { destination: '서울', startDate: tomorrow(), endDate: tomorrow(), transport, outbound: 'local', companion: '친구', visitDuration: 90, visitDate: '', visitSlot: 0 };
  try {
    const saved = JSON.parse(sessionStorage.getItem(key(userId)) || 'null') as TripCreationDraft | null;
    if (!saved || typeof saved.destination !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(saved.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(saved.endDate)
      || !['walk', 'car', 'transit'].includes(saved.transport) || !['undecided', 'local', 'train', 'bus', 'flight', 'car'].includes(saved.outbound)
      || !['혼자', '친구', '연인', '가족', '동료'].includes(saved.companion) || !Number.isFinite(saved.visitDuration)
      || ![0, 1, 2].includes(saved.visitSlot) || typeof saved.visitDate !== 'string') return defaults;
    if (saved.attraction && (typeof saved.attraction.name !== 'string' || typeof saved.attraction.contentId !== 'string'
      || !['12', '14', '28', '25', '38', '39'].includes(saved.attraction.contentTypeId) || !Number.isFinite(saved.attraction.lat) || !Number.isFinite(saved.attraction.lng))) return defaults;
    return saved;
  } catch { return defaults; }
}
export function writeTripCreation(value: TripCreationDraft, userId?: string) {
  memory.set(key(userId), value);
  try { sessionStorage.setItem(key(userId), JSON.stringify(value)); } catch { /* Memory still preserves navigation. */ }
}
export function clearTripCreation(userId?: string) {
  memory.delete(key(userId));
  try { sessionStorage.removeItem(key(userId)); } catch { /* The current page remains usable. */ }
}
