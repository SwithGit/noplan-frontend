import type { AdminMapPlace, AdminMapPlaceType } from '../../api/adminPlacesApi';

export function filterAdminMapPlaces(places: AdminMapPlace[], types: AdminMapPlaceType[], query: string) {
  const normalized = query.trim().toLocaleLowerCase('ko-KR');
  return places.filter(place => types.includes(place.primaryType) && (!normalized
    || [place.name, place.detailType, place.categoryLabel, place.address, place.roadAddress]
      .some(value => String(value || '').toLocaleLowerCase('ko-KR').includes(normalized))));
}

export function buildMapRemovalInput(places: AdminMapPlace[], types: AdminMapPlaceType[], query: string) {
  if (!query.trim()) throw new Error('제거할 장소를 먼저 검색해 주세요.');
  // Use the exact marker collection, never the sidebar's 30-row preview.
  const placeIds = filterAdminMapPlaces(places, types, query).map(place => place.id);
  if (!placeIds.length) throw new Error('제거할 검색 결과가 없습니다.');
  return { placeIds, query: query.trim(), types: [...types] };
}
