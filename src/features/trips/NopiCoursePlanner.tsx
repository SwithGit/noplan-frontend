import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from 'react';
import { apiJson } from '../../api/client';
import { beginPcOperation, diagnosticReason } from '../../api/pcDiagnostics';
import { getDayRoutes, type DayRouteResult } from '../../api/dayRouteApi';
import type { TourismSearchResult } from '../../api/tourismApi';
import { TripDialog } from './TripDialog';
import { TripIcon } from './TripIcon';
import { DayRouteMap } from './DayRouteMap';
import { PlacePicker } from './PlacePicker';
import { placeKeys, replacementNotes } from './placeIdentity';
import { clock, shortDate, transportLabels, type TripDay, type TripDocument } from './tripModel';
import { courseDistanceLabel, courseDistanceLimit } from './coursePolicy';
import { generateNearbyCourse } from './nopiRouting';
import { courseLegs, edgeId, scheduleCourse, tourismNode, type CourseNode, type NopiAttraction, type NopiOptions, type Purpose } from './nopiModel';
import { buildNopiDays, createNopiDrafts, nopiDraftExclusions, nopiRouteKey, type NopiDayDraft } from './nopiDraft';
import nopi from '../../assets/nopi/nopi-icon.png';
import './dayRoute.css';
import './nopiPlanner.css';

