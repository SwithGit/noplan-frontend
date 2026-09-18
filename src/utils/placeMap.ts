import type { CoursePlace } from '../types/noplan';

export function kakaoPlaceUrl(place: CoursePlace) {
  const id = place.providerPlaceId?.trim();
  if (place.provider === 'kakao_local' && id) return `https://place.map.kakao.com/${encodeURIComponent(id)}`;
  const query = [place.searchKeyword || place.name || place.title, place.address].filter(Boolean).join(' ');
  return `https://map.kakao.com/link/search/${encodeURIComponent(query)}`;
}
