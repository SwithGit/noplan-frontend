import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { getTrip } from '../../api/tripsApi';
import { t as uiText } from '../../i18n/translate';
import { ROUTES } from '../../routes';
import type { UserSession } from '../../types/noplan';
import { readDrafts, type TripRecord } from '../trips/tripModel';
import { TripWorkspace } from '../trips/TripWorkspace';
import { TripOverview } from '../trips/TripOverview';
import { useTripPhotos } from '../trips/useTripPhotos';

export function MobileTripView({ user }: { user: UserSession | null }) {
  const { id = '' } = useParams(), location = useLocation(), navigate = useNavigate();
  const [trip, setTrip] = useState<TripRecord | undefined>(() => {
    const initial = (location.state as { initialTrip?: TripRecord } | null)?.initialTrip;
    return readDrafts(user?.userId).find(value => value.id === id) || (initial?.id === id ? initial : undefined);
  });
  const [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  const [confirmed,setConfirmed]=useState(false);
  const photos = useTripPhotos(trip?.document);
  useEffect(() => {
    if (!user || trip?.version === 0) return;
    let cancelled = false;
    getTrip(id).then(value => { if (!cancelled) { setTrip(value); setConfirmed(true); setError(''); } }).catch(() => { if (!cancelled) setError('최신 일정을 불러오지 못했어요. 다시 확인해 주세요.'); });
    return () => { cancelled = true; };
  }, [id, user, attempt, trip?.version]);
  if(trip&&!trip.collaboration?.enabled&&(!user||trip.version===0||confirmed))return <TripWorkspace user={user}/>;
  return <div className="mobile-page m-trip-view"><p className="m-notice">{uiText('팀 플래닝은 PC에서, 모바일에서는 함께 만든 일정을 확인해요.')}</p>
    {error && <p role="alert">{uiText(error)} <button type="button" onClick={() => setAttempt(value => value + 1)}>{uiText('다시 불러오기')}</button></p>}
    {trip ? <TripOverview document={trip.document} photos={photos} onClose={() => navigate(ROUTES.myPage)} readOnly readOnlyNotice={error || '팀 플래닝은 PC에서, 모바일에서는 함께 만든 일정을 확인해요.'}/> : <><p role="status">{uiText(user ? error || '여행 일정을 불러오고 있어요…' : '로그인하고 저장한 일정을 확인해 주세요.')}</p><Link to={user ? ROUTES.myPage : ROUTES.login}>{uiText(user ? '마이로 이동' : '로그인하기')}</Link></>}
  </div>;
}
