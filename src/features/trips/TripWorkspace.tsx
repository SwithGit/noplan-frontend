import { useDesktop } from '../mobile/useDesktop';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTripSync } from './useTripSync';
import { TripSharing } from './TripSharing';
import { NopiCoursePlanner } from './NopiCoursePlanner';
import { TripPlacePhoto } from './TripPlacePhoto';
import { useTripPhotos } from './useTripPhotos';
import { courseDisplayText } from './courseText';
import { TripOverview } from './TripOverview';
import { withDayTransport } from './coursePolicy';
import { tripExclusions } from './nopiModel';
import { DayRouteDialog } from './DayRouteDialog';
import MapBoard from '../../components/MapBoard';
import nopi from '../../assets/nopi/nopi-icon.png';
import type { UserSession } from '../../types/noplan';
import { ROUTES, tripRoute, eventRoute } from '../../routes';
import { TripIcon } from './TripIcon';
import { TripDialog } from './TripDialog';
import { BlockForm, TripSettings } from './TripForms';
import { TripRecommendations } from './TripRecommendations';
import { PlacePicker } from './PlacePicker';
import { putTripPlace } from './placeIdentity';
import { makeBlock, minutes, newId, readDrafts, shortDate, transportLabels, tripLength, usedMinutes, writeDraft, type TripBlock, type TripDocument, type TripPlace, type TripRecord } from './tripModel';
import { resetChangedTravel } from './tripModel';
import './trips.css';

// Temporarily hide block recommendations while the day-course workflow is revised.
const SHOW_BLOCK_RECOMMENDATIONS = false;

