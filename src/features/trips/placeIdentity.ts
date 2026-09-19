import { endLimit, minutes, newId, usedMinutes, type TripDocument, type TripPlace } from './tripModel';

type Identity = Pick<TripPlace, 'name' | 'lat' | 'lng' | 'sourceUrl' | 'tourism'>;
const cleanName = (name: string) => name.normalize('NFKC').toLowerCase().replace(/[\s()[\]·_-]/g, '');
export const replacementNotes = (notes = '') => notes.split('\n').filter(line => !/^(조회한 이동|직접 입력한 이동|운영 안내:|휴무 안내:|운영시간 확인 필요|방문일 운영 여부|가까운 동선으로 연결|선택 성·연령 방문 비중|(?:발견|데이트|친구모임|가족여행|자연산책|문화여행)에 어울리는 장소)/.test(line)).join('\n');
export function placeKeys(place: Identity): string[] {
  const keys: string[] = place.tourism ? [place.tourism.contentId] : [];
  const kakaoId = /^https?:\/\/place\.map\.kakao\.com\/(\d+)\/?$/.exec(place.sourceUrl)?.[1];
  if (kakaoId) keys.push(`kakao:${kakaoId}`);
  if (place.lat != null && place.lng != null) keys.push(`position:${encodeURIComponent(cleanName(place.name))}:${place.lat}:${place.lng}`);
  return keys;
}
export function excludedPlace(place: Identity, excluded: Record<string, string>): string | undefined {
  for (const key of placeKeys(place)) if (excluded[key]) return excluded[key];
  if (place.lat == null || place.lng == null) return;
  const prefix = `position:${encodeURIComponent(cleanName(place.name))}:`;
  for (const [key, reason] of Object.entries(excluded)) {
    if (!key.startsWith(prefix)) continue;
    const [lat, lng] = key.slice(prefix.length).split(':').map(Number);
    const meters = Math.hypot((lat - place.lat) * 111320, (lng - place.lng) * 111320 * Math.cos(place.lat * Math.PI / 180));
    if (meters <= 100) return reason;
  }
}
export function validatePickedPlace(place: TripPlace) {
  if (!place.name.trim() || place.name.length > 160 || place.address.length > 300) throw Error('장소 이름과 주소를 확인해 주세요.');
  if (place.lat == null || place.lng == null || !Number.isFinite(place.lat) || !Number.isFinite(place.lng) || place.lat < 33 || place.lat > 39 || place.lng < 124 || place.lng > 132) throw Error('국내 지도에서 장소 위치를 지정해 주세요.');
  if (!Number.isInteger(place.durationMinutes) || place.durationMinutes < 10 || place.durationMinutes > 600) throw Error('머무는 시간은 10~600분으로 입력해 주세요.');
  if (place.type === '카페' && place.durationMinutes < 30) throw Error('카페는 최소 30분으로 잡아 주세요.');
}
// Replace only the chosen stop, preserving its position and all other days.
export function putTripPlace(document: TripDocument, dayId: string, blockId: string, place: TripPlace, replaceId?: string): TripDocument {
  validatePickedPlace(place);
  const day = document.days.find(d => d.id === dayId), block = day?.blocks.find(b => b.id === blockId);
  if (!day || !block || replaceId && !block.places.some(p => p.id === replaceId)) throw Error('일정이 바뀌었어요. 장소 선택을 다시 열어 주세요.');
  const excluded: Record<string, string> = {};
  document.days.forEach(d => d.blocks.forEach(b => b.places.forEach(p => { if (p.id !== replaceId) placeKeys(p).forEach(key => { excluded[key] = '이 여행에 이미 담은 장소예요.'; }); })));
  if (excludedPlace(place, excluded)) throw Error('이 여행에 이미 담은 장소예요.');
  const picked = { ...place, id: replaceId || newId(), travelMinutes: undefined };
  const places = replaceId ? block.places.map(p => p.id === replaceId ? picked : p) : [...block.places, picked];
  // Official anchors must stay first, as required by the existing save contract.
  if (picked.tourism && places.some(p => p.id !== picked.id && p.tourism)) throw Error('한 구간의 중심 관광지는 하나예요. 기존 관광지를 변경해 주세요.');
  places.sort((a, b) => Number(Boolean(b.tourism)) - Number(Boolean(a.tourism)));
  const next = { ...block, notes: replaceId ? replacementNotes(block.notes) : block.notes, area: places[0]?.address.slice(0, 160) || block.area, places: places.map(p => ({ ...p, travelMinutes: undefined })) };
  if (places.length > 15 || usedMinutes(next) > endLimit(day, block) - minutes(block.startTime)) throw Error('구간 시간을 넘어요. 머무는 시간을 줄이거나 구간을 늘려 주세요.');
  return { ...document, days: document.days.map(d => d.id === dayId ? { ...d, blocks: d.blocks.map(b => b.id === blockId ? next : b.startTime > block.startTime ? { ...b, notes: b.notes.split('\n').filter(line => !/^(조회한 이동|직접 입력한 이동)/.test(line)).join('\n') } : b) } : d) };
}
