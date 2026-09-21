import type { AdminMapPlace, AdminMapPlaceType } from '../../api/adminPlacesApi';

// Approximate district centers are used only when the selected district has no markers.
export const MAP_DISTRICTS = [
  { name: '강남구', lat: 37.5172, lng: 127.0473 },
  { name: '강동구', lat: 37.5301, lng: 127.1238 },
  { name: '강북구', lat: 37.6396, lng: 127.0257 },
  { name: '강서구', lat: 37.5509, lng: 126.8495 },
  { name: '관악구', lat: 37.4784, lng: 126.9516 },
  { name: '광진구', lat: 37.5385, lng: 127.0824 },
  { name: '구로구', lat: 37.4955, lng: 126.8874 },
  { name: '금천구', lat: 37.4569, lng: 126.8955 },
  { name: '노원구', lat: 37.6542, lng: 127.0568 },
  { name: '도봉구', lat: 37.6688, lng: 127.0472 },
  { name: '동대문구', lat: 37.5744, lng: 127.0396 },
  { name: '동작구', lat: 37.5124, lng: 126.9393 },
  { name: '마포구', lat: 37.5663, lng: 126.9019 },
  { name: '서대문구', lat: 37.5791, lng: 126.9368 },
  { name: '서초구', lat: 37.4837, lng: 127.0324 },
  { name: '성동구', lat: 37.5633, lng: 127.0369 },
  { name: '성북구', lat: 37.5894, lng: 127.0167 },
  { name: '송파구', lat: 37.5145, lng: 127.1059 },
  { name: '양천구', lat: 37.5170, lng: 126.8665 },
  { name: '영등포구', lat: 37.5264, lng: 126.8963 },
  { name: '용산구', lat: 37.5326, lng: 126.9905 },
  { name: '은평구', lat: 37.6028, lng: 126.9291 },
  { name: '종로구', lat: 37.5735, lng: 126.9790 },
  { name: '중구', lat: 37.5641, lng: 126.9979 },
  { name: '중랑구', lat: 37.6063, lng: 127.0927 },
];

export function mapPlaceDistrict(place: AdminMapPlace) {
  for (const address of [place.roadAddress, place.address]) {
    const match = String(address || '').trim().match(/^서울(?:특별시)?\s+(\S+구)(?:\s|$)/);
    if (match && MAP_DISTRICTS.some(district => district.name === match[1])) return match[1];
  }
  return null;
}

export function filterAdminMapPlaces(places: AdminMapPlace[], types: AdminMapPlaceType[], query: string, district = 'all') {
  const normalized = query.trim().toLocaleLowerCase('ko-KR');
  return places.filter(place => (district === 'all' || mapPlaceDistrict(place) === district)
    && types.includes(place.primaryType) && (!normalized
    || [place.name, place.detailType, place.categoryLabel, place.address, place.roadAddress]
      .some(value => String(value || '').toLocaleLowerCase('ko-KR').includes(normalized))));
}

export function buildMapRemovalInput(places: AdminMapPlace[], types: AdminMapPlaceType[], query: string, district = 'all') {
  if (!query.trim()) throw new Error('제거할 장소를 먼저 검색해 주세요.');
  // Use the exact marker collection, never the sidebar's 30-row preview.
  const placeIds = filterAdminMapPlaces(places, types, query, district).map(place => place.id);
  if (!placeIds.length) throw new Error('제거할 검색 결과가 없습니다.');
  return { placeIds, query: query.trim(), types: [...types], district };
}
