import { useEffect, useMemo, useRef, useState } from 'react';
import { apiJson } from '../../api/client';
import { getDayRoutes, type DayRouteResult } from '../../api/dayRouteApi';
import type { TourismSearchResult } from '../../api/tourismApi';
import { TripDialog } from './TripDialog';
import { TripIcon } from './TripIcon';
import { DayRouteMap } from './DayRouteMap';
import { TourismPicker } from './TourismPicker';
import { attractionFromPlace } from './tourismModel';
import { clock, shortDate, type TripDay, type TripDocument } from './tripModel';
import { courseDay, courseLegs, dayNodes, edgeId, scheduleCourse, suggestCourse, tourismNode, tripExclusions, type CourseNode, type NopiAttraction, type NopiOptions, type Purpose } from './nopiModel';
import nopi from '../../assets/nopi/nopi-icon.png';
import './dayRoute.css';
import './nopiPlanner.css';

type Catalog = Omit<TourismSearchResult, 'items'> & { items: NopiAttraction[] };
export function NopiCoursePlanner({ document, dayId, disabled, onClose, onApply }: {
  document: TripDocument; dayId: string; disabled: boolean; onClose: () => void;
  onApply: (day: TripDay, transport: TripDocument['transport'], baseline: string, next: boolean) => void;
}) {
  const day = document.days.find(item => item.id === dayId)!;
  const dayIndex = document.days.indexOf(day);
  const [baseline] = useState(() => JSON.stringify(document));
  const [draftNodes, setNodes] = useState<CourseNode[]>(() => dayNodes(day));
  const [options, setOptions] = useState<NopiOptions>(() => ({ date: day.date, start: day.blocks[0]?.startTime || '09:00', end: day.blocks.some(block => block.places.length) ? day.blocks.filter(block => block.places.length).reduce((last, block) => block.endTime > last ? block.endTime : last, '18:00') : '18:00', transport: (day.transport || document.transport) === 'car' ? 'car' : 'walk', purpose: document.companion === '연인' ? '데이트' : document.companion === '가족' ? '가족여행' : document.companion === '친구' ? '친구모임' : '발견', district: '' }));
  const [profile, setProfile] = useState({ mode: 'member', age: '', gender: 'all' });
  const [catalogResponse, setCatalogResponse] = useState<{ key: string; data?: Catalog; error?: string }>();
  const [routesResponse, setRoutesResponse] = useState<{ key: string; routes?: DayRouteResult[]; error?: string }>();
  const [manualTravel, setManualTravel] = useState<Record<string, number>>({});
  const [picker, setPicker] = useState<number | null>(null);
  const [active, setActive] = useState(draftNodes[0]?.place.id || '');
  const [settingsOpen, setSettingsOpen] = useState(!day.blocks.some(block => block.places.length));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [catalogRetry, setCatalogRetry] = useState(0);
  const [variant, setVariant] = useState(0);
  const [edited, setEdited] = useState(false);
  const generation = useRef<AbortController | null>(null);
  const routeCache = useRef(new Map<string, DayRouteResult[]>());
  const cards = useRef(new Map<string, HTMLElement>());
  const profileKey = new URLSearchParams(profile.mode === 'member' ? { profile: 'member' } : { profile: 'custom', ageBand: profile.age, gender: profile.gender }).toString();
  const catalogKey = `${catalogRetry}:${profileKey}`;
  const catalog = catalogResponse?.key === catalogKey ? catalogResponse.data : undefined;
  const nodes = useMemo(() => draftNodes.map(node => { const source = catalog?.items.find(item => item.contentId === node.place.tourism?.contentId); return source ? { ...node, imageUrl: source.imageUrl, imageLicense: source.imageLicense, planning: source.planning } : node; }), [draftNodes, catalog]);
  const exclusions = tripExclusions(document, dayId);
  const routeKey = JSON.stringify({ transport: options.transport, legs: courseLegs(nodes) });
  const currentRoutes = routesResponse?.key === routeKey ? routesResponse : undefined;
  const routes = currentRoutes?.routes || [];
  const routeLoading = nodes.length > 1 && courseLegs(nodes).length > 0 && !currentRoutes;
  const schedule = scheduleCourse(nodes, options.start, options.end, routes, manualTravel, day.date);
  const points = useMemo(() => nodes.flatMap((node, index) => node.place.lat != null && node.place.lng != null ? [{ id: node.place.id, lat: node.place.lat, lng: node.place.lng, name: node.place.name, number: index + 1 }] : []), [nodes]);

  useEffect(() => {
    const controller = new AbortController();
    apiJson<Catalog>(`/api/tourism/nopi-catalog?${profileKey}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) })
      .then(data => { if (!controller.signal.aborted) setCatalogResponse({ key: catalogKey, data }); })
      .catch(cause => { if (!controller.signal.aborted) setCatalogResponse({ key: catalogKey, error: cause instanceof Error ? cause.message : '울산 자료를 불러오지 못했어요.' }); });
    return () => controller.abort();
  }, [profileKey, catalogKey]);
  useEffect(() => () => generation.current?.abort(), []);
  useEffect(() => {
    const payload = JSON.parse(routeKey) as { transport: 'walk' | 'car'; legs: ReturnType<typeof courseLegs> };
    if (!payload.legs.length) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const cached = routeCache.current.get(routeKey);
      (cached ? Promise.resolve({ legs: cached }) : getDayRoutes(payload.transport, payload.legs, controller.signal))
        .then(data => { if (!controller.signal.aborted) { if (routeCache.current.size >= 20) routeCache.current.clear(); routeCache.current.set(routeKey, data.legs); setRoutesResponse({ key: routeKey, routes: data.legs }); } })
        .catch(() => { if (!controller.signal.aborted) setRoutesResponse({ key: routeKey, error: '이동시간 조회에 실패했어요. 재조회하거나 직접 입력해 주세요.' }); });
    }, 500);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [routeKey, retry]);

  const updateNodes = (next: CourseNode[]) => { setNodes(next.map(node => ({ ...node, initialNotBefore: undefined }))); setEdited(true); setError(''); };
  const updateOptions = (patch: Partial<NopiOptions>) => { setOptions(previous => ({ ...previous, ...patch })); if (patch.start || patch.end || patch.transport) setNodes(previous => previous.map(node => ({ ...node, initialNotBefore: undefined }))); setManualTravel({}); setEdited(true); setError(''); };
  const select = (id: string) => { setActive(id); cards.current.get(id)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
  const close = () => { if (!edited || window.confirm('아직 일정에 반영하지 않은 코스를 닫을까요?')) { generation.current?.abort(); onClose(); } };
  const generate = async () => {
    if (!catalog || busy) return;
    const controller = new AbortController(); generation.current?.abort(); generation.current = controller;
    setBusy(true); setError('');
    try {
      const rejected = new Set<string>();
      for (let attempt = 0; attempt < 3; attempt++) {
        const suggested = suggestCourse(catalog.items, options, exclusions, rejected, variant);
        const result = await getDayRoutes(options.transport, courseLegs(suggested), controller.signal);
        if (controller.signal.aborted) return;
        const unavailable = result.legs.some(leg => leg.status !== 'ok');
        if (unavailable) throw Error('실제 이동시간을 확인하지 못해 자동 코스를 확정하지 않았어요. 잠시 후 다시 만들거나 직접 장소를 담아 주세요.');
        const tooFar = result.legs.filter(leg => (leg.durationMinutes || 0) > (options.transport === 'walk' ? 40 : 60));
        if (tooFar.length) {
          tooFar.forEach(leg => { const index = courseLegs(suggested).findIndex(item => item.id === leg.id); rejected.add(edgeId(suggested[index].place.tourism!.contentId, suggested[index + 1].place.tourism!.contentId)); });
          continue;
        }
        const checked = scheduleCourse(suggested, options.start, options.end, result.legs, {}, day.date);
        if (checked.errors.length) throw Error(checked.errors[0]);
        setNodes(suggested); setManualTravel({}); setEdited(true); setActive(suggested[0].place.id); setVariant(value => value + 1); setSettingsOpen(false);
        const key = JSON.stringify({ transport: options.transport, legs: courseLegs(suggested) });
        routeCache.current.set(key, result.legs);
        setRoutesResponse({ key, routes: result.legs });
        return;
      }
      throw Error('실제 이동이 긴 구간이 있어요. 권역을 좁히거나 다른 코스로 다시 만들어 주세요.');
    } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : '코스를 만들지 못했어요. 다시 시도해 주세요.'); }
    finally { if (generation.current === controller) { setBusy(false); generation.current = null; } }
  };
  const apply = (next: boolean) => {
    try { onApply(courseDay(day, nodes, options.start, options.end, routes, exclusions, manualTravel), options.transport, baseline, next); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '일정을 반영하지 못했어요.'); }
  };
  const disabledPlaces = { ...exclusions };
  nodes.forEach((node, index) => { if (index !== picker && node.place.tourism) disabledPlaces[node.place.tourism.contentId] = `이날 ${index + 1}번째 장소`; });
  const selectedNode = picker != null && picker < nodes.length ? nodes[picker] : undefined;
  const otherDayCount = Object.keys(exclusions).length;
  return <>
    <TripDialog title="노피의 코스플래닝" className="nopi-dialog" onClose={close}>
      <div className="nopi-headline"><div><span className="trip-eyebrow">ULSAN · DAY {String(dayIndex + 1).padStart(2, '0')}</span><h3>{shortDate(day.date)}, 우리의 여행을 이어볼까요?</h3><p>장소를 고르고, 순서를 바꾸고. 마음에 들면 이날 일정에 반영해요.</p></div></div>
      <fieldset className="nopi-settings" hidden={!settingsOpen} disabled={busy || disabled}>
        <label>출발 시간<input type="time" aria-label="코스 시작 시간" value={options.start} onChange={e => updateOptions({ start: e.target.value })} /></label><label>마치는 시간<input type="time" aria-label="코스 종료 시간" value={options.end} onChange={e => updateOptions({ end: e.target.value })} /></label>
        <label>이동수단<select aria-label="코스 이동수단" value={options.transport} onChange={e => updateOptions({ transport: e.target.value as 'walk' | 'car' })}><option value="walk">도보</option><option value="car">자가용·렌터카</option></select></label>
        <><label>여행 목적<select value={options.purpose} onChange={e => updateOptions({ purpose: e.target.value as Purpose })}>{['발견', '데이트', '친구모임', '가족여행', '자연산책', '문화여행'].map(value => <option key={value}>{value}</option>)}</select></label><label>어디서 여행할까요?<select value={options.district} onChange={e => updateOptions({ district: e.target.value })}><option value="">울산 전체</option>{['중구', '남구', '동구', '북구', '울주군'].map(value => <option key={value}>{value}</option>)}</select></label>
        <div className="nopi-profile"><label>추천 연령<select aria-label="노피 추천 연령" value={profile.mode === 'member' ? 'member' : profile.age} onChange={e => setProfile({ ...profile, mode: e.target.value === 'member' ? 'member' : 'custom', age: e.target.value === 'member' ? '' : e.target.value })}><option value="member">내 회원정보</option>{['10', '20', '30', '40', '50', '60', '70'].map(value => <option key={value} value={value}>{value === '10' ? '10대 이하' : value === '70' ? '70대 이상' : `${value}대`}</option>)}</select></label><label>성별<select aria-label="노피 추천 성별" disabled={profile.mode === 'member'} value={profile.mode === 'member' ? catalog?.profile?.gender || 'all' : profile.gender} onChange={e => setProfile({ ...profile, gender: e.target.value })}><option value="all">전체</option><option value="female">여성</option><option value="male">남성</option></select></label></div>
        <button className="trip-button primary nopi-generate" type="button" disabled={!catalog} onClick={() => void generate()}><img src={nopi} alt="" />{nodes.length ? '새 코스 추천받기' : '노피에게 맡기기'}</button></>
      </fieldset>
      <div className="nopi-status" role="status"><button className="trip-text-link" type="button" disabled={busy} aria-expanded={settingsOpen} onClick={() => setSettingsOpen(value => !value)}>{settingsOpen ? '조건 접기' : '시간·추천 조건 변경'}</button>{busy ? '노피가 가까운 장소를 연결하고 실제 이동시간을 확인하고 있어요…' : '추천받은 코스에서도 장소와 순서, 머무는 시간을 자유롭게 바꿀 수 있어요.'}{otherDayCount > 0 && <span>다른 날 담은 {otherDayCount}곳 제외</span>}{busy && <button className="trip-text-link" type="button" onClick={() => { generation.current?.abort(); setBusy(false); }}>추천 중단</button>}</div>
      {catalogResponse?.key === catalogKey && catalogResponse.error && <div className="trip-alert">{catalogResponse.error}<button type="button" onClick={() => setCatalogRetry(value => value + 1)}>자료 다시 받기</button></div>}
      {error && <div className="trip-alert" role="alert">{error}</div>}
      <div className="nopi-workbench">
        <section className="nopi-map-pane" aria-label="하루 코스 지도"><DayRouteMap points={points} activeId={active} onSelect={select} /><div className="nopi-map-caption"><strong>{nodes.length}곳을 잇는 하루</strong><span>점선은 방문 순서예요. 도로 모양과 다를 수 있어요.</span><small>이동시간은 현재 조회 기준 · 차량은 주차 여유 포함</small></div></section>
        <section className="nopi-route-pane" aria-label="하루 코스 편집" aria-busy={busy || routeLoading}>
          <div className="nopi-route-heading"><div><span className="trip-eyebrow">YOUR DAY</span><h3>{nodes.length ? `${nodes.length}곳, 하나의 여행` : '첫 장소부터 담아보세요'}</h3></div><button type="button" className="trip-button" disabled={busy || nodes.length >= 12} onClick={() => setPicker(nodes.length)}><TripIcon name="plus" />장소 담기</button></div>
          {!nodes.length && <div className="nopi-empty"><img src={nopi} alt="노피" /><h3>오늘은 어떤 발견을 할까요?</h3><p>{'위에서 여행 취향을 선택하면\n노피가 가까운 명소와 음식점을 이어드려요.'}</p><button className="trip-button" type="button" onClick={() => setPicker(0)}>직접 첫 장소 담기</button></div>}
          {schedule.stops.map(({ node, arrival, departure, wait, route, travel, manual }, index) => <div className="nopi-stop-wrap" key={node.place.id} ref={element => { if (element) cards.current.set(node.place.id, element); else cards.current.delete(node.place.id); }}>
            {index > 0 && <div className="nopi-leg"><span>{options.transport === 'walk' ? '도보' : '차량'} · {routeLoading ? '이동 확인 중…' : travel == null ? '이동시간 확인 필요' : `${travel}분${manual ? ' · 직접 입력' : route?.distanceMeters != null ? ` · ${route.distanceMeters < 1000 ? `${Math.round(route.distanceMeters)}m` : `${(route.distanceMeters / 1000).toFixed(1)}km`}` : ''}`}</span>{!routeLoading && !route && <label>직접 입력 <input aria-label={`${index + 1}번째 장소까지 이동시간`} type="number" min={0} max={600} value={manualTravel[edgeId(nodes[index - 1].place.id, node.place.id)] ?? ''} onChange={e => { const id = edgeId(nodes[index - 1].place.id, node.place.id); setManualTravel(previous => { const next = { ...previous }; if (e.target.value === '') delete next[id]; else next[id] = Math.max(0, Math.min(600, Math.round(Number(e.target.value)))); return next; }); setEdited(true); }} /> 분</label>}</div>}
            <article className={`nopi-stop ${active === node.place.id ? 'selected' : ''}`}>
              <button className="nopi-stop-overview" type="button" onClick={() => select(node.place.id)}><b>{index + 1}</b>{node.imageUrl && <img src={node.imageUrl} alt="" onError={e => { e.currentTarget.style.display = 'none'; }} />}<div><span>{routeLoading || schedule.errors.some(message => message.includes('이동시간')) ? '시간 확인 중' : `${clock(arrival)} — ${clock(departure)}`} · {node.place.type}</span><h4>{node.place.name}</h4><p>{node.place.address}</p></div></button>
              {node.imageUrl && <small className="nopi-photo-credit">사진 © 한국관광공사{node.imageLicense === 'Type3' ? ' · 공공누리 3유형' : node.imageLicense === 'Type1' ? ' · 공공누리 1유형' : ''}</small>}
              {!routeLoading && wait > 0 && <p className="nopi-reason">{wait}분 여유 · 예정된 방문 시간에 맞춰 이동해요.</p>}{node.reason && <p className="nopi-reason">{node.reason}</p>}
              {node.planning && <details className="nopi-facts"><summary>운영시간·메뉴 확인</summary>{node.planning.menu && <p>메뉴 · {node.planning.menu}</p>}<p>운영 · {node.planning.hours || '정보 없음'}</p><p>휴무 · {node.planning.closed || '정보 없음'}</p><small>임시 휴무·예약 여부는 지도에서 확인해 주세요.</small></details>}
              <div className="nopi-stop-actions"><label>머무는 시간<input type="number" aria-label={`${node.place.name} 체류시간`} min={10} max={600} value={node.place.durationMinutes} disabled={busy} onChange={e => updateNodes(nodes.map((item, i) => i === index ? { ...item, place: { ...item.place, durationMinutes: Number(e.target.value) } } : item))} />분</label><button type="button" className="trip-text-link" disabled={busy} onClick={() => setPicker(index)}>장소 변경·상세</button><a href={`https://map.naver.com/p/search/${encodeURIComponent(`${node.place.name} ${node.place.address}`)}`} target="_blank" rel="noreferrer">지도 ↗</a><div><button type="button" aria-label={`${node.place.name} 위로`} disabled={busy || !index} onClick={() => { const copy = [...nodes]; [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]]; updateNodes(copy); }}><TripIcon name="up" /></button><button type="button" aria-label={`${node.place.name} 아래로`} disabled={busy || index === nodes.length - 1} onClick={() => { const copy = [...nodes]; [copy[index + 1], copy[index]] = [copy[index], copy[index + 1]]; updateNodes(copy); }}><TripIcon name="down" /></button><button type="button" aria-label={`${node.place.name} 제거`} disabled={busy} onClick={() => updateNodes(nodes.filter((_, i) => i !== index))}><TripIcon name="close" /></button></div></div>
            </article>
          </div>)}
          {currentRoutes?.error && <p className="trip-alert">{currentRoutes.error}</p>}
          {nodes.length > 1 && <button type="button" className="trip-text-link" disabled={busy || routeLoading} onClick={() => { routeCache.current.delete(routeKey); setRoutesResponse(undefined); setRetry(value => value + 1); }}>이동시간 다시 확인</button>}
          {!routeLoading && schedule.errors.length > 0 && nodes.length > 0 && <div className="trip-alert" role="status">{schedule.errors[0]}</div>}
        </section>
      </div>
      <footer className="nopi-footer"><div><strong>{shortDate(day.date)} · {nodes.length}곳</strong><span>{day.blocks.some(block => block.places.length) ? '반영하면 이날의 기존 구간을 이 코스로 교체해요. 되돌리기로 복구할 수 있어요.' : '확인한 코스만 일정에 반영해요.'}</span></div><button className="trip-button" type="button" disabled={busy || routeLoading || disabled || !nodes.length || !!schedule.errors.length} onClick={() => apply(false)}>이날 일정에 반영</button><button className="trip-button primary" type="button" disabled={busy || routeLoading || disabled || !nodes.length || !!schedule.errors.length} onClick={() => apply(true)}>{dayIndex + 1 < document.days.length ? '반영하고 다음 날 만들기' : '반영하고 전체 일정 보기'}<TripIcon name="arrow" /></button></footer>
    </TripDialog>
    {picker != null && <TourismPicker destination={document.destination} initial={selectedNode?.place.tourism ? attractionFromPlace(selectedNode.place) : undefined} initialDuration={selectedNode?.place.durationMinutes || 75} disabledPlaces={disabledPlaces} context={`DAY ${dayIndex + 1} · ${selectedNode ? '장소 변경' : '새 장소 담기'}`} onClose={() => setPicker(null)} onSelect={(place, duration) => { if (disabledPlaces[place.contentId]) throw Error('이미 여행에 담은 장소예요.'); const node = tourismNode(catalog?.items.find(item => item.contentId === place.contentId) || place, duration); updateNodes(picker < nodes.length ? nodes.map((item, index) => index === picker ? { ...node, notBefore: item.notBefore } : item) : [...nodes, node]); setActive(node.place.id); setPicker(null); }} />}
  </>;
}
