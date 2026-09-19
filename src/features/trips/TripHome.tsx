import { useDesktop } from '../mobile/useDesktop';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { deleteTrip, getTrip, listTrips } from '../../api/tripsApi';
import { ApiError } from '../../api/client';
import { TripDialog } from './TripDialog';
import coast from '../../assets/travel/coastal-escape.webp';
import type { UserSession } from '../../types/noplan';
import { ROUTES, tripRoute } from '../../routes';
import { readDrafts, removeDraft, shortDate, tripLength, type TripRecord } from './tripModel';
import { TripIcon } from './TripIcon';
import { HomeExhibitionBanner, HomeHero, HomeTravelCourses } from './HomeDiscovery';
import { TripCreateForm } from './TripCreateForm';
import './trips.css';

export function TripHome({ user, libraryOnly=false }: { user: UserSession | null; libraryOnly?:boolean }) {
  const desktop = useDesktop();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [drafts, setDrafts] = useState(() => readDrafts(user?.userId));
  const [guestDrafts, setGuestDrafts] = useState(() => user ? readDrafts().filter(trip => trip.version === 0) : []);
  const [loading, setLoading] = useState(Boolean(user));
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [removing, setRemoving] = useState<{ trip: TripRecord; guest: boolean; saved: boolean }>();
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [notice, setNotice] = useState('');
  const [deleteReady, setDeleteReady] = useState(false);
  const beginDelete = async (trip: TripRecord, guest = false) => {
    const saved = trip.version > 0 || trips.some(item => item.id === trip.id);
    setRemoving({ trip, guest, saved }); setDeleteError(''); setNotice(''); setDeleteReady(false);
    if (!saved) { setDeleteReady(true); return; }
    setDeleteBusy(true);
    try {
      const latest = await getTrip(trip.id);
      setRemoving({ trip: latest, guest, saved }); setDeleteReady(true);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 404) {
        // The account copy was already deleted or access was removed; clear only this cache.
        setRemoving({ trip, guest, saved: false }); setDeleteReady(true);
      } else setDeleteError('저장한 여행을 확인하지 못했어요. 창을 닫고 다시 시도해 주세요.');
    } finally { setDeleteBusy(false); }
  };
  const confirmDelete = async () => {
    if (!removing || !deleteReady || deleteBusy) return;
    setDeleteBusy(true); setDeleteError('');
    const { trip, guest, saved } = removing;
    try {
      let action = 'deleted';
      if (saved) {
        try { action = (await deleteTrip(trip)).action; }
        catch (cause) { if (!(cause instanceof ApiError && cause.status === 404)) throw cause; }
        // A cache write failure must not send another account deletion on retry.
        setRemoving({ trip, guest, saved: false });
      }
      removeDraft(trip.id, guest ? undefined : user?.userId);
      if (saved && user) removeDraft(trip.id);
      setDrafts(readDrafts(user?.userId));
      setGuestDrafts(user ? readDrafts().filter(item => item.version === 0) : []);
      setTrips(items => items.filter(item => item.id !== trip.id));
      setReload(value => value + 1);
      setRemoving(undefined);
      setNotice(action === 'left' ? '공동 여행에서 나왔어요.' : '여행을 삭제했어요.');
    } catch (cause) {
      setDeleteError(cause instanceof ApiError ? cause.message : '삭제를 완료하지 못했어요. 다시 시도해 주세요.');
      if (cause instanceof ApiError && cause.status === 409) setDeleteReady(false);
    } finally { setDeleteBusy(false); }
  };
  const deleteButton = (trip: TripRecord, guest = false) => <button className="trip-library-delete" type="button" aria-label={`${trip.document.title} ${trip.collaboration?.role === 'editor' ? '나가기' : '삭제'}`} onClick={() => void beginDelete(trip, guest)}>{trip.collaboration?.role === 'editor' ? '나가기' : '삭제'}</button>;
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    listTrips().then(result => { if (!cancelled) { setTrips(result); setError(''); } }).catch(() => { if (!cancelled) setError('저장한 여행을 불러오지 못했어요. 새 여행은 계속 만들 수 있어요.'); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, reload]);
  return <div className={`trip-home ${libraryOnly?'library-only':''}`}>
    {desktop && !libraryOnly ? <HomeHero /> : <section className="travel-hero">
      <img src={coast} alt="푸른 바다와 산책길이 있는 해안 여행 일러스트" fetchPriority="high" />
      <div className="travel-hero-copy"><span className="trip-eyebrow">YOUR NEXT LITTLE ESCAPE</span><h1>가고 싶은 곳에서,<br />우리다운 여행으로.</h1><p>큰 일정은 가볍게 정하고<br />그 사이의 좋은 순간은 노피와 채워보세요.</p><a href="#trip-create" className="travel-hero-link">새로운 여행을 시작해요 <TripIcon name="arrow" /></a></div>
      <span className="travel-hero-stamp">Less planning.<br /><b>More memories.</b></span>
    </section>}
    {(!libraryOnly || !desktop) && <TripCreateForm key={user?.userId || 'guest'} user={user} />}
    <div className="trip-home-caption"><span>노피 코스는 도보 1km·차량 7km 이내의 실제 경로로 연결해요. 가까운 후보가 부족하면 거리를 자동으로 늘리지 않고 안내해요.</span>{!desktop && <Link to={ROUTES.quickHome}>지금 주변 코스만 찾기 <TripIcon name="arrow" /></Link>}</div>
    {desktop && !libraryOnly && <><HomeExhibitionBanner /><HomeTravelCourses /></>}
    {error && <div className="trip-alert" role="alert">{error}{user && <button onClick={() => { setLoading(true); setReload(value => value + 1); }} type="button">다시 불러오기</button>}</div>}
    {notice && <p className="trip-library-notice" role="status">{notice}</p>}
    <section className="trip-library"><header><div><span className="trip-eyebrow">MY JOURNEYS</span><h2>다음 여행이 기다리고 있어요</h2></div>{libraryOnly?<><Link className="trip-button primary m-desktop-only" to={ROUTES.newTrip}>새 여행 만들기</Link><span className="trip-muted m-mobile-only">{user ? `${user.userNick}님의 여행` : '나만의 여행 노트'}</span></>:<span className="trip-muted">{user ? `${user.userNick}님의 여행` : '나만의 여행 노트'}</span>}</header>
      <div className="trip-library-grid">
        {drafts.map(draft => <article className="trip-library-item" key={draft.id}><button className="trip-library-card draft" type="button" onClick={() => navigate(tripRoute(draft.id), { state: { initialTrip: draft } })}><span className="trip-card-art"><TripIcon name="map" /><span>{draft.version ? 'JOURNEY' : 'DRAFT'}</span></span><div><span className="trip-tag">{draft.collaboration?.enabled ? `친구와 함께 · ${draft.collaboration.memberCount}명` : draft.version ? '계정에 저장한 여행 · 이 기기의 작업본' : '이 브라우저의 초안'}</span><h3>{draft.document.title}</h3><p>{shortDate(draft.document.startDate)} · {tripLength(draft.document)}</p><span className="trip-card-link">이어서 계획하기 <TripIcon name="arrow" /></span></div></button>{deleteButton(draft)}</article>)}
        {guestDrafts.filter(trip => !drafts.some(draft => draft.id === trip.id) && !trips.some(saved => saved.id === trip.id)).map(trip => <article className="trip-library-item" key={trip.id}><button className="trip-library-card" type="button" onClick={() => navigate(tripRoute(trip.id), { state: { initialTrip: trip } })}><span className="trip-card-art"><TripIcon name="map" /></span><div><span className="trip-tag">로그인 전에 만든 초안</span><h3>{trip.document.title}</h3><span className="trip-card-link">이 계정으로 이어서 작성 <TripIcon name="arrow" /></span></div></button>{deleteButton(trip, true)}</article>)}
        {trips.filter(trip => !drafts.some(draft => draft.id === trip.id)).map(trip => <article className="trip-library-item" key={trip.id}><Link to={tripRoute(trip.id)} className="trip-library-card"><span className="trip-card-art"><TripIcon name="pin" /><span>{trip.document.destination}</span></span><div><span className="trip-tag">{trip.collaboration?.enabled ? `친구와 함께 · ${trip.collaboration.memberCount}명` : '저장한 여행'}</span><h3>{trip.document.title}</h3><p>{shortDate(trip.document.startDate)} · {tripLength(trip.document)}</p><span className="trip-card-link">일정 열기 <TripIcon name="arrow" /></span></div></Link>{deleteButton(trip)}</article>)}
        {!drafts.length && !trips.length && !guestDrafts.length && <div className="trip-library-empty"><span className="trip-empty-icon"><TripIcon name="map" /></span><h3>{loading ? '여행 노트를 불러오고 있어요' : '아직 빈 여행 노트, 곧 특별해질 거예요.'}</h3><p>{user ? (libraryOnly ? '새 여행 만들기에서 목적지와 날짜를 골라보세요.' : '위에서 목적지와 날짜를 고르면 첫 페이지가 시작돼요.') : '로그인 없이 초안을 만들 수 있어요. 계정에 저장하면 다른 기기에서도 이어볼 수 있어요.'}</p>{!user && <Link to={ROUTES.login} className="trip-text-link">로그인하기 <TripIcon name="arrow" /></Link>}</div>}
      </div>
    </section>
    {removing && <TripDialog title={removing.saved && removing.trip.collaboration?.role === 'editor' ? '공동 여행에서 나갈까요?' : '이 여행을 삭제할까요?'} onClose={() => { if (!deleteBusy) setRemoving(undefined); }} className="trip-delete-dialog">
      <div className="trip-delete-content"><strong>{removing.trip.document.title}</strong><p>{shortDate(removing.trip.document.startDate)} · {tripLength(removing.trip.document)}</p>
        <p>{!deleteReady && deleteBusy ? '저장된 여행 정보를 확인하고 있어요.' : removing.saved ? removing.trip.collaboration?.role === 'editor' ? '내 목록에서 빠지고 공동 편집이 종료돼요. 다른 참여자의 여행은 유지돼요.' : `계정에 저장된 일정과 이 기기의 작업본을 삭제해요.${removing.trip.collaboration?.enabled ? ' 함께한 친구들도 이 여행에 접근할 수 없어요.' : ''} 삭제 후에는 되돌릴 수 없어요.` : '이 브라우저에 보관한 초안을 삭제해요. 삭제 후에는 되돌릴 수 없어요.'}</p>
        {deleteError && <p role="alert" className="trip-delete-error">{deleteError}</p>}
        <div className="trip-delete-actions"><button className="trip-button" type="button" disabled={deleteBusy} onClick={() => setRemoving(undefined)}>취소</button><button className="trip-button trip-delete-confirm" type="button" disabled={deleteBusy || !deleteReady} onClick={() => void confirmDelete()}>{deleteBusy ? '처리 중…' : removing.saved && removing.trip.collaboration?.role === 'editor' ? '여행에서 나가기' : '삭제하기'}</button></div>
      </div>
    </TripDialog>}
    <div className="trip-how"><div><span>01</span><h3>큰 일정부터 가볍게</h3><p>날짜와 오전·오후의 흐름을 정해요.</p></div><div><span>02</span><h3>꼭 갈 곳은 고정해두기</h3><p>놓치고 싶지 않은 장소를 담아두세요.</p></div><div><span>03</span><h3>빈 시간은 노피와 함께</h3><p>선택한 구간에 주변 코스를 더해요.</p></div></div>
  </div>;
}
