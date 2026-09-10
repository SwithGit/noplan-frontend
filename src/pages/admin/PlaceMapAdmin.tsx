import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import {
  checkAdminAccess,
  listAdminMapPlaces,
  type AdminMapPlace,
  type AdminMapPlaceType,
} from '../../api/adminPlacesApi';
import { ROUTES } from '../../routes';

const SEOUL_CENTER = { lat: 37.5665, lng: 126.9780 };
const MAP_TYPE_OPTIONS: Array<{ type: AdminMapPlaceType; label: string; color: string }> = [
  { type: 'activity', label: '놀거리', color: '#7c3aed' },
  { type: 'culture', label: '문화/전시', color: '#db2777' },
  { type: 'hotplace', label: '산책/구경', color: '#059669' },
  { type: 'drink', label: '술/야간', color: '#ea580c' },
];

type KakaoPosition = object;
type KakaoMarker = object;
type KakaoMarkerImage = object;
type KakaoBounds = { extend: (position: KakaoPosition) => void };
type KakaoMapInstance = {
  panTo: (position: KakaoPosition) => void;
  relayout: () => void;
  setBounds: (bounds: KakaoBounds) => void;
  setCenter: (position: KakaoPosition) => void;
  setLevel: (level: number) => void;
};
type KakaoClusterer = {
  addMarkers: (markers: KakaoMarker[]) => void;
  clear: () => void;
};
type KakaoMapsApi = {
  LatLng: new (lat: number, lng: number) => KakaoPosition;
  LatLngBounds: new () => KakaoBounds;
  Map: new (container: HTMLElement, options: { center: KakaoPosition; level: number }) => KakaoMapInstance;
  Marker: new (options: { image: KakaoMarkerImage; position: KakaoPosition; title: string }) => KakaoMarker;
  MarkerClusterer: new (options: {
    map: KakaoMapInstance;
    averageCenter: boolean;
    minLevel: number;
    disableClickZoom: boolean;
  }) => KakaoClusterer;
  MarkerImage: new (url: string, size: object, options: { offset: object }) => KakaoMarkerImage;
  Point: new (x: number, y: number) => object;
  Size: new (width: number, height: number) => object;
  event: { addListener: (target: KakaoMarker, event: string, listener: () => void) => void };
};

function getKakaoMaps(): KakaoMapsApi | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as Window & { kakao?: { maps?: KakaoMapsApi } }).kakao?.maps;
}

function displayAddress(place: AdminMapPlace) {
  return place.roadAddress || place.address || '주소 정보 없음';
}

function kakaoMapUrl(place: AdminMapPlace) {
  return `https://map.kakao.com/link/map/${encodeURIComponent(place.name)},${place.latitude},${place.longitude}`;
}

