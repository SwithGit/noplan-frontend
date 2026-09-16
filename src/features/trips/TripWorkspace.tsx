import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { getTrip, saveTrip } from '../../api/tripsApi';
import MapBoard from '../../components/MapBoard';
import nopi from '../../assets/nopi/nopi-icon.png';
import type { UserSession } from '../../types/noplan';
import { ROUTES, tripRoute } from '../../routes';
import { TripIcon } from './TripIcon';
import { BlockForm, PlaceForm, TripSettings } from './TripForms';
import { TripRecommendations } from './TripRecommendations';
import { makeBlock, minutes, newId, readDrafts, shortDate, transportLabels, tripLength, usedMinutes, writeDraft, type TripBlock, type TripDocument, type TripPlace, type TripRecord } from './tripModel';
import './trips.css';

export function TripWorkspace({ user }: { user: UserSession | null }) {
  const { id = '' } = useParams();
  const location = useLocation(), navigate = useNavigate();
  const [seed] = useState<TripRecord | null>(() => {
    const fromNavigation = (location.state as { initialTrip?: TripRecord } | null)?.initialTrip;
    const draft = readDrafts(user?.userId).find(item => item.id === id);
    return draft || (fromNavigation?.id === id ? fromNavigation : null);
  });
  const [trip, setTrip] = useState(seed);
  const [undo, setUndo] = useState<TripDocument[]>([]);
  const [remote, setRemote] = useState<TripRecord | null>(null);
  const [loading, setLoading] = useState(Boolean(user));
  const [notice, setNotice] = useState('');
  const [storageError, setStorageError] = useState('');
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [dayId, setDayId] = useState(seed?.document.days[0]?.id || '');
  const [blockId, setBlockId] = useState(seed?.document.days[0]?.blocks[0]?.id || '');
  const [dialog, setDialog] = useState<'place' | 'block' | 'settings' | null>(null);
  const [editingPlace, setEditingPlace] = useState<TripPlace | undefined>();
  const [addingBlock, setAddingBlock] = useState<TripBlock | null>(null);
  const [detailTab, setDetailTab] = useState<'recommend' | 'map'>('recommend');
  const [mobileDetail, setMobileDetail] = useState(false);
  const inspector = useRef<HTMLElement>(null);
  useEffect(() => {
    if (mobileDetail && window.matchMedia('(max-width: 1023px)').matches) inspector.current?.scrollIntoView({ block: 'start' });
  }, [mobileDetail, blockId]);
  useEffect(() => {
    if (!user?.userId) return;
    let cancelled = false;
    getTrip(id).then(result => {
      if (cancelled) return;
      setRemote(result);
      if (!seed) { setTrip(result); setDayId(result.document.days[0]?.id || ''); setBlockId(result.document.days[0]?.blocks[0]?.id || ''); }
      else if (seed.version !== result.version) setNotice('다른 기기에서 저장한 여행이 있어요. 최신 여행을 열거나 이 작업본을 새 여행으로 저장해 주세요.');
    }).catch(cause => { if (!cancelled && !(seed?.version === 0 && cause instanceof ApiError && cause.status === 404)) setNotice(cause instanceof Error ? cause.message : '여행을 불러오지 못했어요.'); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, user?.userId, seed]);
  useEffect(() => {
    if (!trip) return;
    try { writeDraft(trip, user?.userId); setStorageError(''); }
    catch { setStorageError('이 브라우저에 초안을 보관하지 못했어요. 창을 닫기 전에 계정에 저장해 주세요.'); }
  }, [trip, user?.userId]);
  const dirty = trip && (!remote || JSON.stringify(trip.document) !== JSON.stringify(remote.document));
  useEffect(() => {
    if (!storageError && (!user || !dirty)) return;
    const prevent = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [storageError, dirty, user]);
  if (!trip) return <div className="trip-load-state"><TripIcon name="map" /><h1>{loading ? '여행 노트를 펼치고 있어요' : '여행을 열 수 없어요'}</h1><p>{notice || (user ? '여행 목록에서 다시 선택해 주세요.' : '계정에 저장한 여행은 로그인 후 열 수 있어요.')}</p><Link className="trip-button primary" to={user ? ROUTES.trips : ROUTES.login}>{user ? '내 여행으로' : '로그인하기'}</Link></div>;
  const document = trip.document;
  const day = document.days.find(item => item.id === dayId) || document.days[0];
  const block = day.blocks.find(item => item.id === blockId) || day.blocks[0];
  const totalPlaces = document.days.flatMap(item => item.blocks.flatMap(segment => segment.places)).length;
  const change = (next: TripDocument) => {
    if (saving) return;
    setUndo(previous => [...previous.slice(-19), document]);
    setTrip({ ...trip, document: next, updatedAt: new Date().toISOString() });
    if (!conflict) setNotice('');
  };
  const updateBlock = (next: TripBlock) => change({ ...document, days: document.days.map(item => item.id === day.id ? { ...item, blocks: item.blocks.map(segment => segment.id === next.id ? next : segment) } : item) });
  const updatePlaces = (places: TripPlace[]) => { if (block) updateBlock({ ...block, places }); };
  const movePlace = (index: number, offset: number) => {
    if (!block || !block.places[index + offset] || block.places[index].fixed || block.places[index + offset].fixed) return;
    const places = [...block.places]; [places[index], places[index + offset]] = [places[index + offset], places[index]]; updatePlaces(places);
  };
  const save = async () => {
    if (!user) { setNotice('초안은 이 브라우저에 보관됩니다. 로그인 후 내 여행에서 초안을 열면 계정에 저장할 수 있어요.'); return; }
    setSaving(true); setNotice('');
    try { const result = await saveTrip(trip); setTrip(result); setRemote(result); setConflict(false); setNotice('계정에 저장했어요. 다른 기기에서도 같은 여행을 열 수 있어요.'); }
    catch (cause) { if (cause instanceof ApiError && cause.status === 409) setConflict(true); setNotice(cause instanceof Error ? cause.message : '저장하지 못했어요. 작성 내용은 유지됩니다.'); }
    finally { setSaving(false); }
  };
  const openLatest = async () => {
    if (!window.confirm('현재 작업본을 최신 저장 내용으로 바꿀까요? 작업본을 남기려면 먼저 새 여행으로 복사해 주세요.')) return;
    setSaving(true);
    try { const result = await getTrip(id); setTrip(result); setRemote(result); setConflict(false); setUndo([]); setNotice('최신 여행을 열었어요.'); }
    catch (cause) { setNotice(cause instanceof Error ? cause.message : '최신 여행을 불러오지 못했어요. 현재 작업본은 유지됩니다.'); }
    finally { setSaving(false); }
  };
  const copy = () => {
    const copied = { ...trip, id: newId(), version: 0, document: { ...document, title: `${document.title.slice(0, 93)} (사본)` } };
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
    <div className="trip-workspace-bar"><div className="trip-breadcrumb"><Link to={ROUTES.trips}>내 여행</Link><span>/</span><span>{document.destination}</span></div><div className="trip-save-tools"><span className="trip-save-state"><span className={dirty ? 'pending' : ''} />{saving ? '저장 중…' : !user ? '이 브라우저의 초안' : dirty ? '저장할 변경사항 있음' : '계정에 저장됨'}</span><button className="trip-button" disabled={!undo.length || saving} onClick={() => { const previous = undo.at(-1); if (previous) { setTrip({ ...trip, document: previous }); setUndo(undo.slice(0, -1)); } }} type="button">되돌리기</button><button className="trip-button primary" disabled={saving} onClick={() => void save()} type="button"><TripIcon name="save" />{user ? '여행 저장' : '저장 안내'}</button></div></div>
    <header className="trip-workspace-heading"><div><span className="trip-eyebrow">MY TRAVEL NOTE</span><h1>{document.title}</h1><div className="trip-meta"><span><TripIcon name="calendar" />{document.startDate} — {document.endDate}</span><span>{tripLength(document)}</span><span>{transportLabels[document.transport]}</span><span>{document.companion === '혼자' ? '나만의 여행' : `${document.companion}와 함께`}</span></div></div><button type="button" className="trip-button" onClick={() => setDialog('settings')} disabled={saving}>여행 정보 수정</button></header>
    {(notice || storageError) && <div className="trip-alert" role="status"><span>{storageError || notice}</span>{!user && <Link to={ROUTES.login}>로그인</Link>}{isConflict && <><button type="button" disabled={saving} onClick={() => void openLatest()}>최신 여행 열기</button><button type="button" disabled={saving} onClick={copy}>새 여행으로 복사</button></>}</div>}
    <div className="trip-editor-layout">
      <aside className="trip-days"><span className="trip-eyebrow">ITINERARY</span><h2>우리의 여정</h2><nav aria-label="여행 날짜">{document.days.map((item, index) => <button key={item.id} className={item.id === day.id ? 'selected' : ''} aria-pressed={item.id === day.id} type="button" onClick={() => { setDayId(item.id); setBlockId(item.blocks[0]?.id || ''); setMobileDetail(false); }}><span>DAY {String(index + 1).padStart(2, '0')}</span><strong>{shortDate(item.date)}</strong><small>{item.blocks.reduce((sum, segment) => sum + segment.places.length, 0)}개 장소</small></button>)}</nav><div className="trip-day-summary"><TripIcon name="map" /><strong>{totalPlaces}개의 작은 발견</strong><span>{document.days.length}일의 여행에 담았어요.</span></div><Link to={ROUTES.quickHome} className="trip-text-link">주변 코스만 찾기 <TripIcon name="arrow" /></Link></aside>
      <section className="trip-timeline" aria-label="날짜별 일정"><div className="trip-timeline-header"><div><span className="trip-eyebrow">DAY {String(document.days.indexOf(day) + 1).padStart(2, '0')}</span><h2>{shortDate(day.date)}의 여행</h2></div><button className="trip-button" onClick={addBlock} disabled={saving || day.blocks.length >= 12} type="button"><TripIcon name="plus" />구간 추가</button></div>
        <div className="trip-timeline-list">{[...day.blocks].sort((a, b) => a.startTime.localeCompare(b.startTime)).map((segment, index) => <article className={`trip-segment ${segment.id === block?.id ? 'selected' : ''}`} key={segment.id}>
          <div className="trip-segment-rail"><span>{segment.startTime}</span><i>{String(index + 1).padStart(2, '0')}</i><small>{segment.endTime}</small></div>
          <div className="trip-segment-card"><button className="trip-segment-title" type="button" onClick={() => chooseBlock(segment)} aria-pressed={segment.id === block?.id}><div><span>{segment.places.length ? `${segment.places.length}곳 · 체류 ${segment.places.reduce((sum, place) => sum + place.durationMinutes, 0)}분` : '이 시간을 무엇으로 채울까요?'}</span><h3>{segment.title}</h3></div><TripIcon name="arrow" /></button>
            {segment.area && <p className="trip-segment-area"><TripIcon name="pin" />{segment.area}</p>}
            {segment.places.length > 0 ? <ol className="trip-stop-list">{segment.places.map((place, position) => <li key={place.id}><span className="trip-stop-number">{position + 1}</span><div><strong>{place.name}</strong><small>{place.type} · {place.durationMinutes}분{place.fixed ? ' · 고정' : ''}</small></div>{place.fixed && <TripIcon name="lock" />}</li>)}</ol> : <button className="trip-segment-empty" type="button" onClick={() => { setBlockId(segment.id); setEditingPlace(undefined); setDialog('place'); }} disabled={saving}><TripIcon name="plus" /><span>가고 싶은 장소를 담아보세요</span></button>}
            {usedMinutes(segment) > minutes(segment.endTime) - minutes(segment.startTime) && <p className="trip-alert">머무는 시간과 이동 여유가 구간을 넘어요.</p>}
            {segment.notes && <p className="trip-segment-note">{segment.notes}</p>}
            <div className="trip-segment-footer"><button type="button" className="trip-text-link" onClick={() => { chooseBlock(segment); setDetailTab('recommend'); }}><TripIcon name="spark" />이 구간 채우기</button><button type="button" aria-label={`${segment.title} 수정`} className="trip-icon-button" onClick={() => { setBlockId(segment.id); setAddingBlock(null); setDialog('block'); }} disabled={saving}><TripIcon name="menu" /></button></div>
          </div>
        </article>)}</div>
        {!day.blocks.length && <div className="trip-library-empty"><h3>여유로운 하루의 첫 구간을 만들어보세요.</h3><button className="trip-button primary" type="button" onClick={addBlock}>구간 추가</button></div>}
        <p className="trip-footnote">이동 여유는 장소 사이 15분으로 임시 계산해요. 실제 교통과 예약 시간에 맞춰 구간을 조정해 주세요.</p>
      </section>
      <aside ref={inspector} className={`trip-inspector ${mobileDetail ? 'mobile-open' : ''}`} aria-label="선택 구간 상세"><div className="trip-inspector-top"><img src={nopi} alt="" /><div><span>작은 계획, 좋은 여행</span><strong>노피와 함께 채워요</strong></div><button className="trip-icon-button trip-mobile-close" aria-label="구간 상세 접기" type="button" onClick={() => setMobileDetail(false)}><TripIcon name="close" /></button></div>
        <div className="trip-inspector-tabs"><button type="button" aria-pressed={detailTab === 'recommend'} onClick={() => setDetailTab('recommend')}>일정 도우미</button><button type="button" aria-pressed={detailTab === 'map'} onClick={() => setDetailTab('map')}><TripIcon name="map" />지도</button></div>
        {block ? <div className="trip-inspector-body"><div className="trip-selected-summary"><span>{block.startTime} — {block.endTime}</span><h3>{block.title}</h3><p>{shortDate(day.date)} · {block.places.length}개 장소</p></div>
          {detailTab === 'map' ? <><div className="trip-map">{mappedPlaces.length ? <MapBoard courseList={mappedPlaces} userLocation={block.area} /> : <div className="trip-map-empty"><TripIcon name="map" /><h3>장소를 지도에서 확인해요</h3><p>좌표가 있는 추천 장소를 담으면 지도가 표시돼요.</p></div>}</div>{block.places.map(place => <a className="trip-map-link" key={place.id} href={`https://map.kakao.com/link/search/${encodeURIComponent(`${place.name} ${place.address}`)}`} target="_blank" rel="noreferrer">{place.name}<TripIcon name="arrow" /></a>)}</> : <TripRecommendations disabled={saving} key={block.id} trip={document} day={day} block={block} onApply={(places, fingerprint) => { if (saving) return; if (JSON.stringify({ trip: { transport: document.transport, companion: document.companion }, day, block }) !== fingerprint) { setNotice('일정이 바뀌었어요. 다시 추천받아 주세요.'); return; } updatePlaces([...block.places, ...places]); }} />}
          <section className="trip-place-editor"><div className="trip-editor-label"><h3>담아둔 장소</h3><button className="trip-text-link" onClick={() => { setEditingPlace(undefined); setDialog('place'); }} disabled={saving || block.places.length >= 15} type="button"><TripIcon name="plus" />추가</button></div>{block.places.map((place, index) => <article key={place.id}><div><strong>{place.name}</strong><span>{place.durationMinutes}분</span></div><div className="trip-place-actions"><button className="trip-icon-button" aria-label={`${place.name} 수정`} disabled={saving} type="button" onClick={() => { setEditingPlace(place); setDialog('place'); }}><TripIcon name="menu" /></button><button className="trip-icon-button" aria-label={`${place.name} ${place.fixed ? '고정 해제' : '고정'}`} disabled={saving} type="button" onClick={() => updatePlaces(block.places.map(item => item.id === place.id ? { ...item, fixed: !item.fixed } : item))}><TripIcon name={place.fixed ? 'lock' : 'unlock'} /></button><button className="trip-icon-button" aria-label={`${place.name} 위로`} disabled={saving || place.fixed || index === 0 || block.places[index - 1]?.fixed} onClick={() => movePlace(index, -1)} type="button"><TripIcon name="up" /></button><button className="trip-icon-button" aria-label={`${place.name} 아래로`} disabled={saving || place.fixed || index === block.places.length - 1 || block.places[index + 1]?.fixed} onClick={() => movePlace(index, 1)} type="button"><TripIcon name="down" /></button><button className="trip-icon-button" aria-label={`${place.name} 제거`} disabled={saving || place.fixed} onClick={() => updatePlaces(block.places.filter(item => item.id !== place.id))} type="button"><TripIcon name="close" /></button></div></article>)}{!block.places.length && <p className="trip-muted">꼭 가고 싶은 장소부터 하나씩 담아보세요.</p>}</section>
          <button className="trip-delete-block" type="button" disabled={saving} onClick={() => { if (block.places.some(place => place.fixed)) { setNotice('고정한 장소를 해제한 뒤 구간을 삭제해 주세요.'); return; } if (window.confirm('이 구간을 삭제할까요? 되돌리기로 복구할 수 있어요.')) { change({ ...document, days: document.days.map(item => item.id === day.id ? { ...item, blocks: item.blocks.filter(segment => segment.id !== block.id) } : item) }); } }}>이 구간 삭제</button>
        </div> : <div className="trip-inspector-body"><p className="trip-muted">일정 구간을 추가하면 노피가 도와드릴게요.</p></div>}
      </aside>
    </div>
    {dialog === 'place' && block && <PlaceForm place={editingPlace} onClose={() => setDialog(null)} onAdd={place => { if (!editingPlace && block.places.length >= 15) { setNotice('한 구간에는 최대 15개 장소를 담을 수 있어요.'); return; } updatePlaces(editingPlace ? block.places.map(item => item.id === editingPlace.id ? place : item) : [...block.places, place]); setDialog(null); }} />}
    {dialog === 'block' && (addingBlock || block) && <BlockForm block={addingBlock || block} day={day} days={document.days} onClose={() => { setDialog(null); setAddingBlock(null); }} onSave={(next, targetDay) => { change({ ...document, days: document.days.map(item => ({ ...item, blocks: [...item.blocks.filter(segment => segment.id !== next.id), ...(item.id === targetDay ? [next] : [])].sort((a, b) => a.startTime.localeCompare(b.startTime)) })) }); setDayId(targetDay); setBlockId(next.id); setDialog(null); setAddingBlock(null); }} />}
    {dialog === 'settings' && <TripSettings trip={document} onClose={() => setDialog(null)} onSave={patch => { change({ ...document, ...patch }); setDialog(null); }} />}
  </div>;
}
