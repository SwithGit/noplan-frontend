import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import {
  checkAdminAccess,
  listAdminMapPlaces,
  removeAdminMapPlaces,
  reviewAdminMapPlace,
  type AdminMapPlace,
  type AdminMapPlaceType,
} from '../../api/adminPlacesApi';
import { ROUTES } from '../../routes';
import { buildMapRemovalInput, filterAdminMapPlaces, MAP_DISTRICTS } from './mapPlaceSelection';

const SEOUL_CENTER = { lat: 37.5665, lng: 126.9780 };
const MAP_TYPE_OPTIONS: Array<{ type: AdminMapPlaceType; label: string; color: string }> = [
  { type: 'food', label: '음식점', color: '#e64c78' },
  { type: 'cafe', label: '카페', color: '#a16b42' },
  { type: 'activity', label: '놀거리', color: '#7c3aed' },
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
  return (window as unknown as { kakao?: { maps?: KakaoMapsApi } }).kakao?.maps;
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
  const [district, setDistrict] = useState('all');
  const districtRef = useRef('all');
  const loadVersionRef = useRef(0);
  const districtLabel = district === 'all' ? '서울 전체' : district;
  const [enabledTypes, setEnabledTypes] = useState<AdminMapPlaceType[]>(() => MAP_TYPE_OPTIONS.map((item) => item.type));
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<AdminMapPlace | null>(null);
  const [loading, setLoading] = useState(false);
  const [reviewing, setReviewing] = useState<'approve' | 'remove' | null>(null);
  const [removingAll, setRemovingAll] = useState(false);
  const mutationRef = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [sdkReady, setSdkReady] = useState(() => Boolean(getKakaoMaps()));
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<KakaoMapInstance | null>(null);
  const clustererRef = useRef<KakaoClusterer | null>(null);

  const loadPlaces = useCallback(async (key = adminKey, id = adminId, region = districtRef.current) => {
    const version = ++loadVersionRef.current;
    setLoading(true);
    setPlaces([]);
    setSelected(null);
    setNotice('');
    setError('');
    try {
      const result = await listAdminMapPlaces(key, id || 'team', undefined, region);
      if (version !== loadVersionRef.current) return;
      setPlaces(result.places.map((place) => ({
        ...place,
        latitude: Number(place.latitude),
        longitude: Number(place.longitude),
      })).filter((place) => Number.isFinite(place.latitude) && Number.isFinite(place.longitude)));
    } catch (caught) {
      if (version !== loadVersionRef.current) return;
      setError(caught instanceof Error ? caught.message : '장소 지도를 불러오지 못했습니다.');
    } finally {
      if (version === loadVersionRef.current) setLoading(false);
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

  const visiblePlaces = useMemo(() => filterAdminMapPlaces(places, enabledTypes, query, district), [enabledTypes, places, query, district]);
  const busy = loading || Boolean(reviewing) || removingAll;

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

    if (visiblePlaces.length > 1 && (query.trim() || district !== 'all')) map.setBounds(bounds);
    else if (visiblePlaces.length === 1) focusPlace(visiblePlaces[0]);
    else {
      const center = MAP_DISTRICTS.find(item => item.name === district) || SEOUL_CENTER;
      map.setCenter(new kakaoMaps.LatLng(center.lat, center.lng));
      map.setLevel(district === 'all' ? 9 : 7);
    }
  }, [district, focusPlace, query, sdkReady, unlocked, visiblePlaces]);

  const toggleType = (type: AdminMapPlaceType) => {
    setEnabledTypes((current) => current.includes(type)
      ? current.filter((item) => item !== type)
      : [...current, type]);
    setSelected(null);
  };

  const reviewPlace = async (action: 'approve' | 'remove') => {
    if (!selected || busy || mutationRef.current) return;
    if (action === 'remove' && !window.confirm(`${selected.name}을(를) 추천 장소에서 제거할까요?\n제거 후 노플랜 코스에 추천되지 않습니다.`)) return;
    mutationRef.current = true;
    setReviewing(action);
    setError('');
    setNotice('');
    try {
      await reviewAdminMapPlace(adminKey, adminId, selected.id, action);
      const reviewedName = selected.name;
      setPlaces((current) => current.filter((place) => place.id !== selected.id));
      setSelected(null);
      setNotice(action === 'approve'
        ? `${reviewedName} 승인 완료 · 지도 검수 목록에서 제외했습니다.`
        : `${reviewedName} 제거 완료 · 노플랜 추천에서도 제외했습니다.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '장소 검수 처리에 실패했습니다.');
    } finally {
      mutationRef.current = false;
      setReviewing(null);
    }
  };

  const removeSearchResults = async () => {
    if (busy || mutationRef.current || !query.trim() || !visiblePlaces.length) return;
    if (visiblePlaces.length > 20000) {
      setError('한 번에 20,000곳까지 제거할 수 있어요. 구 또는 분류를 선택해 범위를 좁혀 주세요.');
      return;
    }
    const input = buildMapRemovalInput(places, enabledTypes, query, district);
    const labels = MAP_TYPE_OPTIONS.filter(option => enabledTypes.includes(option.type)).map(option => option.label).join(', ');
    if (!window.confirm(`“${input.query}” 검색 결과 ${input.placeIds.length.toLocaleString('ko-KR')}곳을 전부 제거할까요?\n지역: ${districtLabel}\n분류: ${labels}\n\n오른쪽 목록의 일부가 아닌, 지도에 표시된 검색 결과 전체입니다.\n제거한 장소는 노플랜 추천에서도 제외됩니다.`)) return;
    mutationRef.current = true;
    setRemovingAll(true);
    setError('');
    setNotice('');
    try {
      const result = await removeAdminMapPlaces(adminKey, adminId, input);
      const removed = new Set(result.removedIds);
      setPlaces(current => current.filter(place => !removed.has(place.id)));
      setSelected(current => current && removed.has(current.id) ? null : current);
      setNotice(`“${input.query}” 검색 결과 ${result.removedCount.toLocaleString('ko-KR')}곳 제거 완료 · 지도와 노플랜 추천에서 제외했습니다.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '검색 결과 전체 제거에 실패했습니다.');
    } finally {
      mutationRef.current = false;
      setRemovingAll(false);
    }
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
          <button className="admin-quiet-button" type="button" onClick={() => { setSelected(null); void loadPlaces(); }} disabled={busy}>{loading ? '불러오는 중' : '새로고침'}</button>
          <button className="admin-quiet-button" type="button" disabled={busy} onClick={() => {
            sessionStorage.removeItem('noplanAdminKey');
            sessionStorage.removeItem('noplanAdminId');
            setUnlocked(false);
            clustererRef.current?.clear();
            clustererRef.current = null;
            mapRef.current = null;
          }}>잠금</button>
        </div>
      </header>

      {(notice || error) && <div role={error ? 'alert' : 'status'} className={`admin-alert ${error ? 'error' : 'success'}`}>{error || notice}</div>}

      <section className="admin-map-toolbar">
        <div className="admin-map-summary">
          <strong>{places.length.toLocaleString('ko-KR')}곳</strong>
          <span>{districtLabel} · 검수 대기 장소</span>
        </div>
        <label className="admin-map-district">지역
          <select aria-label="지도 지역 선택" value={district} disabled={busy} onChange={event => {
            const next = event.target.value;
            districtRef.current = next;
            setDistrict(next);
            void loadPlaces(adminKey, adminId, next);
          }}>
            <option value="all">서울 전체</option>
            {MAP_DISTRICTS.map(item => <option key={item.name} value={item.name}>{item.name}</option>)}
          </select>
        </label>
        <div className="admin-map-type-filters" aria-label="장소 분류 필터">
          {MAP_TYPE_OPTIONS.map((option) => (
            <button
              className={enabledTypes.includes(option.type) ? 'active' : ''}
              key={option.type}
              disabled={busy}
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
          disabled={busy}
          maxLength={200}
          aria-label="지도 장소 검색"
          onChange={(event) => { setQuery(event.target.value); setSelected(null); }}
          placeholder={`${districtLabel} 장소명·주소·소분류 검색`}
        />
        <div className="admin-map-bulk-actions">
          <span className="admin-map-visible-count">지도 표시 {visiblePlaces.length.toLocaleString('ko-KR')}곳</span>
          <button className="admin-danger-button" type="button" disabled={busy || !query.trim() || !visiblePlaces.length}
            title={query.trim() ? '오른쪽 목록 개수와 관계없이 지도 검색 결과 전체를 제거합니다.' : '제거할 장소를 먼저 검색해 주세요.'}
            onClick={() => void removeSearchResults()}>
            {removingAll ? '전체 제거 중…' : query.trim() ? `전부 제거 (${visiblePlaces.length.toLocaleString('ko-KR')}곳)` : '전부 제거'}
          </button>
        </div>
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
              <div className="admin-map-review-actions">
                <button className="admin-secondary-button admin-map-approve-button" type="button" disabled={busy} onClick={() => void reviewPlace('approve')}>
                  {reviewing === 'approve' ? '처리 중' : '승인'}
                </button>
                <button className="admin-danger-button" type="button" disabled={busy} onClick={() => void reviewPlace('remove')}>
                  {reviewing === 'remove' ? '처리 중' : '제거'}
                </button>
              </div>
            </>
          ) : query.trim() ? (
            <>
              <h2>{districtLabel} 검색 결과</h2>
              <p>{visiblePlaces.length.toLocaleString('ko-KR')}곳 중 가까이 볼 장소를 선택하세요.</p>
              {visiblePlaces.length > 30 && <p>목록은 30곳만 미리 보여요. 전부 제거는 지도 검색 결과 {visiblePlaces.length.toLocaleString('ko-KR')}곳 모두에 적용돼요.</p>}
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
