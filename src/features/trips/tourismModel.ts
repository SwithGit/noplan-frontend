import type { TourismAttraction } from '../../api/tourismApi';
import { endLimit, minutes, newId, usedMinutes, type TripDocument, type TripPlace } from './tripModel';

export function setTourismAnchor(document: TripDocument, dayId: string, blockId: string, attraction: TourismAttraction, durationMinutes: number): TripDocument {
  const day = document.days.find(item => item.id === dayId), block = day?.blocks.find(item => item.id === blockId);
  if (!day || !block) throw new Error('관광지를 담을 날짜와 구간을 다시 선택해 주세요.');
  if (!Number.isInteger(durationMinutes) || durationMinutes < 10 || durationMinutes > 600) throw new Error('관람시간은 10~600분으로 입력해 주세요.');
  if (!/^\d{1,20}$/.test(attraction.contentId) || !['12', '14', '28', '25', '38'].includes(attraction.contentTypeId) || !attraction.name || !Number.isFinite(attraction.lat) || !Number.isFinite(attraction.lng) || attraction.lat < 33 || attraction.lat > 39 || attraction.lng < 124 || attraction.lng > 132) throw new Error('관광지 위치를 확인할 수 없어요. 다시 검색해 주세요.');
  if (day.blocks.some(item => item.id !== blockId && item.places.some(place => place.tourism?.contentId === attraction.contentId))) throw new Error('이 날짜의 다른 구간에 이미 담은 관광지예요.');
  const previous = block.places.find(place => place.tourism);
  const anchor: TripPlace = { id: previous?.id || newId(), name: attraction.name, type: attraction.type, address: attraction.address, lat: attraction.lat, lng: attraction.lng, durationMinutes, fixed: true, source: 'tourism', sourceUrl: attraction.sourceUrl, priceNeedsCheck: true, tourism: { contentId: attraction.contentId, contentTypeId: attraction.contentTypeId } };
  const next = { ...block, area: attraction.address.slice(0, 160) || attraction.name, places: [anchor, ...block.places.filter(place => !place.tourism)] };
  if (next.places.length > 15) throw new Error('한 구간에는 최대 15개 장소를 담을 수 있어요.');
  if (usedMinutes(next) > endLimit(day, block) - minutes(block.startTime)) throw new Error('관람시간과 담긴 장소가 구간 시간을 넘어요. 관람시간을 줄이거나 구간 시간을 늘려주세요.');
  return { ...document, days: document.days.map(item => item.id === dayId ? { ...item, blocks: item.blocks.map(segment => segment.id === blockId ? next : segment) } : item) };
}

export function attractionFromPlace(place: TripPlace): TourismAttraction {
  if (!place.tourism || place.lat == null || place.lng == null) throw new Error('관광지 정보를 확인해 주세요.');
  return { ...place.tourism, name: place.name, type: place.type, address: place.address, lat: place.lat, lng: place.lng, sourceUrl: place.sourceUrl, sourceLabel: '한국관광공사 TourAPI' };
}
