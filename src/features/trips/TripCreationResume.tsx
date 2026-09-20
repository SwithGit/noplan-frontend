import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { t as uiText } from '../../i18n/translate';
import { ROUTES, tripRoute } from '../../routes';
import type { UserSession } from '../../types/noplan';
import { ApiError } from '../../api/client';
import { clearPendingTripCreation, readPendingTripCreation, savePendingTripCreation } from './pendingTripCreation';
import { clearTripCreation, writeTripCreation } from './tripCreationDraft';
import { writeDraft } from './tripModel';

export function TripCreationResume({ user }: { user: UserSession | null }) {
  const navigate = useNavigate();
  const [pending] = useState(readPendingTripCreation);
  const [error, setError] = useState('');
  const [loginRequired, setLoginRequired] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!user || !pending) return;
    let active = true;
    savePendingTripCreation(pending, user.userId).then(trip => {
      if (!active) return;
      try { writeDraft(trip, user.userId); } catch { /* The account copy is already saved. */ }
      clearPendingTripCreation(pending.trip.id);
      clearTripCreation(pending.sourceUserId);
      clearTripCreation(user.userId);
      navigate(tripRoute(trip.id), { replace: true, state: { initialTrip: trip, focusDayId: pending.focusDayId, focusBlockId: pending.focusBlockId } });
    }).catch(cause => { if (active) { setLoginRequired(cause instanceof ApiError && cause.status === 401); setError(cause instanceof Error ? cause.message : '여행을 저장하지 못했어요. 입력한 조건은 유지돼요.'); } });
    return () => { active = false; };
  }, [user, pending, attempt, navigate]);

  const editConditions = () => {
    if (pending) writeTripCreation(pending.draft, user?.userId);
    clearPendingTripCreation(pending?.trip.id);
    navigate(ROUTES.newTrip, { replace: true });
  };
  return <div className="trip-load-state" aria-live="polite">
    <h1>{uiText(!pending ? '여행 조건을 다시 확인해 주세요.' : !user ? '여행을 저장하고 친구와 함께 계획해 보세요.' : error ? '여행을 저장하지 못했어요. 입력한 조건은 유지돼요.' : '여행을 계정에 저장하고 있어요…')}</h1>
    {pending && <p>{uiText(pending.trip.document.destination)} · {pending.trip.document.startDate} — {pending.trip.document.endDate}</p>}
    {error && <p className="trip-alert" role="alert">{uiText(error)}</p>}
    {(!user || loginRequired) && pending && <Link className="trip-button primary" to={ROUTES.login}>{uiText('로그인하고 여행 만들기')}</Link>}
    {user && error && !loginRequired && <button className="trip-button primary" type="button" onClick={() => { setError(''); setAttempt(value => value + 1); }}>{uiText('다시 시도')}</button>}
    {(!pending || !user || error) && <button className="trip-button" type="button" onClick={editConditions}>{uiText('여행 조건 수정')}</button>}
  </div>;
}
