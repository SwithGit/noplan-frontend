import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listTrips } from '../../api/tripsApi';
import coast from '../../assets/travel/coastal-escape.webp';
import type { UserSession } from '../../types/noplan';
import { ROUTES, tripRoute } from '../../routes';
import { createTrip, dayCount, outboundLabels, readDrafts, shortDate, tomorrow, transportLabels, tripLength, writeDraft, type TripDocument, type TripRecord } from './tripModel';
import { TripIcon } from './TripIcon';
import { TourismPicker } from './TourismPicker';
import { setTourismAnchor } from './tourismModel';
import type { TourismAttraction } from '../../api/tourismApi';
import './trips.css';

export function TripHome({ user, libraryOnly=false }: { user: UserSession | null; libraryOnly?:boolean }) {
  const navigate = useNavigate();
  const [destination, setDestination] = useState('서울');
  const [startDate, setStartDate] = useState(tomorrow);
  const [endDate, setEndDate] = useState(tomorrow);
  const [transport, setTransport] = useState<TripDocument['transport']>('walk');
  const [outbound, setOutbound] = useState<TripDocument['outbound']>('local');
  const [companion, setCompanion] = useState('친구');
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [drafts] = useState(() => readDrafts(user?.userId));
  const [guestDrafts] = useState(() => user ? readDrafts().filter(trip => trip.version === 0) : []);
  const [loading, setLoading] = useState(Boolean(user));
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [pickingTourism, setPickingTourism] = useState(false);
  const [attraction, setAttraction] = useState<TourismAttraction>();
  const [visitDuration, setVisitDuration] = useState(90);
  const [visitDate, setVisitDate] = useState('');
  const [visitSlot, setVisitSlot] = useState(0);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    listTrips().then(result => { if (!cancelled) { setTrips(result); setError(''); } }).catch(() => { if (!cancelled) setError('저장한 여행을 불러오지 못했어요. 새 여행은 계속 만들 수 있어요.'); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, reload]);
  const create = (event: FormEvent) => {
    event.preventDefault();
    try {
      const trip = createTrip({ title: `${destination.trim()}에서 보내는 ${dayCount(startDate, endDate) === 1 ? '하루' : `${dayCount(startDate, endDate)}일`}`.slice(0, 100), destination: destination.trim(), startDate, endDate, transport, outbound, companion });
      const targetDay = trip.document.days.find(day => day.date === (visitDate || startDate));
      const targetBlock = targetDay?.blocks[visitSlot];
      if (attraction) {
        if (!targetDay || !targetBlock) throw new Error('관광지를 방문할 날짜를 여행 기간 안에서 다시 선택해 주세요.');
        trip.document = setTourismAnchor(trip.document, targetDay.id, targetBlock.id, attraction, visitDuration);
      }
      // Navigation state keeps creation usable even when browser storage is full.
      try { writeDraft(trip, user?.userId); } catch { /* editor shows persistence status */ }
      navigate(tripRoute(trip.id), { state: { initialTrip: trip, ...(attraction ? { focusDayId: targetDay?.id, focusBlockId: targetBlock?.id } : {}) } });
    } catch (cause) { setError(cause instanceof Error ? cause.message : '여행 조건을 확인해 주세요.'); }
  };
  const count = dayCount(startDate, endDate);
  return <div className={`trip-home ${libraryOnly?'library-only':''}`}>
    <section className="travel-hero">
      <img src={coast} alt="푸른 바다와 산책길이 있는 해안 여행 일러스트" fetchPriority="high" />
      <div className="travel-hero-copy"><span className="trip-eyebrow">YOUR NEXT LITTLE ESCAPE</span><h1>가고 싶은 곳에서,<br />우리다운 여행으로.</h1><p>큰 일정은 가볍게 정하고<br />그 사이의 좋은 순간은 노피와 채워보세요.</p><a href="#trip-create" className="travel-hero-link">새로운 여행을 시작해요 <TripIcon name="arrow" /></a></div>
      <span className="travel-hero-stamp">Less planning.<br /><b>More memories.</b></span>
    </section>
    <form id="trip-create" className="trip-create-form" onSubmit={create}>
      <div className="trip-create-heading"><span><TripIcon name="spark" /> 나의 다음 여행</span><small>{count > 0 && count <= 14 ? count === 1 ? '가볍게, 당일치기' : `${count - 1}박 ${count}일의 새로운 발견` : '최대 14일'}</small></div>
      <div className="trip-create-fields">
        <label><span><TripIcon name="pin" /> 어디로 떠날까요?</span><input aria-label="여행 목적지" maxLength={100} required value={destination} onChange={event => setDestination(event.target.value)} placeholder="도시 또는 지역" /></label>
        <label><span>가는 날</span><input aria-label="여행 시작일" type="date" required value={startDate} onChange={event => { setStartDate(event.target.value); if (event.target.value > endDate) setEndDate(event.target.value); }} /></label>
        <label><span>오는 날</span><input aria-label="여행 종료일" type="date" required min={startDate} value={endDate} onChange={event => setEndDate(event.target.value)} /></label>
        <button className="trip-button primary" type="submit">여행 만들기 <TripIcon name="arrow" /></button>
      </div>
      <div className="trip-create-options">
        <label>함께하는 사람<select aria-label="여행 동행" value={companion} onChange={e => setCompanion(e.target.value)}>{['혼자', '친구', '연인', '가족', '동료'].map(value => <option key={value}>{value}</option>)}</select></label>
        <label>여행지까지<select aria-label="여행지까지 이동" value={outbound} onChange={e => setOutbound(e.target.value as TripDocument['outbound'])}>{Object.entries(outboundLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label>여행지 안에서<select aria-label="현지 이동 방식" value={transport} onChange={e => setTransport(e.target.value as TripDocument['transport'])}>{Object.entries(transportLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      </div>
      <div className="trip-home-tourism"><div><span className="trip-eyebrow">여행의 중심이 될 곳</span><h3>{attraction?.name || '꼭 가고 싶은 관광지가 있나요?'}</h3><p>{attraction ? `${attraction.address} · 관람 ${visitDuration}분` : '관광지를 고르면 오전·오후·저녁의 중심 일정으로 담아드려요.'}</p></div><div className="tourism-home-actions"><button className="trip-button" type="button" onClick={() => setPickingTourism(true)}><TripIcon name="pin" />{attraction ? '관광지 변경' : '관광지부터 고르기'}</button>{attraction && <button className="trip-text-link" type="button" onClick={() => setAttraction(undefined)}>선택 해제</button>}</div>{attraction && <div className="trip-form-row tourism-home-schedule"><label className="trip-field">방문 날짜<input type="date" required min={startDate} max={endDate} value={visitDate || startDate} onChange={e => setVisitDate(e.target.value)} /></label><label className="trip-field">방문 구간<select value={visitSlot} onChange={e => setVisitSlot(Number(e.target.value))}><option value={0}>오전 · 09:00–12:00</option><option value={1}>오후 · 13:00–17:00</option><option value={2}>저녁 · 18:00–21:00</option></select></label></div>}</div>
    </form>
    {pickingTourism && <TourismPicker destination={destination} initial={attraction} initialDuration={visitDuration} context="선택할 여행 구간" onClose={() => setPickingTourism(false)} onSelect={(place, duration) => { setAttraction(place); setVisitDuration(duration); setPickingTourism(false); }} />}
    <div className="trip-home-caption"><span>주변 코스는 도보 1.5km, 자가용·렌터카 10km 범위에서 찾아요. 등록된 장소가 없는 지역은 실시간 검색으로 찾으며 가격·리뷰 확인이 필요해요.</span><Link to={ROUTES.quickHome}>지금 주변 코스만 찾기 <TripIcon name="arrow" /></Link></div>
    {!libraryOnly&&<div className="m-desktop-only"><Link className="pc-event-entry" to={ROUTES.events}><TripIcon name="calendar"/><div><strong>여행 날짜에 어떤 축제·전시가 열릴까요?</strong><small>가고 싶은 경험을 먼저 고르고, 내 여행에 담아보세요.</small></div><TripIcon name="arrow"/></Link></div>}
    {error && <div className="trip-alert" role="alert">{error}{user && <button onClick={() => { setLoading(true); setReload(value => value + 1); }} type="button">다시 불러오기</button>}</div>}
    <section className="trip-library"><header><div><span className="trip-eyebrow">MY JOURNEYS</span><h2>다음 여행이 기다리고 있어요</h2></div>{libraryOnly?<><Link className="trip-button primary m-desktop-only" to={ROUTES.newTrip}>새 여행 만들기</Link><span className="trip-muted m-mobile-only">{user ? `${user.userNick}님의 여행` : '나만의 여행 노트'}</span></>:<span className="trip-muted">{user ? `${user.userNick}님의 여행` : '나만의 여행 노트'}</span>}</header>
      <div className="trip-library-grid">
        {drafts.map(draft => <button key={draft.id} className="trip-library-card draft" type="button" onClick={() => navigate(tripRoute(draft.id), { state: { initialTrip: draft } })}><span className="trip-card-art"><TripIcon name="map" /><span>{draft.version ? 'JOURNEY' : 'DRAFT'}</span></span><div><span className="trip-tag">{draft.version ? '계정에 저장한 여행 · 이 기기의 작업본' : '이 브라우저의 초안'}</span><h3>{draft.document.title}</h3><p>{shortDate(draft.document.startDate)} · {tripLength(draft.document)}</p><span className="trip-card-link">이어서 계획하기 <TripIcon name="arrow" /></span></div></button>)}
        {guestDrafts.filter(trip => !drafts.some(draft => draft.id === trip.id) && !trips.some(saved => saved.id === trip.id)).map(trip => <button key={trip.id} className="trip-library-card" type="button" onClick={() => navigate(tripRoute(trip.id), { state: { initialTrip: trip } })}><span className="trip-card-art"><TripIcon name="map" /></span><div><span className="trip-tag">로그인 전에 만든 초안</span><h3>{trip.document.title}</h3><span className="trip-card-link">이 계정으로 이어서 작성 <TripIcon name="arrow" /></span></div></button>)}
        {trips.filter(trip => !drafts.some(draft => draft.id === trip.id)).map(trip => <Link to={tripRoute(trip.id)} key={trip.id} className="trip-library-card"><span className="trip-card-art"><TripIcon name="pin" /><span>{trip.document.destination}</span></span><div><span className="trip-tag">저장한 여행</span><h3>{trip.document.title}</h3><p>{shortDate(trip.document.startDate)} · {tripLength(trip.document)}</p><span className="trip-card-link">일정 열기 <TripIcon name="arrow" /></span></div></Link>)}
        {!drafts.length && !trips.length && !guestDrafts.length && <div className="trip-library-empty"><span className="trip-empty-icon"><TripIcon name="map" /></span><h3>{loading ? '여행 노트를 불러오고 있어요' : '아직 빈 여행 노트, 곧 특별해질 거예요.'}</h3><p>{user ? (libraryOnly ? '새 여행 만들기에서 목적지와 날짜를 골라보세요.' : '위에서 목적지와 날짜를 고르면 첫 페이지가 시작돼요.') : '로그인 없이 초안을 만들 수 있어요. 계정에 저장하면 다른 기기에서도 이어볼 수 있어요.'}</p>{!user && <Link to={ROUTES.login} className="trip-text-link">로그인하기 <TripIcon name="arrow" /></Link>}</div>}
      </div>
    </section>
    <div className="trip-how"><div><span>01</span><h3>큰 일정부터 가볍게</h3><p>날짜와 오전·오후의 흐름을 정해요.</p></div><div><span>02</span><h3>꼭 갈 곳은 고정해두기</h3><p>놓치고 싶지 않은 장소를 담아두세요.</p></div><div><span>03</span><h3>빈 시간은 노피와 함께</h3><p>선택한 구간에 주변 코스를 더해요.</p></div></div>
  </div>;
}
