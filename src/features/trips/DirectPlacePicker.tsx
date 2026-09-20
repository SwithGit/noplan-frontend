import { hasTravelNeeds, type TravelNeeds } from './travelNeeds';
import { t as uiText } from '../../i18n/translate';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Map, MapMarker, ZoomControl } from 'react-kakao-maps-sdk';
import { TripDialog } from './TripDialog';
import { TripIcon } from './TripIcon';
import { excludedPlace, validatePickedPlace } from './placeIdentity';
import { newId, type TripPlace } from './tripModel';
import { beginPcOperation } from '../../api/pcDiagnostics';
import './directPlacePicker.css';

const readyNow = () => typeof kakao !== 'undefined' && Boolean(kakao.maps?.services?.Places);
const categoryName: Record<string, string> = { FD6: '음식점', CE7: '카페', AT4: '관광지', CT1: '문화시설', AD5: '숙소' };
const pointOf = (place?: TripPlace) => place?.lat != null && place.lng != null ? { lat: place.lat, lng: place.lng } : undefined;
export function DirectPlacePicker({ needs, destination, initial, context, excluded, onClose, onRecommended, onSelect }: {
  needs?: TravelNeeds; destination: string; initial?: TripPlace; context: string; excluded: Record<string, string>;
  onClose: () => void; onRecommended: () => void; onSelect: (place: TripPlace) => void;
}) {
  const [ready, setReady] = useState(readyNow);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState(`${destination} `);
  const [category, setCategory] = useState('');
  const [results, setResults] = useState<TripPlace[]>([]);
  const [selected, setSelected] = useState<TripPlace | undefined>(initial?.source !== 'tourism' ? initial : undefined);
  const [duration, setDuration] = useState(initial?.durationMinutes || 60);
  const [manual, setManual] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [type, setType] = useState('관광지');
  const [pin, setPin] = useState<{ lat: number; lng: number }>();
  const [center, setCenter] = useState(pointOf(initial) || { lat: 35.539, lng: 129.311 });
  const [map, setMap] = useState<kakao.maps.Map>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);
  const [lastPage, setLastPage] = useState(0);
  const [searched, setSearched] = useState('');
  const request = useRef(0);
  const diagnostic = useRef<ReturnType<typeof beginPcOperation> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (ready) return;
    const poll = window.setInterval(() => { if (readyNow()) { setReady(true); clearInterval(poll); } }, 300);
    const stop = window.setTimeout(() => { clearInterval(poll); if (!readyNow()) setFailed(true); }, 10000);
    return () => { clearInterval(poll); clearTimeout(stop); };
  }, [ready]);
  useEffect(() => () => { request.current++; clearTimeout(timer.current); diagnostic.current?.finish('cancelled'); }, []);
  useEffect(() => {
    if (!map) return;
    const resize = new ResizeObserver(() => map.relayout());
    resize.observe(map.getNode()); return () => resize.disconnect();
  }, [map]);
  const cancelSearch = () => { request.current++; clearTimeout(timer.current); diagnostic.current?.finish('cancelled'); setBusy(false); };
  const begin = (action: 'place_search' | 'address_search', fields: Parameters<typeof beginPcOperation>[1] = {}) => {
    diagnostic.current?.finish('cancelled');
    diagnostic.current = beginPcOperation(action, fields);
    const id = ++request.current; clearTimeout(timer.current); setBusy(true); setError('');
    timer.current = setTimeout(() => { if (request.current === id) { request.current++; diagnostic.current?.finish('timeout', { reason: 'sdk_timeout' }); setBusy(false); setError('검색 응답이 늦어요. 잠시 후 다시 검색해 주세요.'); } }, 10000);
    return id;
  };
  const complete = (id: number) => { if (id !== request.current) return false; clearTimeout(timer.current); setBusy(false); return true; };
  const search = (targetPage = 1) => {
    const keyword = query.trim();
    if (!ready || !keyword) { setError('장소 이름이나 주소를 입력해 주세요.'); return; }
    const id = begin('place_search', { keyword, category, page: targetPage }); setSelected(undefined); setResults([]); setPage(0); setSearched(keyword);
    try {
      new kakao.maps.services.Places().keywordSearch(keyword, (items, status, pagination) => {
        if (!complete(id)) return;
        if (status === kakao.maps.services.Status.ZERO_RESULT) { diagnostic.current?.finish('empty', { resultCount: 0 }); setLastPage(0); return; }
        if (status !== kakao.maps.services.Status.OK) { diagnostic.current?.finish('error', { reason: 'sdk_error' }); setError('카카오 장소 검색을 불러오지 못했어요. 다시 검색해 주세요.'); return; }
        const places = items.map(item => ({ id: newId(), name: item.place_name, address: item.road_address_name || item.address_name, type: categoryName[String(item.category_group_code || '')] || item.category_name.split(' > ').at(-1) || '장소', lat: Number(item.y), lng: Number(item.x), durationMinutes: 60, fixed: false, source: 'manual' as const, candidateSource: 'live' as const, priceNeedsCheck: true, sourceUrl: `https://place.map.kakao.com/${item.id}` })).filter(p => p.lat >= 33 && p.lat <= 39 && p.lng >= 124 && p.lng <= 132);
        setResults(places); setPage(targetPage); setLastPage(pagination.last);
        diagnostic.current?.finish(places.length ? 'success' : 'empty', { resultCount: places.length });
        if (places.length && map) { const bounds = new kakao.maps.LatLngBounds(); places.forEach(p => bounds.extend(new kakao.maps.LatLng(p.lat, p.lng))); map.setBounds(bounds, 45, 45, 45, 45); }
      }, { page: targetPage, size: 10, ...(category ? { category_group_code: category as 'FD6' | 'CE7' | 'AT4' | 'CT1' | 'AD5' } : {}) });
    } catch { if (complete(id)) { diagnostic.current?.finish('error', { reason: 'sdk_error' }); setError('장소 검색을 시작하지 못했어요. 다시 시도해 주세요.'); } }
  };
  const locateAddress = () => {
    if (!ready || !address.trim()) { setError('찾을 주소를 입력해 주세요.'); return; }
    const id = begin('address_search');
    try {
    new kakao.maps.services.Geocoder().addressSearch(address.trim(), (items, status) => {
      if (!complete(id)) return;
      if (status !== kakao.maps.services.Status.OK || !items.length) { diagnostic.current?.finish(status === kakao.maps.services.Status.ZERO_RESULT ? 'empty' : 'error', { reason: status === kakao.maps.services.Status.ZERO_RESULT ? 'no_results' : 'sdk_error' }); setError('주소를 찾지 못했어요. 지도에서 직접 위치를 눌러 주세요.'); return; }
      diagnostic.current?.finish('success', { resultCount: items.length });
      const point = { lat: Number(items[0].y), lng: Number(items[0].x) };
      setPin(point); setCenter(point); map?.setLevel(4);
    });
    } catch { if (complete(id)) { diagnostic.current?.finish('error', { reason: 'sdk_error' }); setError('주소 검색을 시작하지 못했어요. 다시 시도해 주세요.'); } }
  };
  const choose = (place: TripPlace) => { setSelected(place); setCenter(pointOf(place)!); map?.setLevel(4); setError(''); if (place.type === '카페') setDuration(value => Math.max(30, value)); };
  const switchManual = () => { cancelSearch(); setManual(true); setPin(undefined); setSelected(undefined); setError(''); };
  const picked = manual ? pin && name.trim() ? { id: '', name: name.trim(), address: address.trim(), type, ...pin, durationMinutes: duration, fixed: false, source: 'manual' as const, sourceUrl: `https://map.kakao.com/link/map/${encodeURIComponent(name.trim())},${pin.lat},${pin.lng}`, priceNeedsCheck: true } : undefined : selected;
  const duplicate = picked && excludedPlace(picked, excluded);
  const apply = (e: FormEvent) => {
    e.preventDefault();
    if (!picked) return;
    try { const place = { ...picked, id: newId(), durationMinutes: duration }; validatePickedPlace(place); if (duplicate) throw Error(`${duplicate} · 이미 담은 장소예요.`); onSelect(place); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '장소를 확인해 주세요.'); }
  };
  const mapPin = manual ? pin : pointOf(selected);
  return <TripDialog title={uiText("가고 싶은 곳을 직접 찾아보세요")} className="direct-place-dialog" onClose={onClose}>
    <div className="direct-place-top"><div><span className="trip-eyebrow">{context}</span><p>{uiText("네이버지도나 카카오맵에서 발견한 곳도 이름으로 찾아 담아보세요.")}</p></div><button type="button" className="trip-button" onClick={onRecommended}>{uiText("추천 장소 보기")}</button></div>
    {hasTravelNeeds(needs) && <p className="support-panel support-warning">{uiText('직접 등록한 장소는 조건을 확인한 뒤 방문해 주세요.')}</p>}
    <div className="direct-place-workbench">
      <section className="direct-place-search" aria-label={uiText("직접 장소 검색")}>
        <div className="direct-place-tabs"><button type="button" aria-pressed={!manual} onClick={() => { cancelSearch(); setManual(false); setError(''); }}>{uiText("이름으로 검색")}</button><button type="button" aria-pressed={manual} onClick={switchManual}>{uiText("지도에 직접 지정")}</button></div>
        {!manual ? <><form className="direct-place-query" onSubmit={e => { e.preventDefault(); search(); }}><label htmlFor="direct-query">{uiText("장소 이름·지역")}</label><div><input id="direct-query" autoFocus value={query} maxLength={80} placeholder={uiText("예: 울산 대왕암공원, 울산 카페")} onChange={e => { cancelSearch(); setQuery(e.target.value); setPage(0); }} /><button type="submit" className="trip-button primary" disabled={!ready || busy}>{uiText("검색")}</button></div><select aria-label={uiText("직접 검색 분류")} value={category} onChange={e => { cancelSearch(); setCategory(e.target.value); setPage(0); }}><option value="">{uiText("전체 장소")}</option><option value="FD6">{uiText("음식점")}</option><option value="CE7">{uiText("카페")}</option><option value="AT4">{uiText("관광명소")}</option><option value="CT1">{uiText("문화시설")}</option><option value="AD5">{uiText("숙소")}</option></select></form>
          <div className="direct-place-results" aria-live="polite">{busy ? <p className="trip-muted">{uiText("장소를 찾고 있어요…")}</p> : results.length ? results.map(place => { const reason = excludedPlace(place, excluded); return <button type="button" className={`direct-place-result ${selected?.id === place.id ? 'selected' : ''}`} key={place.id} disabled={Boolean(reason)} onClick={() => choose(place)}><span>{uiText(place.type)}</span><strong>{place.name}</strong><small>{place.address}</small>{reason && <em>{reason}</em>}</button>; }) : <div className="direct-place-empty"><TripIcon name="pin" /><h3>{uiText(searched ? '검색된 장소가 없어요' : '목록에 없는 곳도 담아보세요')}</h3><p>{uiText(searched ? '지역이나 지점명을 함께 입력해 보세요. 찾는 곳이 없으면 지도에 직접 지정할 수 있어요.' : '음식점, 카페, 관광지, 숙소까지 장소 이름으로 검색할 수 있어요.')}</p><button type="button" className="trip-text-link" onClick={switchManual}>{uiText("지도에 직접 지정하기 →")}</button></div>}</div>
          {page > 0 && <div className="direct-place-pages"><button type="button" className="trip-button" disabled={busy || page <= 1} onClick={() => search(page - 1)}>{uiText("이전")}</button><span>{page} / {lastPage}</span><button type="button" className="trip-button" disabled={busy || page >= lastPage} onClick={() => search(page + 1)}>{uiText("다음")}</button></div>}
          <small className="trip-muted">{uiText("장소 검색 제공: 카카오맵")}</small></> : <div className="direct-place-manual"><h3>{uiText("나만 아는 장소도 여행에")}</h3><p>{uiText("주소로 지도를 이동하거나 지도를 눌러 정확한 위치를 지정해 주세요.")}</p><label>{uiText("장소 이름")}<input maxLength={160} value={name} onChange={e => setName(e.target.value)} placeholder={uiText("여행에 표시할 이름")} /></label><label>{uiText("주소")}<input maxLength={300} value={address} onChange={e => { cancelSearch(); setAddress(e.target.value); setPin(undefined); }} placeholder={uiText("도로명 또는 지번 주소")} /></label><button type="button" className="trip-button" disabled={!ready || busy} onClick={locateAddress}>{uiText("주소로 위치 찾기")}</button><label>{uiText("장소 분류")}<select value={type} onChange={e => { setType(e.target.value); if (e.target.value === '카페') setDuration(v => Math.max(30, v)); }}>{['관광지', '음식점', '카페', '문화시설', '쇼핑', '숙소', '기타'].map(value => <option key={value} value={value}>{uiText(value)}</option>)}</select></label><div className="direct-pin-status">{uiText(pin ? '✓ 지도 위치를 지정했어요. 오른쪽 핀을 확인해 주세요.' : '오른쪽 지도에서 장소 위치를 눌러 주세요.')}</div></div>}
      </section>
      <section className="direct-place-preview" aria-label={uiText("선택 장소 위치")}><div className="direct-place-map">{ready ? <Map center={center} level={6} style={{ width: '100%', height: '100%' }} onCreate={setMap} onClick={(_, event) => { if (manual) { cancelSearch(); setPin({ lat: event.latLng.getLat(), lng: event.latLng.getLng() }); setError(''); } }}><ZoomControl />{mapPin ? <MapMarker position={mapPin} /> : !manual && results.map(place => <MapMarker key={place.id} position={pointOf(place)!} title={uiText(place.name)} onClick={() => { if (!excludedPlace(place, excluded)) choose(place); }} />)}</Map> : <div className="direct-place-empty"><TripIcon name="map" /><p>{uiText(failed ? '지도를 불러오지 못했어요. 잠시 후 창을 다시 열어 주세요.' : '카카오 지도를 연결하고 있어요…')}</p></div>}<span className="direct-map-hint">{uiText(manual ? '지도를 눌러 위치 지정' : '주소와 지점을 확인해 주세요')}</span></div>
        <form className="direct-place-confirm" onSubmit={apply}><div><span className="trip-eyebrow">{uiText(picked?.type || '선택한 장소')}</span><h3>{uiText(picked?.name || '마음에 드는 장소를 선택해 주세요')}</h3><p>{uiText(picked?.address || '지도에서 위치를 확인하고 일정에 담아요.')}</p>{picked && <div className="direct-place-links"><a href={picked.sourceUrl} target="_blank" rel="noreferrer">{uiText("카카오맵 상세 ↗")}</a><a href={`https://map.naver.com/p/search/${encodeURIComponent(`${picked.name} ${picked.address}`)}`} target="_blank" rel="noreferrer">{uiText("네이버지도에서 검색 ↗")}</a></div>}<small className="trip-muted">{uiText("사진·운영시간·가격은 지도 상세에서 확인해 주세요.")}</small></div><label>{uiText("머무는 시간")}<div><input aria-label={uiText("직접 선택 장소 체류시간")} type="number" min={picked?.type === '카페' ? 30 : 10} max={600} step={1} required value={duration} onChange={e => setDuration(Number(e.target.value))} />{uiText("분")}</div></label><button type="submit" className="trip-button primary" disabled={!picked || Boolean(duplicate) || busy}>{uiText(duplicate || (initial ? '이 장소로 변경하기' : '이 장소 일정에 담기'))}<TripIcon name="arrow" /></button></form>
      </section>
    </div>{error && <p className="trip-alert direct-place-error" role="alert">{uiText(error)}</p>}
  </TripDialog>;
}
