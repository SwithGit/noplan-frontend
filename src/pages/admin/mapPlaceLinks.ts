import type { AdminMapPlace } from '../../api/adminPlacesApi';

type MapLinkPlace = Pick<AdminMapPlace, 'name' | 'address' | 'roadAddress' | 'provider' | 'providerPlaceId'>;

function searchQuery(place: MapLinkPlace) {
  return [place.name.trim(), (place.roadAddress?.trim() || place.address?.trim())]
    .filter(Boolean).join(' ');
}

export function kakaoMapUrl(place: MapLinkPlace) {
  const id = String(place.providerPlaceId || '').trim();
  // IDs from Google/Naver/manual imports must never be used as Kakao IDs.
  if (place.provider === 'kakao_local' && /^\d+$/.test(id)) return `https://place.map.kakao.com/${id}`;
  return `https://map.kakao.com/link/search/${encodeURIComponent(searchQuery(place))}`;
}

export function naverMapUrl(place: MapLinkPlace) {
  return `https://map.naver.com/p/search/${encodeURIComponent(searchQuery(place))}`;
}
