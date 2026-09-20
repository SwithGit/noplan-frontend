import { t as uiText } from '../../i18n/translate';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createTripInvite, getTripMembers, joinTrip, removeTripMember, revokeTripInvite, type TripMember } from '../../api/tripsApi';
import { ROUTES, tripRoute } from '../../routes';
import type { UserSession } from '../../types/noplan';
import type { TripRecord } from './tripModel';
import { TripDialog } from './TripDialog';
import './trips.css';

export const PENDING_TRIP_INVITE = 'noplan.pendingTripInvite';
export function TripSharing({ trip, onClose }: { trip: TripRecord; onClose: () => void }) {
  const [members, setMembers] = useState<TripMember[]>([]);
  const [link, setLink] = useState('');
  const [expires, setExpires] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const owner = trip.collaboration?.role === 'owner';
  useEffect(() => { let active = true; getTripMembers(trip.id).then(value => { if (active) setMembers(value); }).catch(() => { if (active) setMessage('참여자를 불러오지 못했어요.'); }); return () => { active = false; }; }, [trip.id]);
  const perform = async (action: () => Promise<void>) => {
    setBusy(true); setMessage('');
    try { await action(); } catch (cause) { setMessage(cause instanceof Error ? cause.message : '처리하지 못했어요. 다시 시도해 주세요.'); }
    finally { setBusy(false); }
  };
  return <TripDialog title={uiText("친구와 함께 일정 짜기")} className="trip-sharing-dialog" onClose={onClose}>
    <p className="trip-muted">{uiText("참여한 친구는 장소·시간·메모를 함께 수정할 수 있어요. 변경사항은 자동 저장되고 약 3초 안에 서로 반영돼요.")}</p>
    <h3>{uiText("함께하는 사람 ")}{members.length}{uiText("명")}</h3>
    <ul className="trip-member-list">{members.map(member => <li key={member.userId}><span><strong>{member.nickname}</strong><small>{uiText(member.role === 'owner' ? '여행 만든 사람' : '함께 편집')}</small></span>{owner && member.role !== 'owner' && <button disabled={busy} className="trip-text-link" onClick={() => {
      if (!window.confirm(`${member.nickname}님의 편집 권한을 해제할까요? 기존 초대 링크도 함께 만료됩니다.`)) return;
      void perform(async () => { await removeTripMember(trip.id, member.userId); setLink(''); setMembers(await getTripMembers(trip.id)); setMessage('참여자를 제외하고 기존 초대 링크를 만료했어요.'); });
    }}>{uiText("제외")}</button>}</li>)}</ul>
    {owner ? <div className="trip-invite-controls">
      <p className="trip-muted">{uiText("초대 링크를 받은 사람은 로그인 후 참여할 수 있어요. 링크는 7일 동안 유효하고, 새로 만들면 이전 링크는 만료돼요.")}</p>
      <button className="trip-button primary" disabled={busy} onClick={() => void perform(async () => {
        const invite = await createTripInvite(trip.id);
        setLink(`${window.location.origin}${ROUTES.tripJoin}#${invite.token}`); setExpires(invite.expiresAt);
        setMessage('초대 링크를 만들었어요. 친구에게 보내 주세요.');
      })}>{uiText(busy ? '처리 중…' : link ? '새 초대 링크 만들기' : '초대 링크 만들기')}</button>
      {link && <><label className="trip-field">{uiText("친구 초대 링크")}<input aria-label={uiText("친구 초대 링크")} value={link} readOnly onFocus={event => event.currentTarget.select()} /></label><button className="trip-button" onClick={() => void perform(async () => { await navigator.clipboard.writeText(link); setMessage('초대 링크를 복사했어요.'); })}>{uiText("링크 복사")}</button><small>{new Date(expires).toLocaleDateString('ko-KR')}{uiText("까지 참여 가능")}</small></>}
      <button className="trip-text-link" disabled={busy} onClick={() => void perform(async () => { await revokeTripInvite(trip.id); setLink(''); setMessage('기존 초대 링크를 만료했어요. 이미 참여한 친구의 편집 권한은 유지돼요.'); })}>{uiText("초대 링크 만료시키기")}</button>
    </div> : <p className="trip-muted">{uiText("새 친구 초대와 참여자 관리는 여행을 만든 사람이 할 수 있어요.")}</p>}
    {message && <p className="trip-alert" role="status">{uiText(message)}</p>}
  </TripDialog>;
}

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
