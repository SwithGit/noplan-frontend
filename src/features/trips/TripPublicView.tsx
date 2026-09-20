import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getPublicTrip } from '../../api/tripsApi';
import { t } from '../../i18n/translate';
import { ROUTES } from '../../routes';
import { TripOverview } from './TripOverview';
import { useTripPhotos } from './useTripPhotos';
import type { TripDocument } from './tripModel';
export function TripPublicView() {
  const location=useLocation(),navigate=useNavigate(),token=location.hash.slice(1);
  const [result,setResult]=useState<{token:string;document?:TripDocument;error?:string}>();
  const [attempt,setAttempt]=useState(0);
  const current=result?.token===token?result:undefined;
  const photos=useTripPhotos(current?.document);
  useEffect(()=>{const controller=new AbortController();if(!/^[a-zA-Z0-9_-]{43}$/.test(token))return;
    getPublicTrip(token,controller.signal).then(value=>{if(!controller.signal.aborted)setResult({token,document:value.document});}).catch(cause=>{if(!controller.signal.aborted)setResult({token,error:cause instanceof Error?cause.message:'공유 일정을 불러오지 못했어요.'});});
    return()=>controller.abort();
  },[token,attempt]);
  if(current?.document)return <TripOverview document={current.document} photos={photos} onClose={()=>navigate(ROUTES.appHome)} readOnly />;
  return <div className="trip-load-state"><h1>{t('공유 여행')}</h1><p role="status">{t(!/^[a-zA-Z0-9_-]{43}$/.test(token)?'공유 링크를 확인해 주세요.':current?.error||'공유 일정을 불러오고 있어요…')}</p>{current?.error&&<button className="trip-button" type="button" onClick={()=>setAttempt(value=>value+1)}>{t('다시 시도')}</button>}<Link to={ROUTES.appHome}>{t('홈')}</Link></div>;
}