export function TripWorkspace({ user }: { user: UserSession | null }) {
  const desktop = useDesktop();
  const { id = '' } = useParams();
  const location = useLocation(), navigate = useNavigate();
  const [seed] = useState<TripRecord | null>(() => {
    const fromNavigation = (location.state as { initialTrip?: TripRecord } | null)?.initialTrip;
    const draft = readDrafts(user?.userId).find(item => item.id === id);
    return draft || (fromNavigation?.id === id ? fromNavigation : null);
  });
  const [undo, setUndo] = useState<TripDocument[]>([]);
  const [storageError, setStorageError] = useState('');
  const [dayId, setDayId] = useState((location.state as {focusDayId?:string}|null)?.focusDayId || seed?.document.days[0]?.id || '');
  const [blockId, setBlockId] = useState((location.state as {focusBlockId?:string}|null)?.focusBlockId || seed?.document.days[0]?.blocks[0]?.id || '');
  const [dialog, setDialog] = useState<'searchPlace' | 'block' | 'settings' | 'tourism' | 'sharing' | 'dayRoute' | 'planner' | 'plannerRegion' | 'overview' | null>(null);
  const clearUndo = useCallback(() => setUndo([]), []);
  const { trip, setTrip, remote, loading, saving: networkSaving, notice, setNotice, conflict, blocked, autoError, dirty, connected, save, openLatest } = useTripSync(id, user?.userId, seed, dialog !== null, clearUndo);
  const saving = networkSaving || loading;
  const [editingPlace, setEditingPlace] = useState<TripPlace | undefined>();
  const [addingBlock, setAddingBlock] = useState<TripBlock | null>(null);
  const [detailTab, setDetailTab] = useState<'recommend' | 'map'>('recommend');
  const [mobileDetail, setMobileDetail] = useState(false);
  const inspector = useRef<HTMLElement>(null);
  useEffect(() => {
    if (mobileDetail && window.matchMedia('(max-width: 1023px)').matches) inspector.current?.scrollIntoView({ block: 'start' });
  }, [mobileDetail, blockId]);
  useEffect(() => {
    if (!trip) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Report the result of writing to the external draft store.
    try { writeDraft(trip, user?.userId); setStorageError(''); }
    catch { setStorageError('이 브라우저에 초안을 보관하지 못했어요. 창을 닫기 전에 계정에 저장해 주세요.'); }
  }, [trip, user?.userId]);
  useEffect(() => {
    if (!storageError && (!user || !dirty)) return;
    const prevent = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [storageError, dirty, user]);
  const photos = useTripPhotos(Boolean(trip && /울산|울주/.test(trip.document.destination)));
  if (!trip) return <div className="trip-load-state"><TripIcon name="map" /><h1>{loading ? '여행 노트를 펼치고 있어요' : '여행을 열 수 없어요'}</h1><p>{notice || (user ? '여행 목록에서 다시 선택해 주세요.' : '계정에 저장한 여행은 로그인 후 열 수 있어요.')}</p><Link className="trip-button primary" to={user ? ROUTES.trips : ROUTES.login}>{user ? '내 여행으로' : '로그인하기'}</Link></div>;
  const document = trip.document;
  const day = document.days.find(item => item.id === dayId) || document.days[0];
  const block = day.blocks.find(item => item.id === blockId) || day.blocks[0];
  const tourismAnchor = block?.places.find(place => place.tourism);
  const primaryPlace = tourismAnchor || block?.places[0];
  const ulsanPlanner = /울산|울주/.test(document.destination);
  const openPlanner = (targetDayId = day.id) => { setDayId(targetDayId); setDialog(ulsanPlanner ? 'planner' : 'plannerRegion'); };
  const totalPlaces = document.days.flatMap(item => item.blocks.flatMap(segment => segment.places)).length;
  const change = (next: TripDocument) => {
    if (saving) return;
    setUndo(previous => [...previous.slice(-19), document]);
    setTrip({ ...trip, document: resetChangedTravel(document, next), updatedAt: new Date().toISOString() });
    if (!conflict) setNotice('');
  };
  const updateBlock = (next: TripBlock) => change({ ...document, days: document.days.map(item => item.id === day.id ? { ...item, blocks: item.blocks.map(segment => segment.id === next.id ? next : segment) } : item) });
  const updatePlaces = (places: TripPlace[]) => { if (block) updateBlock({ ...block, places }); };
  const movePlace = (index: number, offset: number) => {
    if (!block || !block.places[index + offset] || block.places[index].fixed || block.places[index + offset].fixed) return;
    const places = [...block.places]; [places[index], places[index + offset]] = [places[index + offset], places[index]]; updatePlaces(places);
  };
  const copy = () => {
    const copied = { ...trip, id: newId(), version: 0, collaboration: undefined, baseDocument: undefined, document: { ...document, title: `${document.title.slice(0, 93)} (사본)` } };
    navigate(tripRoute(copied.id), { state: { initialTrip: copied } });
  };
  const addBlock = () => {
    if (day.blocks.length >= 12) { setNotice('하루에 최대 12개 구간을 만들 수 있어요.'); return; }
    setAddingBlock(makeBlock('새로운 일정', '12:00', '13:00', document.destination)); setDialog('block');
  };
  const chooseBlock = (value: TripBlock) => { setBlockId(value.id); setMobileDetail(true); };
  const mappedPlaces = (block?.places || []).filter(place => place.lat != null && place.lng != null).map(place => ({ title: place.name, lat: place.lat!, lng: place.lng! }));
  const isConflict = conflict || (remote && remote.version !== trip.version);
  return <div className="trip-workspace">
    <div className="trip-workspace-bar"><div className="trip-breadcrumb"><Link to={ROUTES.trips}>내 여행</Link><span>/</span><span>{document.destination}</span></div><div className="trip-save-tools"><button className="trip-button" type="button" disabled={saving || conflict || blocked} onClick={async () => { if (!user) { setNotice('로그인 후 여행을 저장하면 친구를 초대할 수 있어요.'); return; } if ((!trip.version || dirty) && !await save()) return; setDialog('sharing'); }}>친구와 함께{trip.collaboration?.enabled ? ` · ${trip.collaboration.memberCount}명` : ''}</button><span className="trip-save-state"><span className={dirty ? 'pending' : ''} />{saving ? '저장 중…' : !user ? '이 브라우저의 초안' : conflict ? '수정 충돌 · 작업본 보관 중' : blocked ? '편집 권한 확인 필요' : autoError ? '저장 실패 · 재시도 필요' : !connected ? '연결 확인 필요' : dirty ? trip.collaboration?.enabled ? '친구에게 반영 중…' : '저장할 변경사항 있음' : trip.collaboration?.enabled ? '함께 편집 · 자동 저장됨' : '계정에 저장됨'}</span><button className="trip-button" disabled={!undo.length || saving} onClick={() => { const previous = undo.at(-1); if (previous) { setTrip({ ...trip, document: previous }); setUndo(undo.slice(0, -1)); } }} type="button">되돌리기</button><button className="trip-button primary" disabled={saving || conflict || blocked} onClick={() => void save()} type="button"><TripIcon name="save" />{user ? '여행 저장' : '저장 안내'}</button></div></div>
    <header className="trip-workspace-heading"><div><span className="trip-eyebrow">MY TRAVEL NOTE</span><h1>{document.title}</h1><div className="trip-meta"><span><TripIcon name="calendar" />{document.startDate} — {document.endDate}</span><span>{tripLength(document)}</span><span>{transportLabels[document.transport]}</span><span>{document.companion === '혼자' ? '나만의 여행' : `${document.companion}와 함께`}</span></div></div><div className="trip-timeline-actions"><button type="button" className="trip-button" onClick={() => setDialog('overview')}>전체 일정 보기</button><button type="button" className="trip-button" onClick={() => setDialog('settings')} disabled={saving}>여행 정보 수정</button></div></header>
    {(notice || storageError) && <div className="trip-alert" role="status"><span>{storageError || notice}</span>{(!user || blocked) && <Link to={ROUTES.login}>로그인</Link>}{(isConflict || blocked) && <><button type="button" disabled={saving} onClick={() => void openLatest()}>최신 여행 열기</button><button type="button" disabled={saving} onClick={copy}>새 여행으로 복사</button></>}</div>}
    <div className="trip-editor-layout">
      <aside className="trip-days"><span className="trip-eyebrow">ITINERARY</span><h2>우리의 여정</h2><nav aria-label="여행 날짜">{document.days.map((item, index) => <button key={item.id} className={item.id === day.id ? 'selected' : ''} aria-pressed={item.id === day.id} type="button" onClick={() => { setDayId(item.id); setBlockId(item.blocks[0]?.id || ''); setMobileDetail(false); }}><span>DAY {String(index + 1).padStart(2, '0')}</span><strong>{shortDate(item.date)}</strong><small>{item.blocks.reduce((sum, segment) => sum + segment.places.length, 0)}개 장소</small></button>)}</nav><div className="trip-day-summary"><TripIcon name="map" /><strong>{totalPlaces}개의 작은 발견</strong><span>{document.days.length}일의 여행에 담았어요.</span></div>{!desktop && <Link to={ROUTES.quickHome} className="trip-text-link">주변 코스만 찾기 <TripIcon name="arrow" /></Link>}</aside>
      <section className="trip-timeline" aria-label="날짜별 일정"><div className="trip-timeline-header"><div><span className="trip-eyebrow">DAY {String(document.days.indexOf(day) + 1).padStart(2, '0')}</span><h2>{shortDate(day.date)}의 여행</h2><small className="trip-muted">{transportLabels[day.transport || document.transport]}</small></div><div className="trip-timeline-actions"><button className="trip-button primary" type="button" disabled={saving} onClick={() => openPlanner()}><TripIcon name="spark" />노피의 코스플래닝</button><button className="trip-button" type="button" disabled={saving} onClick={() => setDialog('dayRoute')}><TripIcon name="map" />하루 동선 보기</button><button className="trip-button" onClick={addBlock} disabled={saving || day.blocks.length >= 12} type="button"><TripIcon name="plus" />구간 추가</button></div></div>
        <div className="trip-timeline-list">{[...day.blocks].sort((a, b) => a.startTime.localeCompare(b.startTime)).map((segment, index) => <article className={`trip-segment ${segment.id === block?.id ? 'selected' : ''}`} key={segment.id}>
          <div className="trip-segment-rail"><span>{segment.startTime}</span><i>{String(index + 1).padStart(2, '0')}</i><small>{segment.endTime}</small></div>
          <div className="trip-segment-card"><div className="trip-segment-heading"><div className="trip-segment-heading-copy"><button className="trip-segment-title" type="button" onClick={() => chooseBlock(segment)} aria-pressed={segment.id === block?.id}><div><span>{segment.places.length ? `${segment.places.length}곳 · 체류 ${segment.places.reduce((sum, place) => sum + place.durationMinutes, 0)}분` : '이 시간을 무엇으로 채울까요?'}</span><h3>{segment.places.find(place => place.tourism)?.name || segment.places[0]?.name || segment.title}</h3></div><TripIcon name="arrow" /></button>
            {segment.places.some(place => place.tourism) && <p className="tourism-anchor-label">{segment.title} · 중심 관광지</p>}
            {segment.area && <p className="trip-segment-area"><TripIcon name="pin" />{segment.area}</p>}</div>{segment.places.length > 0 && <TripPlacePhoto name={(segment.places.find(place => place.tourism) || segment.places[0]).name} photo={photos[(segment.places.find(place => place.tourism) || segment.places[0]).tourism?.contentId || '']} />}</div>
            {segment.places.length > 0 ? <ol className="trip-stop-list">{segment.places.map((place, position) => <li key={place.id}><span className="trip-stop-number">{position + 1}</span><div><strong>{place.name}</strong><small>{place.tourism ? '중심 관광지 · ' : ''}{place.type} · {place.durationMinutes}분{place.fixed ? ' · 고정' : ''}{place.candidateSource === 'live' ? ' · 실시간 검색' : ''}{place.priceNeedsCheck ? ' · 가격 확인 필요' : ''}</small>{place.tourism && <small>한국관광공사 · 운영시간 확인 필요</small>}{place.event&&<Link className="trip-text-link" to={eventRoute(place.event.id)}>행사 상세 · {place.event.hours||'관람 시간 확인'}</Link>}</div>{place.fixed && <TripIcon name="lock" />}</li>)}</ol> : <button className="trip-segment-empty" type="button" onClick={() => { setBlockId(segment.id); setDialog('tourism'); }} disabled={saving}><TripIcon name="plus" /><span>가고 싶은 장소를 담아보세요</span></button>}
            {usedMinutes(segment) > minutes(segment.endTime) - minutes(segment.startTime) && <p className="trip-alert">머무는 시간과 이동 여유가 구간을 넘어요.</p>}
            {courseDisplayText(segment.notes) && <p className="trip-segment-note">{courseDisplayText(segment.notes)}</p>}
            <div className="trip-segment-footer">{segment.places.length > 0 && <button className="trip-text-link" type="button" disabled={saving} onClick={() => { setBlockId(segment.id); setDialog('tourism'); }}><TripIcon name="pin" />장소 변경</button>}{SHOW_BLOCK_RECOMMENDATIONS && <button type="button" className="trip-text-link" onClick={() => { chooseBlock(segment); setDetailTab('recommend'); }}><TripIcon name="spark" />이 구간 채우기</button>}<button type="button" aria-label={`${segment.title} 수정`} className="trip-icon-button" onClick={() => { setBlockId(segment.id); setAddingBlock(null); setDialog('block'); }} disabled={saving}><TripIcon name="menu" /></button></div>
          </div>
        </article>)}</div>
        {!day.blocks.length && <div className="trip-library-empty"><h3>여유로운 하루의 첫 구간을 만들어보세요.</h3><button className="trip-button primary" type="button" onClick={addBlock}>구간 추가</button></div>}
        <p className="trip-footnote">추천 코스는 조회한 이동·대기 시간을 반영하고, 직접 편집한 장소 사이는 15분으로 임시 계산해요. 실제 교통과 예약 시간에 맞춰 구간을 조정해 주세요.</p>
      </section>
      <aside ref={inspector} className={`trip-inspector ${mobileDetail ? 'mobile-open' : ''}`} aria-label="선택 구간 상세"><div className="trip-inspector-top"><img src={nopi} alt="" /><div><span>작은 계획, 좋은 여행</span><strong>{SHOW_BLOCK_RECOMMENDATIONS ? '노피와 함께 채워요' : '여행 장소를 살펴봐요'}</strong></div><button className="trip-icon-button trip-mobile-close" aria-label="구간 상세 접기" type="button" onClick={() => setMobileDetail(false)}><TripIcon name="close" /></button></div>
        <div className="trip-inspector-tabs"><button type="button" aria-pressed={detailTab === 'recommend'} onClick={() => setDetailTab('recommend')}>{SHOW_BLOCK_RECOMMENDATIONS ? '일정 도우미' : '장소 편집'}</button><button type="button" aria-pressed={detailTab === 'map'} onClick={() => setDetailTab('map')}><TripIcon name="map" />지도</button></div>
        {block ? <div className="trip-inspector-body"><div className="trip-selected-summary"><span>{block.startTime} — {block.endTime}</span><h3>{tourismAnchor?.name || block.places[0]?.name || block.title}</h3><p>{shortDate(day.date)} · {block.places.length}개 장소</p></div>
          <section className="tourism-anchor-panel"><span className="trip-eyebrow">선택한 장소</span><strong>{primaryPlace?.name || '이 구간에서 꼭 가고 싶은 곳'}</strong><p className="trip-muted">{primaryPlace ? `머무는 시간 ${primaryPlace.durationMinutes}분 · 방문 전 운영시간과 요금을 확인해 주세요.` : '가고 싶은 관광지나 음식점을 골라 일정에 담아보세요.'}</p><button type="button" className="trip-button" disabled={saving} onClick={() => setDialog('tourism')}>{primaryPlace ? '장소·머무는 시간 변경' : '가고 싶은 장소 담기'}</button>{tourismAnchor && <button className="trip-text-link" type="button" disabled={saving} onClick={() => updateBlock({ ...block, area: block.places.find(place => !place.tourism)?.address.slice(0, 160) || document.destination, places: block.places.filter(place => !place.tourism) })}>중심 관광지 제거</button>}</section>
          {detailTab === 'map' ? <><div className="trip-map">{mappedPlaces.length ? <MapBoard courseList={mappedPlaces} userLocation={block.area} /> : <div className="trip-map-empty"><TripIcon name="map" /><h3>장소를 지도에서 확인해요</h3><p>좌표가 있는 추천 장소를 담으면 지도가 표시돼요.</p></div>}</div>{block.places.map(place => <a className="trip-map-link" key={place.id} href={`https://map.kakao.com/link/search/${encodeURIComponent(`${place.name} ${place.address}`)}`} target="_blank" rel="noreferrer">{place.name}<TripIcon name="arrow" /></a>)}</> : SHOW_BLOCK_RECOMMENDATIONS && <TripRecommendations disabled={saving} key={block.id} trip={document} day={day} block={block} onApply={(places, fingerprint) => { if (saving) return; if (JSON.stringify({ trip: { transport: document.transport, companion: document.companion }, day, block }) !== fingerprint) { setNotice('일정이 바뀌었어요. 다시 추천받아 주세요.'); return; } updatePlaces([...block.places, ...places]); }} />}
          <section className="trip-place-editor"><div className="trip-editor-label"><h3>담아둔 장소</h3><button className="trip-text-link" onClick={() => { setEditingPlace(undefined); setDialog('searchPlace'); }} disabled={saving || block.places.length >= 15} type="button"><TripIcon name="plus" />추가</button></div>{block.places.map((place, index) => <article key={place.id}><div><strong>{place.name}</strong><span>{place.durationMinutes}분</span></div><div className="trip-place-actions"><button className="trip-icon-button" aria-label={`${place.name} 수정`} disabled={saving} type="button" onClick={() => { if (place.tourism) { setDialog('tourism'); } else { setEditingPlace(place); setDialog('searchPlace'); } }}><TripIcon name="menu" /></button><button className="trip-icon-button" aria-label={`${place.name} ${place.fixed ? '고정 해제' : '고정'}`} disabled={saving || Boolean(place.tourism)} type="button" onClick={() => updatePlaces(block.places.map(item => item.id === place.id ? { ...item, fixed: !item.fixed } : item))}><TripIcon name={place.fixed ? 'lock' : 'unlock'} /></button><button className="trip-icon-button" aria-label={`${place.name} 위로`} disabled={saving || place.fixed || index === 0 || block.places[index - 1]?.fixed} onClick={() => movePlace(index, -1)} type="button"><TripIcon name="up" /></button><button className="trip-icon-button" aria-label={`${place.name} 아래로`} disabled={saving || place.fixed || index === block.places.length - 1 || block.places[index + 1]?.fixed} onClick={() => movePlace(index, 1)} type="button"><TripIcon name="down" /></button><button className="trip-icon-button" aria-label={`${place.name} 제거`} disabled={saving || place.fixed} onClick={() => updatePlaces(block.places.filter(item => item.id !== place.id))} type="button"><TripIcon name="close" /></button></div></article>)}{!block.places.length && <p className="trip-muted">꼭 가고 싶은 장소부터 하나씩 담아보세요.</p>}</section>
          <button className="trip-delete-block" type="button" disabled={saving} onClick={() => { if (block.places.some(place => place.fixed)) { setNotice('고정한 장소를 해제한 뒤 구간을 삭제해 주세요.'); return; } if (window.confirm('이 구간을 삭제할까요? 되돌리기로 복구할 수 있어요.')) { change({ ...document, days: document.days.map(item => item.id === day.id ? { ...item, blocks: item.blocks.filter(segment => segment.id !== block.id) } : item) }); } }}>이 구간 삭제</button>
        </div> : <div className="trip-inspector-body"><p className="trip-muted">일정 구간을 추가하면 노피가 도와드릴게요.</p></div>}
      </aside>
    </div>
    {dialog === 'plannerRegion' && <TripDialog title="노피의 코스플래닝" onClose={() => setDialog(null)}><p>현재 자동 코스플래닝은 울산·울주 지역에서 시범 운영하고 있어요.</p><p className="trip-muted">지금 여행지는 {document.destination}이에요. 울산 여행을 계획 중이라면 여행 정보를 수정해 주세요. 직접 장소를 담는 기능은 모든 지역에서 사용할 수 있어요.</p><button className="trip-button" type="button" onClick={() => setDialog('settings')}>여행 정보 수정</button></TripDialog>}
    {dialog === 'planner' && <NopiCoursePlanner document={document} dayId={day.id} disabled={saving || conflict || blocked} onClose={() => setDialog(null)} onApply={(nextDays, baseline, overview, activeDayId) => {
      if (saving || conflict || blocked) throw new Error('저장 또는 동기화가 끝난 뒤 다시 반영해 주세요.');
      if (JSON.stringify(document) !== baseline) throw new Error('여행 일정이 바뀌었어요. 코스 만들기를 다시 열어 주세요.');
      if (nextDays.length) change({ ...document, days: document.days.map(item => nextDays.find(next => next.id === item.id) || item) });
      setDayId(activeDayId);
      setBlockId((nextDays.find(item => item.id === activeDayId) || document.days.find(item => item.id === activeDayId))?.blocks[0]?.id || '');
      setDialog(overview ? 'overview' : null);
    }} />}
    {dialog === 'overview' && <TripOverview document={document} photos={photos} onClose={() => setDialog(null)} onEdit={target => { if (ulsanPlanner) openPlanner(target); else { setDayId(target); setDialog(null); } }} onDayRoute={target => { setDayId(target); setDialog('dayRoute'); }} />}
    {dialog === 'dayRoute' && <DayRouteDialog document={document} dayId={day.id} disabled={saving} onClose={() => setDialog(null)} onApply={(nextDay, transport, baseline) => {
      if (saving) return;
      if (JSON.stringify(document) !== baseline) throw new Error('일정이 바뀌었어요. 동선 보기를 다시 열어 최신 내용에서 수정해 주세요.');
      const next = { ...document, days: document.days.map(item => item.id === day.id ? withDayTransport(nextDay, transport, document.transport) : item) };
      if (JSON.stringify(next) !== baseline) change(next);
      setDialog(null);
    }} />}
    {dialog === 'sharing' && <TripSharing trip={trip} onClose={() => setDialog(null)} />}
    {(dialog === 'tourism' || dialog === 'searchPlace') && block && <PlacePicker destination={document.destination} initial={dialog === 'tourism' ? tourismAnchor || block.places[0] : editingPlace} excluded={tripExclusions(document, undefined, (dialog === 'tourism' ? tourismAnchor || block.places[0] : editingPlace)?.id)} context={`${shortDate(day.date)} · ${block.title}`} onClose={() => setDialog(null)} onSelect={place => { if (saving) return; change(putTripPlace(document, day.id, block.id, place, (dialog === 'tourism' ? tourismAnchor || block.places[0] : editingPlace)?.id)); setDialog(null); setDetailTab('recommend'); setMobileDetail(true); setNotice('장소를 담았어요. 하루 동선 보기에서 변경된 이동시간을 확인해 주세요.'); }} />}
    {dialog === 'block' && (addingBlock || block) && <BlockForm block={addingBlock || block} day={day} days={document.days} onClose={() => { setDialog(null); setAddingBlock(null); }} onSave={(next, targetDay) => { change({ ...document, days: document.days.map(item => ({ ...item, blocks: [...item.blocks.filter(segment => segment.id !== next.id), ...(item.id === targetDay ? [next] : [])].sort((a, b) => a.startTime.localeCompare(b.startTime)) })) }); setDayId(targetDay); setBlockId(next.id); setDialog(null); setAddingBlock(null); }} />}
    {dialog === 'settings' && <TripSettings trip={document} onClose={() => setDialog(null)} onSave={patch => { change({ ...document, ...patch }); setDialog(null); }} />}
  </div>;
}
