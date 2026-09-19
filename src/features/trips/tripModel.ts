import type { CoursePlace } from '../../types/noplan';

export interface TripPlace {
  id: string;
  name: string;
  address: string;
  type: string;
  lat: number | null;
  lng: number | null;
  durationMinutes: number;
  travelMinutes?: number;
  fixed: boolean;
  source: 'manual' | 'recommendation' | 'tourism';
  sourceUrl: string;
  candidateSource?: 'catalog' | 'live';
  priceNeedsCheck?: boolean;
  tourism?: { contentId: string; contentTypeId: '12' | '14' | '28' | '25' | '38' };
  event?: {id: string; startDate: string; endDate: string; hours: string};
}
export interface TripBlock { id: string; title: string; area: string; startTime: string; endTime: string; notes: string; places: TripPlace[] }
export interface TripDay { id: string; date: string; blocks: TripBlock[] }
export interface TripDocument {
  title: string; destination: string; startDate: string; endDate: string;
  outbound: 'undecided' | 'train' | 'bus' | 'flight' | 'car' | 'local';
  transport: 'walk' | 'transit' | 'car'; companion: string; days: TripDay[];
}
export interface TripCollaboration { enabled: boolean; role: 'owner' | 'editor'; memberCount: number }
export interface TripRecord { id: string; version: number; updatedAt: string; document: TripDocument; collaboration?: TripCollaboration; baseDocument?: TripDocument }
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
export function usedMinutes(block: TripBlock) { return block.places.reduce((sum, place, index) => sum + place.durationMinutes + (place.travelMinutes ?? (index ? 15 : 0)), 0); }

// Editing an earlier stop invalidates the saved arrival/waiting times after it.
export function resetChangedTravel(previous: TripDocument, next: TripDocument): TripDocument {
  const signature = (places: TripPlace[]) => JSON.stringify(places.map(p => [p.id, p.name, p.lat, p.lng, p.durationMinutes]));
  return { ...next, days: next.days.map(day => {
    const oldDay = previous.days.find(item => item.id === day.id);
    return { ...day, blocks: day.blocks.map(block => {
      const oldBlock = oldDay?.blocks.find(item => item.id === block.id);
      return { ...block, places: block.places.map((place, index) => {
        if (place.travelMinutes == null || !oldBlock?.places.some(p => p.id === place.id)) return place;
        const changed = previous.transport !== next.transport || oldDay?.date !== day.date
          || oldBlock.startTime !== block.startTime || oldBlock.area !== block.area
          || signature(oldBlock.places.slice(0, index + 1)) !== signature(block.places.slice(0, index + 1));
        return changed ? { ...place, travelMinutes: undefined } : place;
      }) };
    }) };
  }) };
}

// Preserve the server schedule, including incoming travel/waiting time, once.
export function recommendationPlaces(candidates: CoursePlace[], day: TripDay, block: TripBlock): TripPlace[] {
  const midnight = Date.parse(`${day.date}T00:00:00+09:00`);
  let previousEnd = midnight + (minutes(block.startTime) + usedMinutes(block)) * 60000;
  const end = midnight + endLimit(day, block) * 60000;
  const names = new Set(block.places.map(place => place.name.replace(/\s/g, '')));
  if (block.places.length + candidates.length > 15) throw new Error('한 구간에는 최대 15개 장소를 담을 수 있어요.');
  return candidates.map(candidate => {
    const place = toTripPlace(candidate), name = place.name.replace(/\s/g, '');
    const startAt = Date.parse(candidate.scheduledStart || ''), endAt = Date.parse(candidate.scheduledEnd || '');
    const travelMinutes = (startAt - previousEnd) / 60000;
    if (names.has(name) || !Number.isFinite(startAt) || !Number.isFinite(endAt) || endAt > end
      || !Number.isInteger(travelMinutes) || travelMinutes < 0 || travelMinutes > 1440
      || endAt - startAt !== place.durationMinutes * 60000) {
      throw new Error('추천 일정의 시간 또는 중복 장소를 확인할 수 없어요. 다시 추천받아 주세요.');
    }
    previousEnd = endAt; names.add(name);
    return { ...place, travelMinutes };
  });
}
export function endLimit(day: TripDay, block: TripBlock) {
  const nextStart = day.blocks.filter(b => b.id !== block.id && minutes(b.startTime) > minutes(block.startTime)).map(b => minutes(b.startTime));
  return Math.min(minutes(block.endTime), ...nextStart);
}
export function toTripPlace(place: CoursePlace): TripPlace {
  const lat = Number(place.lat), lng = Number(place.lng);
  const hasCoordinates = place.lat != null && place.lng != null && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  return { id: newId(), name: place.name || place.title, address: place.address || '', type: place.category || place.type, lat: hasCoordinates ? lat : null, lng: hasCoordinates ? lng : null, durationMinutes: Math.min(600, Math.max(10, Math.round(place.durationMinutes || 60))), fixed: false, source: 'recommendation', sourceUrl: place.sourceUrl || '', candidateSource: place.candidateSource, priceNeedsCheck: place.estimatedCost?.status === 'unknown' };
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
