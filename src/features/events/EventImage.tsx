import { t as uiText } from '../../i18n/translate';
import {useState} from 'react';
import {TripIcon} from '../trips/TripIcon';
import type {TravelEvent} from './eventModel';
export function EventImage({event}:{event:TravelEvent}){
  const [failed,setFailed]=useState(''),[loaded,setLoaded]=useState('');
  const visible=Boolean(event.imageUrl&&failed!==event.imageUrl&&loaded===event.imageUrl);
  return <div className="event-image">{!visible&&<div className="event-image-empty"><TripIcon name="calendar"/><span>{uiText("새로운 여행의 이유")}</span></div>}{event.imageUrl&&failed!==event.imageUrl&&<img src={event.imageUrl} alt={`${event.title} 행사 포스터`} style={{opacity:visible?1:0}} loading="lazy" referrerPolicy="no-referrer" onLoad={()=>setLoaded(event.imageUrl)} onError={()=>setFailed(event.imageUrl)}/>}</div>;
}
