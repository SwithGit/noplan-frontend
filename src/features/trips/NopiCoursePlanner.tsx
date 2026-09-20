import { TravelNeedsForm } from './TravelNeedsForm';
import { TravelSupportPanel } from './TravelSupportPanel';
import { normalizeNeeds, hasTravelNeeds, evaluateNeeds, type TravelNeeds } from './travelNeeds';
import { getSupportCatalog, getDiscovery } from '../../api/travelSupportApi';
import { TourismText } from '../../i18n/TourismText';
import { t as uiText } from '../../i18n/translate';
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
  onApply: (days: TripDay[], baseline: string, overview: boolean, activeDayId: string, needs: TravelNeeds) => void;
}) {
  // Keep one editing snapshot; the workspace checks it against live shared state
  // before applying, so concurrent changes cannot silently overwrite a trip.
  const [document] = useState(sourceDocument);
  const [needs, setNeeds] = useState(() => normalizeNeeds(sourceDocument.needs));
  const needsEdited = JSON.stringify(needs) !== JSON.stringify(normalizeNeeds(document.needs));
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
  const [commonExpanded, setCommonExpanded] = useState(() => !draft.nodes.length);
  const [daySettingsOpen, setDaySettingsOpen] = useState(() => !draft.nodes.length);
  const options: NopiOptions = { date: day.date, start: draft.start, end: draft.end, transport: draft.transport, needs, ...common };
  const { nodes: draftNodes, routesResponse, manualTravel, variant, error, notice: generationNotice } = draft;
  const setError = (error: string) => patchDay({ error });
  const setManualTravel = (value: SetStateAction<Record<string, number>>) => patchDay(previous => ({ manualTravel: typeof value === 'function' ? value(previous.manualTravel) : value, edited: true }));
  const [catalogResponse, setCatalogResponse] = useState<{ key: string; data?: Catalog; error?: string }>();
  const [picker, setPicker] = useState<number | null>(null);
  const [active, setActive] = useState('');
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const [catalogRetry, setCatalogRetry] = useState(0);
  const edited = needsEdited || Object.values(drafts).some(item => item.edited);
  const generation = useRef<AbortController | null>(null);
  const routeCache = useRef(new Map<string, DayRouteResult[]>());
  const cards = useRef(new Map<string, HTMLElement>());
  const profileKey = new URLSearchParams(profile.mode === 'member' ? { profile: 'member' } : { profile: 'custom', ageBand: profile.age, gender: profile.gender }).toString();
  const catalogQuery = `${profileKey}&destination=${encodeURIComponent(document.destination)}`;
  const catalogKey = `${catalogRetry}:${catalogQuery}`;
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
    apiJson<Catalog>(`/api/tourism/nopi-catalog?${catalogQuery}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) })
      .then(data => { if (!controller.signal.aborted) setCatalogResponse({ key: catalogKey, data }); })
      .catch(cause => { if (!controller.signal.aborted) setCatalogResponse({ key: catalogKey, error: cause instanceof Error ? cause.message : '지역 자료를 불러오지 못했어요.' }); });
    return () => controller.abort();
  }, [catalogQuery, catalogKey]);
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
  const selectDay = (id: string) => { if (busy) return; setDayId(id); setDaySettingsOpen(!drafts[id].nodes.length); if (drafts[id].nodes.length) setCommonExpanded(false); setPicker(null); setActive(''); };
  const select = (id: string) => { setActive(id); cards.current.get(id)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
  const close = () => { if (!edited || window.confirm('아직 일정에 반영하지 않은 코스를 닫을까요?')) { generation.current?.abort(); onClose(); } };
  const generate = async () => {
    if (!catalog || busy) return;
    const controller = new AbortController(); generation.current?.abort(); generation.current = controller;
    const diagnostic = beginPcOperation('course_generate', { transport: options.transport, district: options.district, purpose: options.purpose, startTime: options.start, endTime: options.end, catalogCount: catalog.items.length, excludedCount: document.days.filter(d => d.id !== dayId).reduce((sum, d) => sum + drafts[d.id].nodes.length, 0), limitMeters: courseDistanceLimit(options.transport), variant });
    controller.signal.addEventListener('abort', () => diagnostic.finish('cancelled'), { once: true });
    setBusy(true); patchDay({ error: '', notice: '' });
    try {
      const destination = common.district ? ((catalog.scope?.name || document.destination) + ' ' + common.district) : document.destination;
      const [support, discovery] = await Promise.all([
        getSupportCatalog(destination, needs, controller.signal),
        getDiscovery(destination, undefined, controller.signal).catch(() => undefined),
      ]);
      controller.signal.throwIfAborted();
      const byId = new Map(support.items.map(item => [item.contentId, item]));
      if (hasTravelNeeds(needs) && support.unavailable && !support.items.some(item => evaluateNeeds(item, needs).eligible)) throw Error('여행 조건 정보를 불러오지 못했어요. 잠시 후 다시 확인해 주세요.');
      controller.signal.throwIfAborted();
      const centers = new Map(discovery?.items.map(p => [p.contentId, p.centralRank]) || []);
      const anchor = discovery?.items.find(p => !(p.contentTypeId === '38' && (p.classification === 'SH01' || /백화점|더현대/.test(p.name))) && evaluateNeeds(byId.get(p.contentId), needs).eligible);
      const related = anchor ? await getDiscovery(destination, anchor.contentId, controller.signal).catch(() => undefined) : undefined;
      controller.signal.throwIfAborted();
      const relatedRanks = new Map(related?.items.map(p => [p.contentId, p.relatedRank]) || []);
      const candidates = catalog.items.map(place => ({ ...place, support: byId.get(place.contentId), centralRank: centers.get(place.contentId), relatedRank: relatedRanks.get(place.contentId) }));
      const result = await generateNearbyCourse(candidates, options, exclusions, (transport, legs, signal) => getDayRoutes(transport, legs, signal, diagnostic.operationId), controller.signal, variant);
      if (controller.signal.aborted) return;
      diagnostic.finish('success', { resultCount: result.nodes.length, placeIds: result.nodes.flatMap(node => node.place.tourism ? [node.place.tourism.contentId] : []), distanceMeters: Math.round(result.meters), partial: Boolean(result.notice) });
      patchDay({ nodes: result.nodes, manualTravel: {}, edited: true, variant: variant + 1, notice: [result.notice, support.partial ? '일부 장소의 조건만 확인했어요. 필수 조건은 유지하고, 확인된 선호 시설을 우선 반영했어요.' : '', discovery?.status !== 'ok' ? '관광지 연결 정보 없이 기본 추천으로 구성했어요.' : ''].filter(Boolean).join(' ') }); setActive(result.nodes[0].place.id); setCommonExpanded(false); setDaySettingsOpen(false);
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
      if (!nextDays.length && !needsEdited && !document.days.some(d => d.blocks.some(b => b.places.length))) throw Error('먼저 날짜를 골라 코스를 만들어 주세요.');
      onApply(nextDays, baseline, overview, dayId, needs);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '일정을 반영하지 못했어요.'); }
  };
  const disabledPlaces = { ...exclusions };
  nodes.forEach((node, index) => { if (index !== picker) placeKeys(node.place).forEach(key => { disabledPlaces[key] = `이날 ${index + 1}번째 장소`; }); });
  const selectedNode = picker != null && picker < nodes.length ? nodes[picker] : undefined;
  const otherDayCount = document.days.filter(d => d.id !== dayId).reduce((sum, d) => sum + drafts[d.id].nodes.length, 0);
  const generateButton = <button className="trip-button primary nopi-generate" type="button" disabled={!catalog || busy || disabled || options.transport === 'transit'} onClick={() => void generate()}><img src={nopi} alt="" />{uiText(busy ? '가까운 코스 찾는 중…' : '이 날짜 노피에게 맡기기')}</button>;
  return <>
    <TripDialog title={uiText("노피의 코스플래닝")} className={`nopi-dialog ${nodes.length ? 'nopi-has-course' : 'nopi-setup-dialog'}`} onClose={close}>
      <div className="nopi-plan-controls">
        <section className="nopi-common" aria-label={uiText("모든 날짜 공통 조건")}>
          <div className="nopi-section-heading"><div><h3>{uiText("어떤 여행을 떠나볼까요?")}</h3><span>{uiText("모든 날짜에 공통 적용")}</span></div><div><span>{document.destination} · {document.startDate.slice(5).replace('-', '.')} — {document.endDate.slice(5).replace('-', '.')}</span><button type="button" className="trip-text-link" aria-expanded={commonExpanded} onClick={() => setCommonExpanded(v => !v)}>{uiText(commonExpanded ? '접기' : '조건 변경')}</button></div></div>
          {commonExpanded ? <fieldset className="nopi-common-fields" disabled={busy || disabled}>
            <label>{uiText("코스 목적")}<select aria-label={uiText("공통 코스 목적")} value={common.purpose} onChange={e => setCommon({ ...common, purpose: e.target.value as Purpose })}>{['발견', '데이트', '친구모임', '가족여행', '자연산책', '문화여행'].map(value => <option key={value} value={value}>{uiText(value)}</option>)}</select></label>
            <label>{uiText("지역")}<select aria-label={uiText("공통 추천 지역")} value={common.district} onChange={e => setCommon({ ...common, district: e.target.value })}><option value="">{catalog?.scope?.label || document.destination}{uiText(" 전체")}</option>{(catalog?.scope?.districts || []).map(value => <option key={value} value={value}>{uiText(value)}</option>)}</select></label>
            <label>{uiText("연령")}<select aria-label={uiText("노피 추천 연령")} value={profile.mode === 'member' ? 'member' : profile.age} onChange={e => setProfile({ ...profile, mode: e.target.value === 'member' ? 'member' : 'custom', age: e.target.value === 'member' ? '' : e.target.value })}><option value="member">{uiText("내 회원정보")}</option>{['10', '20', '30', '40', '50', '60', '70'].map(value => <option key={value} value={value}>{uiText(value === '10' ? '10대 이하' : value === '70' ? '70대 이상' : `${value}대`)}</option>)}</select></label>
            <label>{uiText("성별")}<select aria-label={uiText("노피 추천 성별")} disabled={profile.mode === 'member'} value={profile.mode === 'member' ? catalog?.profile?.gender || 'all' : profile.gender} onChange={e => setProfile({ ...profile, gender: e.target.value })}><option value="all">{uiText("전체")}</option><option value="female">{uiText("여성")}</option><option value="male">{uiText("남성")}</option></select></label>
          </fieldset> : <p className="nopi-common-summary">{uiText(common.purpose)} · {uiText(common.district || ((catalog?.scope?.label || document.destination) + ' 전체'))} · {uiText(profile.mode === 'member' ? catalog?.profile?.label || '내 회원정보' : `${profile.age}대 · ${profile.gender === 'female' ? '여성' : profile.gender === 'male' ? '남성' : '성별 전체'}`)}</p>}
          {commonExpanded && <TravelNeedsForm value={needs} onChange={setNeeds} disabled={busy || disabled} />}
        </section>
        <section className="nopi-days-panel" aria-label={uiText("날짜별 추천 조건")}>
          <div className="nopi-section-heading"><div><h3>{uiText("날짜별 일정")}</h3><span>{uiText("하루씩, 우리에게 맞게")}</span></div><small>{uiText("만든 코스는 유지하고, 바꾼 공통 조건은 다음 추천부터 적용해요.")}</small></div>
          <div className="nopi-day-tabs" role="tablist" aria-label={uiText("코스를 만들 날짜")}>{document.days.map((item, index) => { const saved = drafts[item.id]; return <button type="button" role="tab" key={item.id} id={`nopi-tab-${item.id}`} aria-controls="nopi-selected-day" aria-selected={item.id === dayId} disabled={busy} onClick={() => selectDay(item.id)}><span>DAY {String(index + 1).padStart(2, '0')}<small>{uiText(saved.nodes.length ? `${saved.nodes.length}곳${saved.edited ? ' · 반영 전' : ''}` : item.id === dayId ? '선택됨' : '일정 만들기')}</small></span><strong>{shortDate(item.date)}</strong><span>{saved.start}–{saved.end} · {uiText(transportLabels[saved.transport])}</span></button>; })}</div>
          <div id="nopi-selected-day" className={`nopi-selected-day${daySettingsOpen ? '' : ' nopi-selected-day-compact'}`} role="tabpanel" aria-labelledby={`nopi-tab-${dayId}`}>
            <div className="nopi-section-heading"><h3>{shortDate(day.date)}{uiText(", 우리의 여행을 이어볼까요?")}</h3><div><span className="nopi-day-only">{uiText("이 날짜에만 적용")}</span>{daySettingsOpen && nodes.length > 0 && <button type="button" className="trip-text-link" aria-expanded={daySettingsOpen} onClick={() => setDaySettingsOpen(false)}>{uiText("접기")}</button>}</div></div>
            {daySettingsOpen ? <fieldset className="nopi-day-fields" disabled={busy || disabled}><label>{uiText("출발 시간")}<input type="time" aria-label={uiText("코스 시작 시간")} value={options.start} onChange={e => updateOptions({ start: e.target.value })} /></label><label>{uiText("마치는 시간")}<input type="time" aria-label={uiText("코스 종료 시간")} value={options.end} onChange={e => updateOptions({ end: e.target.value })} /></label><label>{uiText("이동수단")}<select aria-label={uiText("코스 이동수단")} value={options.transport} onChange={e => updateOptions({ transport: e.target.value as NopiOptions['transport'] })}><option value="walk">{uiText("도보 · 최대 1km")}</option><option value="car">{uiText("자가용·렌터카 · 최대 7km")}</option><option value="transit">{uiText("대중교통 · 직접 편집")}</option></select></label>{generateButton}</fieldset> : <div className="nopi-day-compact"><span>{options.start}–{options.end} · {uiText(transportLabels[options.transport])}{uiText(options.transport !== 'transit' ? ` · 최대 ${courseDistanceLimit(options.transport) / 1000}km` : '')}</span><button type="button" className="trip-text-link" disabled={busy} onClick={() => setDaySettingsOpen(true)}>{uiText("이날 조건 변경")}</button>{generateButton}</div>}

          </div>
        </section>
      </div>
      <div className="nopi-feedback">
      {options.transport === 'transit' && <p className="trip-alert">{uiText("저장한 대중교통 설정을 유지했어요. 자동 코스를 이용하려면 이동수단을 도보 또는 차량으로 변경해 주세요.")}</p>}
      {generationNotice && <p className="trip-alert" role="status">{uiText(generationNotice)}</p>}
      <div className="nopi-status" role="status">{uiText(busy ? '가까운 장소와 실제 이동시간을 확인하고 있어요…' : '날짜를 오가도 작업 중인 코스는 유지돼요.')}<span>{uiText("✓ 다른 날짜에 담은 장소 제외")}{uiText(otherDayCount > 0 ? ` · ${otherDayCount}곳` : '')}</span>{busy && <button className="trip-text-link" type="button" onClick={() => { generation.current?.abort(); setBusy(false); }}>{uiText("추천 중단")}</button>}</div>
      {catalogResponse?.key === catalogKey && catalogResponse.error && <div className="trip-alert">{uiText(catalogResponse.error)}<button type="button" onClick={() => setCatalogRetry(value => value + 1)}>{uiText("자료 다시 받기")}</button></div>}
      {error && <div className="trip-alert" role="alert">{uiText(error)}</div>}
      </div>
      {nodes.length > 0 ? <div className="nopi-workbench">
        <section className="nopi-map-pane" aria-label={uiText("하루 코스 지도")}><div className="nopi-map-canvas"><DayRouteMap points={points} activeId={active} onSelect={select} /></div><div className="nopi-map-caption"><strong>{nodes.length}{uiText("곳을 잇는 하루")}</strong><span>{uiText("점선은 방문 순서예요. 도로 모양과 다를 수 있어요.")}</span><small>{uiText("이동시간은 현재 조회 기준 · 차량은 주차 여유 포함")}</small></div></section>
        <section className="nopi-route-pane" aria-label={uiText("하루 코스 편집")} aria-busy={busy || routeLoading}>
          <div className="nopi-route-heading"><div><span className="trip-eyebrow">YOUR DAY</span><h3>{uiText(nodes.length ? `${nodes.length}곳, 하나의 여행` : '첫 장소부터 담아보세요')}</h3></div><button type="button" className="trip-button" disabled={busy || nodes.length >= 12} onClick={() => setPicker(nodes.length)}><TripIcon name="plus" />{uiText("장소 담기")}</button></div>
          {!nodes.length && <div className="nopi-empty"><img src={nopi} alt={uiText("노피")} /><h3>{uiText("오늘은 어떤 발견을 할까요?")}</h3><p>{uiText('위에서 여행 취향을 선택하면\n노피가 가까운 명소와 음식점을 이어드려요.')}</p><button className="trip-button" type="button" onClick={() => setPicker(0)}>{uiText("직접 첫 장소 담기")}</button></div>}
          {schedule.stops.map(({ node, arrival, departure, wait, route, travel, manual }, index) => <div className="nopi-stop-wrap" key={node.place.id} ref={element => { if (element) cards.current.set(node.place.id, element); else cards.current.delete(node.place.id); }}>
            {index > 0 && <div className="nopi-leg"><span>{uiText(transportLabels[options.transport])} · {uiText(routeLoading ? '이동 확인 중…' : travel == null ? '이동시간 확인 필요' : `${travel}분${manual ? ' · 직접 입력' : route?.distanceMeters != null ? ` · ${route.distanceMeters < 1000 ? `${Math.round(route.distanceMeters)}m` : `${(route.distanceMeters / 1000).toFixed(1)}km`}` : ''}`)}</span>{!routeLoading && route?.distanceMeters != null && courseDistanceLimit(options.transport) > 0 && route.distanceMeters > courseDistanceLimit(options.transport) && <strong className="nopi-distance-warning">{uiText("자동 추천 기준(")}{courseDistanceLabel(options.transport)}{uiText(")을 넘는 구간이에요. 장소를 바꾸거나 순서를 조정해 주세요.")}</strong>}{!routeLoading && !route && <label>{uiText("직접 입력 ")}<input aria-label={uiText(`${index + 1}번째 장소까지 이동시간`)} type="number" min={0} max={600} value={manualTravel[edgeId(nodes[index - 1].place.id, node.place.id)] ?? ''} onChange={e => { const id = edgeId(nodes[index - 1].place.id, node.place.id); setManualTravel(previous => { const next = { ...previous }; if (e.target.value === '') delete next[id]; else next[id] = Math.max(0, Math.min(600, Math.round(Number(e.target.value)))); return next; }); }} />{uiText(" 분")}</label>}</div>}
            <article className={`nopi-stop ${active === node.place.id ? 'selected' : ''}`}>
              <button className="nopi-stop-overview" type="button" onClick={() => select(node.place.id)}><b>{index + 1}</b>{node.imageUrl && <img src={node.imageUrl} alt="" onError={e => { e.currentTarget.style.display = 'none'; }} />}<div><span>{uiText(routeLoading || schedule.errors.some(message => message.includes('이동시간')) ? '시간 확인 중' : `${clock(arrival)} — ${clock(departure)}`)} · {uiText(node.place.type)}</span><h4><TourismText place={node.place} /></h4><p><TourismText place={node.place} field="address" /></p></div></button>
              {node.imageUrl && <small className="nopi-photo-credit">{uiText("사진 © 한국관광공사")}{uiText(node.imageLicense === 'Type3' ? ' · 공공누리 3유형' : node.imageLicense === 'Type1' ? ' · 공공누리 1유형' : '')}</small>}
              {!routeLoading && wait > 0 && <p className="nopi-reason">{wait}{uiText("분 여유 · 예정된 방문 시간에 맞춰 이동해요.")}</p>}{node.reason && <p className="nopi-reason">{uiText(node.reason)}</p>}
              {node.planning && <details className="nopi-facts"><summary>{uiText("운영시간·메뉴 확인")}</summary>{node.planning.menu && <p>{uiText("메뉴 · ")}{node.planning.menu}</p>}<p>{uiText("운영 · ")}{uiText(node.planning.hours || '정보 없음')}</p><p>{uiText("휴무 · ")}{uiText(node.planning.closed || '정보 없음')}</p><small>{uiText("임시 휴무·예약 여부는 지도에서 확인해 주세요.")}</small></details>}
              <TravelSupportPanel contentId={node.place.tourism?.contentId} needs={needs} />
              <div className="nopi-stop-actions"><label>{uiText("머무는 시간")}<input type="number" aria-label={uiText(`${node.place.name} 체류시간`)} min={node.place.type === '카페' ? 30 : 10} max={600} value={node.place.durationMinutes} disabled={busy} onChange={e => updateNodes(nodes.map((item, i) => i === index ? { ...item, place: { ...item.place, durationMinutes: Number(e.target.value) } } : item))} />{uiText("분")}</label><button type="button" className="trip-text-link" disabled={busy} onClick={() => setPicker(index)}>{uiText("장소 변경·상세")}</button><a href={`https://map.naver.com/p/search/${encodeURIComponent(`${node.place.name} ${node.place.address}`)}`} target="_blank" rel="noreferrer">{uiText("지도 ↗")}</a><div><button type="button" aria-label={uiText(`${node.place.name} 위로`)} disabled={busy || !index} onClick={() => { const copy = [...nodes]; [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]]; updateNodes(copy); }}><TripIcon name="up" /></button><button type="button" aria-label={uiText(`${node.place.name} 아래로`)} disabled={busy || index === nodes.length - 1} onClick={() => { const copy = [...nodes]; [copy[index + 1], copy[index]] = [copy[index], copy[index + 1]]; updateNodes(copy); }}><TripIcon name="down" /></button><button type="button" aria-label={uiText(`${node.place.name} 제거`)} disabled={busy} onClick={() => updateNodes(nodes.filter((_, i) => i !== index))}><TripIcon name="close" /></button></div></div>
            </article>
          </div>)}
          {currentRoutes?.error && <p className="trip-alert">{uiText(currentRoutes.error)}</p>}
          {nodes.length > 1 && <button type="button" className="trip-text-link" disabled={busy || routeLoading} onClick={() => { routeCache.current.delete(routeKey); patchDay({ routesResponse: undefined }); setRetry(value => value + 1); }}>{uiText("이동시간 다시 확인")}</button>}
          {!routeLoading && schedule.errors.length > 0 && nodes.length > 0 && <div className="trip-alert" role="status">{uiText(schedule.errors[0])}</div>}
        </section>
      </div> : <div className="nopi-setup-empty"><img src={nopi} alt="" /><div><strong>{uiText("이날의 첫 코스를 만들어볼까요?")}</strong><span>{uiText("위 버튼으로 추천받거나 가고 싶은 장소를 직접 담아보세요.")}</span></div><button className="trip-button" type="button" disabled={busy || disabled} onClick={() => setPicker(0)}>{uiText("장소 담기")}</button></div>}
      <footer className="nopi-footer"><div><strong>{uiText(changedDayCount ? `${changedDayCount}일의 코스 · 반영 준비 중` : `${document.days.length}일의 여행을 하루씩 채워요`)}</strong><span>{uiText("날짜 카드를 눌러 다른 날도 만들고, 작성한 일정을 한 번에 반영해요.")}</span></div><button className="trip-button" type="button" disabled={busy || routeLoading || disabled || (!changedDayCount && !needsEdited)} onClick={() => apply(false)}>{uiText("작성한 일정 반영")}</button><button className="trip-button primary" type="button" disabled={busy || routeLoading || disabled || (!changedDayCount && !document.days.some(d => d.blocks.some(b => b.places.length)))} onClick={() => apply(true)}>{uiText("반영하고 전체 일정 보기")}<TripIcon name="arrow" /></button></footer>
    </TripDialog>
    {picker != null && <PlacePicker needs={needs} destination={document.destination} initial={selectedNode?.place} excluded={disabledPlaces} context={uiText(`DAY ${dayIndex + 1} · ${selectedNode ? '장소 변경' : '새 장소 담기'}`)} onClose={() => setPicker(null)} onSelect={(place, attraction) => { const node: CourseNode = attraction ? tourismNode(catalog?.items.find(item => item.contentId === attraction.contentId) || attraction, place.durationMinutes) : { place }; updateNodes(picker < nodes.length ? nodes.map((item, index) => index === picker ? { ...node, originalNotes: replacementNotes(item.originalNotes) } : item) : [...nodes, node]); setActive(node.place.id); setPicker(null); }} />}
  </>;
}