type Catalog = Omit<TourismSearchResult, 'items'> & { items: NopiAttraction[] };
export function NopiCoursePlanner({ document: sourceDocument, dayId: initialDayId, disabled, onClose, onApply }: {
  document: TripDocument; dayId: string; disabled: boolean; onClose: () => void;
  onApply: (days: TripDay[], baseline: string, overview: boolean, activeDayId: string) => void;
}) {
  // Keep one editing snapshot; the workspace checks it against live shared state
  // before applying, so concurrent changes cannot silently overwrite a trip.
  const [document] = useState(sourceDocument);
  const [dayId, setDayId] = useState(initialDayId);
  const day = document.days.find(item => item.id === dayId)!;
  const dayIndex = document.days.indexOf(day);
  const [baseline] = useState(() => JSON.stringify(document));
  const [drafts, setDrafts] = useState(() => createNopiDrafts(document));
  const draft = drafts[dayId];
  const patchDay = useCallback((patch: Partial<NopiDayDraft> | ((previous: NopiDayDraft) => Partial<NopiDayDraft>)) => {
    setDrafts(previous => ({ ...previous, [dayId]: { ...previous[dayId], ...(typeof patch === 'function' ? patch(previous[dayId]) : patch) } }));
  }, [dayId]);
  const [common, setCommon] = useState<{ purpose: Purpose; district: string }>(() => ({ purpose: document.companion === '연인' ? '데이트' : document.companion === '가족' ? '가족여행' : document.companion === '친구' ? '친구모임' : '발견', district: '' }));
  const [profile, setProfile] = useState({ mode: 'member', age: '', gender: 'all' });
  const [commonExpanded, setCommonExpanded] = useState(true);
  const [daySettingsOpen, setDaySettingsOpen] = useState(true);
  const options: NopiOptions = { date: day.date, start: draft.start, end: draft.end, transport: draft.transport, ...common };
  const { nodes: draftNodes, routesResponse, manualTravel, variant, error, notice: generationNotice } = draft;
  const setError = (error: string) => patchDay({ error });
  const setManualTravel = (value: SetStateAction<Record<string, number>>) => patchDay(previous => ({ manualTravel: typeof value === 'function' ? value(previous.manualTravel) : value, edited: true }));
  const [catalogResponse, setCatalogResponse] = useState<{ key: string; data?: Catalog; error?: string }>();
  const [picker, setPicker] = useState<number | null>(null);
  const [active, setActive] = useState('');
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const [catalogRetry, setCatalogRetry] = useState(0);
  const edited = Object.values(drafts).some(item => item.edited);
  const generation = useRef<AbortController | null>(null);
  const routeCache = useRef(new Map<string, DayRouteResult[]>());
  const cards = useRef(new Map<string, HTMLElement>());
  const profileKey = new URLSearchParams(profile.mode === 'member' ? { profile: 'member' } : { profile: 'custom', ageBand: profile.age, gender: profile.gender }).toString();
  const catalogKey = `${catalogRetry}:${profileKey}`;
  const catalog = catalogResponse?.key === catalogKey ? catalogResponse.data : undefined;
  const nodes = useMemo(() => draftNodes.map(node => { const source = catalog?.items.find(item => item.contentId === node.place.tourism?.contentId); return source ? { ...node, imageUrl: source.imageUrl, imageLicense: source.imageLicense, planning: source.planning } : node; }), [draftNodes, catalog]);
  const exclusions = nopiDraftExclusions(document, drafts, dayId);
  const routeKey = nopiRouteKey(draft);
  const currentRoutes = routesResponse?.key === routeKey ? routesResponse : undefined;
  const routes = currentRoutes?.routes || [];
  const routeLoading = options.transport !== 'transit' && nodes.length > 1 && courseLegs(nodes).length > 0 && !currentRoutes;
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
    const payload = JSON.parse(routeKey) as { transport: NopiOptions['transport']; legs: ReturnType<typeof courseLegs> };
    if (!payload.legs.length || payload.transport === 'transit') return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const cached = routeCache.current.get(routeKey);
      (cached ? Promise.resolve({ legs: cached }) : getDayRoutes(payload.transport, payload.legs, controller.signal))
        .then(data => { if (!controller.signal.aborted) { if (routeCache.current.size >= 20) routeCache.current.clear(); routeCache.current.set(routeKey, data.legs); patchDay({ routesResponse: { key: routeKey, routes: data.legs } }); } })
        .catch(() => { if (!controller.signal.aborted) patchDay({ routesResponse: { key: routeKey, error: '이동시간 조회에 실패했어요. 재조회하거나 직접 입력해 주세요.' } }); });
    }, 500);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [routeKey, retry, patchDay]);

  const updateNodes = (next: CourseNode[]) => patchDay({ nodes: next.map(node => ({ ...node, initialNotBefore: undefined })), edited: true, error: '', notice: '' });
  const updateOptions = (patch: Partial<Pick<NopiDayDraft, 'start' | 'end' | 'transport'>>) => patchDay(previous => ({ ...patch, nodes: previous.nodes.map(node => ({ ...node, initialNotBefore: undefined })), manualTravel: {}, edited: true, error: '', notice: '' }));
  const selectDay = (id: string) => { if (busy) return; setDayId(id); setDaySettingsOpen(!drafts[id].nodes.length); setPicker(null); setActive(''); };
  const select = (id: string) => { setActive(id); cards.current.get(id)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
  const close = () => { if (!edited || window.confirm('아직 일정에 반영하지 않은 코스를 닫을까요?')) { generation.current?.abort(); onClose(); } };
  const generate = async () => {
    if (!catalog || busy) return;
    const controller = new AbortController(); generation.current?.abort(); generation.current = controller;
    const diagnostic = beginPcOperation('course_generate', { transport: options.transport, district: options.district, purpose: options.purpose, startTime: options.start, endTime: options.end, catalogCount: catalog.items.length, excludedCount: document.days.filter(d => d.id !== dayId).reduce((sum, d) => sum + drafts[d.id].nodes.length, 0), limitMeters: courseDistanceLimit(options.transport), variant });
    controller.signal.addEventListener('abort', () => diagnostic.finish('cancelled'), { once: true });
    setBusy(true); patchDay({ error: '', notice: '' });
    try {
      const result = await generateNearbyCourse(catalog.items, options, exclusions, (transport, legs, signal) => getDayRoutes(transport, legs, signal, diagnostic.operationId), controller.signal, variant);
      if (controller.signal.aborted) return;
      diagnostic.finish('success', { resultCount: result.nodes.length, placeIds: result.nodes.flatMap(node => node.place.tourism ? [node.place.tourism.contentId] : []), distanceMeters: Math.round(result.meters), partial: Boolean(result.notice) });
      patchDay({ nodes: result.nodes, manualTravel: {}, edited: true, variant: variant + 1, notice: result.notice }); setActive(result.nodes[0].place.id); setCommonExpanded(false); setDaySettingsOpen(false);
      const key = JSON.stringify({ transport: options.transport, legs: courseLegs(result.nodes) });
      routeCache.current.set(key, result.routes);
      patchDay({ routesResponse: { key, routes: result.routes } });
    } catch (cause) { diagnostic.finish(controller.signal.aborted ? 'cancelled' : 'error', { reason: diagnosticReason(cause) }); if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : '코스를 만들지 못했어요. 다시 시도해 주세요.'); }
    finally { if (generation.current === controller) { setBusy(false); generation.current = null; } }
  };
  const changedDayCount = Object.values(drafts).filter(item => item.edited && item.nodes.length).length;
  const apply = (overview: boolean) => {
    try {
      const hydrated = Object.fromEntries(Object.entries(drafts).map(([id, item]) => [id, { ...item, nodes: item.nodes.map(node => {
        const source = catalog?.items.find(place => place.contentId === node.place.tourism?.contentId);
        return source ? { ...node, planning: source.planning } : node;
      }) }]));
      const nextDays = buildNopiDays(document, hydrated);
      if (!nextDays.length && !document.days.some(d => d.blocks.some(b => b.places.length))) throw Error('먼저 날짜를 골라 코스를 만들어 주세요.');
      onApply(nextDays, baseline, overview, dayId);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '일정을 반영하지 못했어요.'); }
  };
  const disabledPlaces = { ...exclusions };
  nodes.forEach((node, index) => { if (index !== picker) placeKeys(node.place).forEach(key => { disabledPlaces[key] = `이날 ${index + 1}번째 장소`; }); });
  const selectedNode = picker != null && picker < nodes.length ? nodes[picker] : undefined;
  const otherDayCount = document.days.filter(d => d.id !== dayId).reduce((sum, d) => sum + drafts[d.id].nodes.length, 0);
  const generateButton = <button className="trip-button primary nopi-generate" type="button" disabled={!catalog || busy || disabled || options.transport === 'transit'} onClick={() => void generate()}><img src={nopi} alt="" />{busy ? '가까운 코스 찾는 중…' : '이 날짜 노피에게 맡기기'}</button>;
  return <>
    <TripDialog title="노피의 코스플래닝" className={`nopi-dialog ${nodes.length ? 'nopi-has-course' : 'nopi-setup-dialog'}`} onClose={close}>
      <div className="nopi-plan-controls">
        <section className="nopi-common" aria-label="모든 날짜 공통 조건">
          <div className="nopi-section-heading"><div><h3>어떤 여행을 떠나볼까요?</h3><span>모든 날짜에 공통 적용</span></div><div><span>{document.destination} · {document.startDate.slice(5).replace('-', '.')} — {document.endDate.slice(5).replace('-', '.')}</span><button type="button" className="trip-text-link" aria-expanded={commonExpanded} onClick={() => setCommonExpanded(v => !v)}>{commonExpanded ? '접기' : '조건 변경'}</button></div></div>
          {commonExpanded ? <fieldset className="nopi-common-fields" disabled={busy || disabled}>
            <label>코스 목적<select aria-label="공통 코스 목적" value={common.purpose} onChange={e => setCommon({ ...common, purpose: e.target.value as Purpose })}>{['발견', '데이트', '친구모임', '가족여행', '자연산책', '문화여행'].map(value => <option key={value}>{value}</option>)}</select></label>
            <label>지역<select aria-label="공통 추천 지역" value={common.district} onChange={e => setCommon({ ...common, district: e.target.value })}><option value="">울산 전체</option>{['중구', '남구', '동구', '북구', '울주군'].map(value => <option key={value}>{value}</option>)}</select></label>
            <label>연령<select aria-label="노피 추천 연령" value={profile.mode === 'member' ? 'member' : profile.age} onChange={e => setProfile({ ...profile, mode: e.target.value === 'member' ? 'member' : 'custom', age: e.target.value === 'member' ? '' : e.target.value })}><option value="member">내 회원정보</option>{['10', '20', '30', '40', '50', '60', '70'].map(value => <option key={value} value={value}>{value === '10' ? '10대 이하' : value === '70' ? '70대 이상' : `${value}대`}</option>)}</select></label>
            <label>성별<select aria-label="노피 추천 성별" disabled={profile.mode === 'member'} value={profile.mode === 'member' ? catalog?.profile?.gender || 'all' : profile.gender} onChange={e => setProfile({ ...profile, gender: e.target.value })}><option value="all">전체</option><option value="female">여성</option><option value="male">남성</option></select></label>
          </fieldset> : <p className="nopi-common-summary">{common.purpose} · {common.district || '울산 전체'} · {profile.mode === 'member' ? catalog?.profile?.label || '내 회원정보' : `${profile.age}대 · ${profile.gender === 'female' ? '여성' : profile.gender === 'male' ? '남성' : '성별 전체'}`}</p>}
        </section>
        <section className="nopi-days-panel" aria-label="날짜별 추천 조건">
          <div className="nopi-section-heading"><div><h3>날짜별 일정</h3><span>하루씩, 우리에게 맞게</span></div><small>만든 코스는 유지하고, 바꾼 공통 조건은 다음 추천부터 적용해요.</small></div>
          <div className="nopi-day-tabs" role="tablist" aria-label="코스를 만들 날짜">{document.days.map((item, index) => { const saved = drafts[item.id]; return <button type="button" role="tab" key={item.id} id={`nopi-tab-${item.id}`} aria-controls="nopi-selected-day" aria-selected={item.id === dayId} disabled={busy} onClick={() => selectDay(item.id)}><span>DAY {String(index + 1).padStart(2, '0')}<small>{saved.nodes.length ? `${saved.nodes.length}곳${saved.edited ? ' · 반영 전' : ''}` : item.id === dayId ? '선택됨' : '일정 만들기'}</small></span><strong>{shortDate(item.date)}</strong><span>{saved.start}–{saved.end} · {transportLabels[saved.transport]}</span></button>; })}</div>
          <div id="nopi-selected-day" className="nopi-selected-day" role="tabpanel" aria-labelledby={`nopi-tab-${dayId}`}>
            <div className="nopi-section-heading"><h3>{shortDate(day.date)}, 우리의 여행을 이어볼까요?</h3><span className="nopi-day-only">이 날짜에만 적용</span></div>
            {daySettingsOpen ? <fieldset className="nopi-day-fields" disabled={busy || disabled}><label>출발 시간<input type="time" aria-label="코스 시작 시간" value={options.start} onChange={e => updateOptions({ start: e.target.value })} /></label><label>마치는 시간<input type="time" aria-label="코스 종료 시간" value={options.end} onChange={e => updateOptions({ end: e.target.value })} /></label><label>이동수단<select aria-label="코스 이동수단" value={options.transport} onChange={e => updateOptions({ transport: e.target.value as NopiOptions['transport'] })}><option value="walk">도보 · 최대 1km</option><option value="car">자가용·렌터카 · 최대 7km</option><option value="transit">대중교통 · 직접 편집</option></select></label>{generateButton}</fieldset> : <div className="nopi-day-compact"><span>{options.start}–{options.end} · {transportLabels[options.transport]}{options.transport !== 'transit' ? ` · 최대 ${courseDistanceLimit(options.transport) / 1000}km` : ''}</span><button type="button" className="trip-text-link" disabled={busy} onClick={() => setDaySettingsOpen(true)}>이날 조건 변경</button>{generateButton}</div>}

          </div>
        </section>
      </div>
      {options.transport === 'transit' && <p className="trip-alert">저장한 대중교통 설정을 유지했어요. 자동 코스를 이용하려면 이동수단을 도보 또는 차량으로 변경해 주세요.</p>}
      {generationNotice && <p className="trip-alert" role="status">{generationNotice}</p>}
      <div className="nopi-status" role="status">{busy ? '가까운 장소와 실제 이동시간을 확인하고 있어요…' : '날짜를 오가도 작업 중인 코스는 유지돼요.'}<span>✓ 다른 날짜에 담은 장소 제외{otherDayCount > 0 ? ` · ${otherDayCount}곳` : ''}</span>{busy && <button className="trip-text-link" type="button" onClick={() => { generation.current?.abort(); setBusy(false); }}>추천 중단</button>}</div>
      {catalogResponse?.key === catalogKey && catalogResponse.error && <div className="trip-alert">{catalogResponse.error}<button type="button" onClick={() => setCatalogRetry(value => value + 1)}>자료 다시 받기</button></div>}
      {error && <div className="trip-alert" role="alert">{error}</div>}
      {nodes.length > 0 ? <div className="nopi-workbench">
        <section className="nopi-map-pane" aria-label="하루 코스 지도"><DayRouteMap points={points} activeId={active} onSelect={select} /><div className="nopi-map-caption"><strong>{nodes.length}곳을 잇는 하루</strong><span>점선은 방문 순서예요. 도로 모양과 다를 수 있어요.</span><small>이동시간은 현재 조회 기준 · 차량은 주차 여유 포함</small></div></section>
        <section className="nopi-route-pane" aria-label="하루 코스 편집" aria-busy={busy || routeLoading}>
          <div className="nopi-route-heading"><div><span className="trip-eyebrow">YOUR DAY</span><h3>{nodes.length ? `${nodes.length}곳, 하나의 여행` : '첫 장소부터 담아보세요'}</h3></div><button type="button" className="trip-button" disabled={busy || nodes.length >= 12} onClick={() => setPicker(nodes.length)}><TripIcon name="plus" />장소 담기</button></div>
          {!nodes.length && <div className="nopi-empty"><img src={nopi} alt="노피" /><h3>오늘은 어떤 발견을 할까요?</h3><p>{'위에서 여행 취향을 선택하면\n노피가 가까운 명소와 음식점을 이어드려요.'}</p><button className="trip-button" type="button" onClick={() => setPicker(0)}>직접 첫 장소 담기</button></div>}
          {schedule.stops.map(({ node, arrival, departure, wait, route, travel, manual }, index) => <div className="nopi-stop-wrap" key={node.place.id} ref={element => { if (element) cards.current.set(node.place.id, element); else cards.current.delete(node.place.id); }}>
            {index > 0 && <div className="nopi-leg"><span>{transportLabels[options.transport]} · {routeLoading ? '이동 확인 중…' : travel == null ? '이동시간 확인 필요' : `${travel}분${manual ? ' · 직접 입력' : route?.distanceMeters != null ? ` · ${route.distanceMeters < 1000 ? `${Math.round(route.distanceMeters)}m` : `${(route.distanceMeters / 1000).toFixed(1)}km`}` : ''}`}</span>{!routeLoading && route?.distanceMeters != null && courseDistanceLimit(options.transport) > 0 && route.distanceMeters > courseDistanceLimit(options.transport) && <strong className="nopi-distance-warning">자동 추천 기준({courseDistanceLabel(options.transport)})을 넘는 구간이에요. 장소를 바꾸거나 순서를 조정해 주세요.</strong>}{!routeLoading && !route && <label>직접 입력 <input aria-label={`${index + 1}번째 장소까지 이동시간`} type="number" min={0} max={600} value={manualTravel[edgeId(nodes[index - 1].place.id, node.place.id)] ?? ''} onChange={e => { const id = edgeId(nodes[index - 1].place.id, node.place.id); setManualTravel(previous => { const next = { ...previous }; if (e.target.value === '') delete next[id]; else next[id] = Math.max(0, Math.min(600, Math.round(Number(e.target.value)))); return next; }); }} /> 분</label>}</div>}
            <article className={`nopi-stop ${active === node.place.id ? 'selected' : ''}`}>
              <button className="nopi-stop-overview" type="button" onClick={() => select(node.place.id)}><b>{index + 1}</b>{node.imageUrl && <img src={node.imageUrl} alt="" onError={e => { e.currentTarget.style.display = 'none'; }} />}<div><span>{routeLoading || schedule.errors.some(message => message.includes('이동시간')) ? '시간 확인 중' : `${clock(arrival)} — ${clock(departure)}`} · {node.place.type}</span><h4>{node.place.name}</h4><p>{node.place.address}</p></div></button>
              {node.imageUrl && <small className="nopi-photo-credit">사진 © 한국관광공사{node.imageLicense === 'Type3' ? ' · 공공누리 3유형' : node.imageLicense === 'Type1' ? ' · 공공누리 1유형' : ''}</small>}
              {!routeLoading && wait > 0 && <p className="nopi-reason">{wait}분 여유 · 예정된 방문 시간에 맞춰 이동해요.</p>}{node.reason && <p className="nopi-reason">{node.reason}</p>}
              {node.planning && <details className="nopi-facts"><summary>운영시간·메뉴 확인</summary>{node.planning.menu && <p>메뉴 · {node.planning.menu}</p>}<p>운영 · {node.planning.hours || '정보 없음'}</p><p>휴무 · {node.planning.closed || '정보 없음'}</p><small>임시 휴무·예약 여부는 지도에서 확인해 주세요.</small></details>}
              <div className="nopi-stop-actions"><label>머무는 시간<input type="number" aria-label={`${node.place.name} 체류시간`} min={node.place.type === '카페' ? 30 : 10} max={600} value={node.place.durationMinutes} disabled={busy} onChange={e => updateNodes(nodes.map((item, i) => i === index ? { ...item, place: { ...item.place, durationMinutes: Number(e.target.value) } } : item))} />분</label><button type="button" className="trip-text-link" disabled={busy} onClick={() => setPicker(index)}>장소 변경·상세</button><a href={`https://map.naver.com/p/search/${encodeURIComponent(`${node.place.name} ${node.place.address}`)}`} target="_blank" rel="noreferrer">지도 ↗</a><div><button type="button" aria-label={`${node.place.name} 위로`} disabled={busy || !index} onClick={() => { const copy = [...nodes]; [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]]; updateNodes(copy); }}><TripIcon name="up" /></button><button type="button" aria-label={`${node.place.name} 아래로`} disabled={busy || index === nodes.length - 1} onClick={() => { const copy = [...nodes]; [copy[index + 1], copy[index]] = [copy[index], copy[index + 1]]; updateNodes(copy); }}><TripIcon name="down" /></button><button type="button" aria-label={`${node.place.name} 제거`} disabled={busy} onClick={() => updateNodes(nodes.filter((_, i) => i !== index))}><TripIcon name="close" /></button></div></div>
            </article>
          </div>)}
          {currentRoutes?.error && <p className="trip-alert">{currentRoutes.error}</p>}
          {nodes.length > 1 && <button type="button" className="trip-text-link" disabled={busy || routeLoading} onClick={() => { routeCache.current.delete(routeKey); patchDay({ routesResponse: undefined }); setRetry(value => value + 1); }}>이동시간 다시 확인</button>}
          {!routeLoading && schedule.errors.length > 0 && nodes.length > 0 && <div className="trip-alert" role="status">{schedule.errors[0]}</div>}
        </section>
      </div> : <div className="nopi-setup-empty"><img src={nopi} alt="" /><div><strong>이날의 첫 코스를 만들어볼까요?</strong><span>위 버튼으로 추천받거나 가고 싶은 장소를 직접 담아보세요.</span></div><button className="trip-button" type="button" disabled={busy || disabled} onClick={() => setPicker(0)}>장소 담기</button></div>}
      <footer className="nopi-footer"><div><strong>{changedDayCount ? `${changedDayCount}일의 코스 · 반영 준비 중` : `${document.days.length}일의 여행을 하루씩 채워요`}</strong><span>날짜 카드를 눌러 다른 날도 만들고, 작성한 일정을 한 번에 반영해요.</span></div><button className="trip-button" type="button" disabled={busy || routeLoading || disabled || !changedDayCount} onClick={() => apply(false)}>작성한 일정 반영</button><button className="trip-button primary" type="button" disabled={busy || routeLoading || disabled || (!changedDayCount && !document.days.some(d => d.blocks.some(b => b.places.length)))} onClick={() => apply(true)}>반영하고 전체 일정 보기<TripIcon name="arrow" /></button></footer>
    </TripDialog>
    {picker != null && <PlacePicker destination={document.destination} initial={selectedNode?.place} excluded={disabledPlaces} context={`DAY ${dayIndex + 1} · ${selectedNode ? '장소 변경' : '새 장소 담기'}`} onClose={() => setPicker(null)} onSelect={(place, attraction) => { const node: CourseNode = attraction ? tourismNode(catalog?.items.find(item => item.contentId === attraction.contentId) || attraction, place.durationMinutes) : { place }; updateNodes(picker < nodes.length ? nodes.map((item, index) => index === picker ? { ...node, originalNotes: replacementNotes(item.originalNotes) } : item) : [...nodes, node]); setActive(node.place.id); setPicker(null); }} />}
  </>;
}
