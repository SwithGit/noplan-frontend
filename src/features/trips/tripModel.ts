import type { CoursePlace } from '../../types/noplan';

export interface TripPlace {
  id: string;
  name: string;
  address: string;
  type: string;
  lat: number | null;
  lng: number | null;
  durationMinutes: number;
  fixed: boolean;
  source: 'manual' | 'recommendation';
  sourceUrl: string;
  event?: {id: string; startDate: string; endDate: string; hours: string};
}
export interface TripBlock { id: string; title: string; area: string; startTime: string; endTime: string; notes: string; places: TripPlace[] }
export interface TripDay { id: string; date: string; blocks: TripBlock[] }
export interface TripDocument {
  title: string; destination: string; startDate: string; endDate: string;
  outbound: 'undecided' | 'train' | 'bus' | 'flight' | 'car' | 'local';
  transport: 'walk' | 'transit' | 'car'; companion: string; days: TripDay[];
}
export interface TripRecord { id: string; version: number; updatedAt: string; document: TripDocument }
export const transportLabels = { walk: '도보', transit: '대중교통', car: '자가용·렌터카' };
export const outboundLabels = { undecided: '아직 미정', local: '여행지에서 시작', train: '기차', bus: '버스', flight: '항공', car: '자가용' };
export const newId = () => crypto.randomUUID();
export const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
export const clock = (value: number) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
export const dayCount = (start: string, end: string) => Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
export const tripLength = (trip: TripDocument) => trip.days.length === 1 ? '당일치기' : `${trip.days.length - 1}박 ${trip.days.length}일`;
export const shortDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' });
export function tomorrow() { const date = new Date(); date.setDate(date.getDate() + 1); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
export function makeBlock(title = '새 일정', startTime = '09:00', endTime = '12:00', area = ''): TripBlock {
  return { id: newId(), title, startTime, endTime, area, notes: '', places: [] };
}
export function createTrip(input: Omit<TripDocument, 'days'>): TripRecord {
  if (!input.destination.trim()) throw new Error('여행 목적지를 입력해 주세요.');
  const count = dayCount(input.startDate, input.endDate);
  if (!Number.isFinite(count) || count < 1 || count > 14) throw new Error('여행 기간은 1~14일로 선택해 주세요.');
  return { id: newId(), version: 0, updatedAt: new Date().toISOString(), document: { ...input, days: Array.from({ length: count }, (_, index) => ({
    id: newId(), date: new Date(Date.parse(input.startDate) + index * 86400000).toISOString().slice(0, 10),
    blocks: [makeBlock('오전의 여행', '09:00', '12:00', input.destination), makeBlock('오후의 발견', '13:00', '17:00', input.destination), makeBlock('저녁의 여유', '18:00', '21:00', input.destination)],
  })) } };
}
export function usedMinutes(block: TripBlock) { return block.places.reduce((sum, place) => sum + place.durationMinutes, 0) + Math.max(0, block.places.length - 1) * 15; }
export function endLimit(day: TripDay, block: TripBlock) {
  const nextStart = day.blocks.filter(b => b.id !== block.id && minutes(b.startTime) > minutes(block.startTime)).map(b => minutes(b.startTime));
  return Math.min(minutes(block.endTime), ...nextStart);
}
export function toTripPlace(place: CoursePlace): TripPlace {
  const lat = Number(place.lat), lng = Number(place.lng);
  const hasCoordinates = place.lat != null && place.lng != null && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  return { id: newId(), name: place.name || place.title, address: place.address || '', type: place.category || place.type, lat: hasCoordinates ? lat : null, lng: hasCoordinates ? lng : null, durationMinutes: Math.min(600, Math.max(10, Math.round(place.durationMinutes || 60))), fixed: false, source: 'recommendation', sourceUrl: place.sourceUrl || '' };
}
export function draftKey(userId?: string) { return `noplan.trip.draft.v1:${userId || 'guest'}`; }
export function readDrafts(userId?: string): TripRecord[] {
  try {
    const raw = localStorage.getItem(draftKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const results = (Array.isArray(parsed) ? parsed : [parsed]) as TripRecord[];
    return results.filter(result => result?.id && result.document?.title && Array.isArray(result.document.days) && result.document.days.length > 0 && result.document.days.every(day => typeof day.date === 'string' && Array.isArray(day.blocks) && day.blocks.every(block => Array.isArray(block.places))));
  } catch { return []; }
}
export function readDraft(userId?: string) { return readDrafts(userId)[0] || null; }
export function writeDraft(trip: TripRecord, userId?: string) {
  const previous = readDrafts(userId).filter(item => item.id !== trip.id);
  if (previous.length >= 30) throw new Error('브라우저에 보관할 수 있는 초안 수를 초과했어요.');
  localStorage.setItem(draftKey(userId), JSON.stringify([trip, ...previous]));
}