function markerImageUrl(color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40"><path fill="${color}" stroke="#fff" stroke-width="2" d="M15 1C7.3 1 1 7.2 1 15c0 10.2 14 24 14 24s14-13.8 14-24C29 7.2 22.7 1 15 1Z"/><circle cx="15" cy="15" r="5" fill="#fff"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export default function PlaceMapAdmin() {
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem('noplanAdminKey') || '');
  const [adminId, setAdminId] = useState(() => sessionStorage.getItem('noplanAdminId') || '');
  const [unlocked, setUnlocked] = useState(false);
  const [places, setPlaces] = useState<AdminMapPlace[]>([]);
  const [enabledTypes, setEnabledTypes] = useState<AdminMapPlaceType[]>(() => MAP_TYPE_OPTIONS.map((item) => item.type));
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<AdminMapPlace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [truncated, setTruncated] = useState(false);
  const [sdkReady, setSdkReady] = useState(() => Boolean(getKakaoMaps()));
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<KakaoMapInstance | null>(null);
  const clustererRef = useRef<KakaoClusterer | null>(null);

  const loadPlaces = useCallback(async (key = adminKey, id = adminId) => {
    setLoading(true);
    setError('');
    try {
      const result = await listAdminMapPlaces(key, id || 'team');
      setPlaces(result.places.map((place) => ({
        ...place,
        latitude: Number(place.latitude),
        longitude: Number(place.longitude),
      })).filter((place) => Number.isFinite(place.latitude) && Number.isFinite(place.longitude)));
      setTruncated(result.truncated);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '장소 지도를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [adminId, adminKey]);

  const unlock = useCallback(async (key = adminKey, id = adminId) => {
    if (!key || !id) {
      setError('팀원 이름과 관리자 키를 입력해 주세요.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await checkAdminAccess(key, id);
      sessionStorage.setItem('noplanAdminKey', key);
      sessionStorage.setItem('noplanAdminId', id);
      setUnlocked(true);
      await loadPlaces(key, id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '관리자 인증에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [adminId, adminKey, loadPlaces]);

  useEffect(() => {
    const savedKey = sessionStorage.getItem('noplanAdminKey') || '';
    const savedId = sessionStorage.getItem('noplanAdminId') || '';
    if (savedKey && savedId) void unlock(savedKey, savedId);
  }, [unlock]);

  useEffect(() => {
    if (sdkReady) return;
    const timer = window.setInterval(() => {
      if (!getKakaoMaps()) return;
      setSdkReady(true);
      window.clearInterval(timer);
    }, 250);
    const stopTimer = window.setTimeout(() => window.clearInterval(timer), 7000);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(stopTimer);
    };
  }, [sdkReady]);

  const counts = useMemo(() => Object.fromEntries(MAP_TYPE_OPTIONS.map(({ type }) => [
    type,
    places.filter((place) => place.primaryType === type).length,
  ])) as Record<AdminMapPlaceType, number>, [places]);

  const visiblePlaces = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR');
    return places.filter((place) => {
      if (!enabledTypes.includes(place.primaryType)) return false;
      if (!normalizedQuery) return true;
      return [place.name, place.detailType, place.categoryLabel, place.address, place.roadAddress]
        .some((value) => String(value || '').toLocaleLowerCase('ko-KR').includes(normalizedQuery));
    });
  }, [enabledTypes, places, query]);

  const focusPlace = useCallback((place: AdminMapPlace) => {
    setSelected(place);
    const kakaoMaps = getKakaoMaps();
    if (!mapRef.current || !kakaoMaps) return;
    const position = new kakaoMaps.LatLng(place.latitude, place.longitude);
    mapRef.current.setLevel(4);
    mapRef.current.panTo(position);
  }, []);

  useEffect(() => {
    const kakaoMaps = getKakaoMaps();
    if (!sdkReady || !kakaoMaps || !containerRef.current || !unlocked) return;

    if (!mapRef.current) {
      mapRef.current = new kakaoMaps.Map(containerRef.current, {
        center: new kakaoMaps.LatLng(SEOUL_CENTER.lat, SEOUL_CENTER.lng),
        level: 9,
      });
      clustererRef.current = new kakaoMaps.MarkerClusterer({
        map: mapRef.current,
        averageCenter: true,
        minLevel: 5,
        disableClickZoom: false,
      });
    }

    const map = mapRef.current;
    map.relayout();
    clustererRef.current?.clear();
    const bounds = new kakaoMaps.LatLngBounds();
    const markerImages = Object.fromEntries(MAP_TYPE_OPTIONS.map((option) => [
      option.type,
      new kakaoMaps.MarkerImage(
        markerImageUrl(option.color),
        new kakaoMaps.Size(30, 40),
        { offset: new kakaoMaps.Point(15, 40) },
      ),
    ])) as Record<AdminMapPlaceType, KakaoMarkerImage>;
    const markers = visiblePlaces.map((place) => {
      const position = new kakaoMaps.LatLng(place.latitude, place.longitude);
      const marker = new kakaoMaps.Marker({
        image: markerImages[place.primaryType],
        position,
        title: place.name,
      });
      kakaoMaps.event.addListener(marker, 'click', () => setSelected(place));
      bounds.extend(position);
      return marker;
    });
    clustererRef.current?.addMarkers(markers);

    if (visiblePlaces.length > 1 && query.trim()) map.setBounds(bounds);
    else if (visiblePlaces.length === 1) focusPlace(visiblePlaces[0]);
    else if (!query.trim()) {
      map.setCenter(new kakaoMaps.LatLng(SEOUL_CENTER.lat, SEOUL_CENTER.lng));
      map.setLevel(9);
    }
  }, [focusPlace, query, sdkReady, unlocked, visiblePlaces]);

  const toggleType = (type: AdminMapPlaceType) => {
    setEnabledTypes((current) => current.includes(type)
      ? current.filter((item) => item !== type)
      : [...current, type]);
    setSelected(null);
  };

  if (!unlocked) {
    return (
      <main className="admin-login-page">
        <section className="admin-login-panel">
          <div className="admin-brand-mark">NP</div>
          <div><p className="admin-eyebrow">NoPlan operations</p><h1>서울 장소 지도</h1><p>기존 장소 관리자 계정으로 접속합니다.</p></div>
          <label>팀원 이름<input value={adminId} onChange={(event) => setAdminId(event.target.value)} placeholder="예: 지혁" /></label>
          <label>관리자 키<input type="password" value={adminKey} onChange={(event) => setAdminKey(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && void unlock()} /></label>
          {error && <p className="admin-alert error">{error}</p>}
          <button className="admin-primary-button" type="button" disabled={loading} onClick={() => void unlock()}>{loading ? '연결 중' : '장소 지도 열기'}</button>
        </section>
      </main>
    );
  }

  return (
    <main className="place-admin-page admin-map-page">
      <header className="place-admin-header">
        <div><p className="admin-eyebrow">NoPlan Seoul catalog</p><h1>서울 등록 장소 지도</h1></div>
        <div className="admin-header-actions">
          <Link className="admin-secondary-button admin-map-nav-link" to={ROUTES.placeAdmin}>등록·검수</Link>
          <span className="admin-user-chip">{adminId}</span>
          <button className="admin-quiet-button" type="button" onClick={() => void loadPlaces()} disabled={loading}>{loading ? '불러오는 중' : '새로고침'}</button>
          <button className="admin-quiet-button" type="button" onClick={() => {
            sessionStorage.removeItem('noplanAdminKey');
            sessionStorage.removeItem('noplanAdminId');
            setUnlocked(false);
          }}>잠금</button>
        </div>
      </header>

      {error && <div className="admin-alert error">{error}</div>}
      {truncated && <div className="admin-alert error">표시 한도 20,000곳에 도달했습니다. 분류 필터를 사용해 주세요.</div>}

      <section className="admin-map-toolbar">
        <div className="admin-map-summary">
          <strong>{places.length.toLocaleString('ko-KR')}곳</strong>
          <span>서울 활성 장소 · 음식점/카페 제외</span>
        </div>
        <div className="admin-map-type-filters" aria-label="장소 분류 필터">
          {MAP_TYPE_OPTIONS.map((option) => (
            <button
              className={enabledTypes.includes(option.type) ? 'active' : ''}
              key={option.type}
              onClick={() => toggleType(option.type)}
              style={{ '--marker-color': option.color } as CSSProperties}
              type="button"
            >
              <i aria-hidden="true" />{option.label} <b>{counts[option.type].toLocaleString('ko-KR')}</b>
            </button>
          ))}
        </div>
        <input
          className="admin-map-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="장소명·주소·소분류 검색"
        />
        <span className="admin-map-visible-count">지도 표시 {visiblePlaces.length.toLocaleString('ko-KR')}곳</span>
      </section>

      <section className="admin-map-workspace">
        <div className="admin-map-canvas-wrap">
          {!sdkReady && <div className="admin-map-loading">카카오맵을 불러오는 중입니다.</div>}
          <div className="admin-map-canvas" ref={containerRef} />
        </div>
        <aside className="admin-map-detail-panel">
          {selected ? (
            <>
              <span className={`admin-map-type-badge type-${selected.primaryType}`}>
                {MAP_TYPE_OPTIONS.find((item) => item.type === selected.primaryType)?.label || selected.primaryType}
              </span>
              <h2>{selected.name}</h2>
              <p>{selected.detailType || selected.categoryLabel || '세부 분류 없음'}</p>
              <dl>
                <div><dt>주소</dt><dd>{displayAddress(selected)}</dd></div>
                <div><dt>영업 상태</dt><dd>{selected.businessStatus || '정보 없음'}</dd></div>
                <div><dt>평점·리뷰</dt><dd>{selected.rating ? `${Number(selected.rating).toFixed(1)}점` : '평점 없음'} · 리뷰 {Number(selected.reviewCount || 0).toLocaleString('ko-KR')}개</dd></div>
                <div><dt>DB 번호</dt><dd>{selected.id}</dd></div>
              </dl>
              <a className="admin-primary-button admin-map-external-link" href={kakaoMapUrl(selected)} target="_blank" rel="noopener noreferrer">카카오맵에서 보기</a>
            </>
          ) : query.trim() ? (
            <>
              <h2>검색 결과</h2>
              <p>{visiblePlaces.length.toLocaleString('ko-KR')}곳 중 가까이 볼 장소를 선택하세요.</p>
              <div className="admin-map-search-results">
                {visiblePlaces.slice(0, 30).map((place) => (
                  <button key={place.id} type="button" onClick={() => focusPlace(place)}>
                    <strong>{place.name}</strong>
                    <span>{place.detailType || place.primaryType} · {displayAddress(place)}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="admin-map-empty-detail">
              <div className="admin-brand-mark">NP</div>
              <h2>마커를 선택하세요</h2>
              <p>장소 이름, 분류, 주소와 현재 DB 상태를 확인할 수 있습니다.</p>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
