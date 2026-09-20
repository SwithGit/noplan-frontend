import { t as uiText } from '../../i18n/translate';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { joinTrip } from '../../api/tripsApi';
import { ROUTES, tripRoute } from '../../routes';
import type { UserSession } from '../../types/noplan';
import './trips.css';

export const PENDING_TRIP_INVITE = 'noplan.pendingTripInvite';
export function TripJoin({ user }: { user: UserSession | null }) {
  const location = useLocation(), navigate = useNavigate();
  const token = location.hash.slice(1);
  const valid = /^[a-zA-Z0-9_-]{43}$/.test(token);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const rememberInvite = () => { if (valid) { try { sessionStorage.setItem(PENDING_TRIP_INVITE, token); } catch { /* The original invitation remains usable. */ } } };
  return <div className="trip-load-state trip-join"><span className="trip-eyebrow">LET’S PLAN TOGETHER</span><h1>{uiText("친구와 같은 여행 노트에 초대됐어요")}</h1>
    <p>{uiText("참여하면 서로 추가한 장소와 바꾼 일정이 함께 반영돼요.")}</p>
    {!valid ? <p role="alert">{uiText("올바르지 않은 초대 링크예요. 친구에게 링크를 다시 받아 주세요.")}</p>
      : !user ? <Link className="trip-button primary" to={ROUTES.login} onClick={rememberInvite}>{uiText("로그인하고 참여하기")}</Link>
        : <button className="trip-button primary" disabled={busy} onClick={async () => {
          setBusy(true); setError('');
          try { const trip = await joinTrip(token); try { sessionStorage.removeItem(PENDING_TRIP_INVITE); } catch { /* Optional navigation helper. */ } navigate(tripRoute(trip.id), { replace: true, state: { initialTrip: trip } }); }
          catch (cause) { setError(cause instanceof Error ? cause.message : '참여하지 못했어요.'); }
          finally { setBusy(false); }
        }}>{uiText(busy ? '참여 중…' : `${user.userNick}님으로 함께 편집하기`)}</button>}
    {error && <p role="alert">{uiText(error)} <Link to={ROUTES.login} onClick={rememberInvite}>{uiText("다시 로그인")}</Link></p>}
    <Link to={ROUTES.trips} className="trip-text-link" onClick={() => { try { sessionStorage.removeItem(PENDING_TRIP_INVITE); } catch { /* Optional. */ } }}>{uiText("내 여행으로")}</Link>
  </div>;
}

export { TripSharing } from './TripSharingPanel';
