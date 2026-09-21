import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import PlaceMapAdmin from '../src/pages/admin/PlaceMapAdmin';
import { mapPlaceDistrict } from '../src/pages/admin/mapPlaceSelection';
import '../src/styles/index.css';

// Local fixture only: every API and map call is intercepted, including mutations.
const rows = [
  { id: 1, name: '성수 음식점', primaryType: 'food', address: '서울 성동구 연무장길 1', latitude: 37.544, longitude: 127.055 },
  { id: 2, name: '성수 카페', primaryType: 'cafe', address: '서울 성동구 성수이로 1', latitude: 37.546, longitude: 127.058 },
  { id: 3, name: '건대 음식점', primaryType: 'food', address: '서울 광진구 능동로 1', latitude: 37.541, longitude: 127.070 },
  { id: 4, name: '건대 카페', primaryType: 'cafe', address: '서울 광진구 아차산로 1', latitude: 37.539, longitude: 127.072 },
  { id: 5, name: '성수 놀거리', primaryType: 'activity', address: '서울 성동구 성수이로 3', latitude: 37.547, longitude: 127.059 },
];
window.fetch = async (url, init) => {
  if (init?.method === 'POST') return Response.json({ success: false, message: '로컬 검증에서는 저장하지 않습니다.' }, { status: 409 });
  const parsed = new URL(String(url), location.origin);
  const district = parsed.searchParams.get('district') || 'all';
  return Response.json({ success: true, places: rows.filter(row => district === 'all' || mapPlaceDistrict(row as never) === district), nextCursor: null });
};
class Bounds { points: unknown[] = []; extend(point: unknown) { this.points.push(point); } }
let canvas: HTMLElement;
const render = (text: string) => { if (canvas) canvas.textContent = `지도 SDK 대체 · ${text}`; };
class MapMock {
  constructor(element: HTMLElement) { canvas = element; canvas.style.padding = '40px'; }
  relayout() {} setBounds(bounds: Bounds) { render(`선택 지역의 ${bounds.points.length}곳으로 확대`); }
  setCenter() {} setLevel(level: number) { render(`지도 확대 수준 ${level}`); } panTo() {}
}
class Empty { constructor(..._args: unknown[]) {} }
(window as unknown as { kakao: unknown }).kakao = { maps: {
  Map: MapMock, LatLng: Empty, LatLngBounds: Bounds, Marker: Empty, MarkerImage: Empty, Size: Empty, Point: Empty,
  MarkerClusterer: class { clear() {} addMarkers() {} }, event: { addListener() {} },
} };
createRoot(document.getElementById('root')!).render(<MemoryRouter><PlaceMapAdmin /></MemoryRouter>);
