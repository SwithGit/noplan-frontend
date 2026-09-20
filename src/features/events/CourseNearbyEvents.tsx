import { PublicText } from '../../i18n/PublicText';
import { t as uiText } from '../../i18n/translate';
import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import type {CoursePlace} from '../../types/noplan';
import {fetchEvents} from '../../api/eventsApi';
import {ROUTES,eventRoute} from '../../routes';
import {EventImage} from './EventImage';
import {eventKinds,eventDate,type TravelEvent} from './eventModel';
import {courseEventStops,eventDistance} from './courseNearby';
import {TripIcon} from '../trips/TripIcon';
import './events.css';
export function CourseNearbyEvents({places}:{places:CoursePlace[]}){
  const stops=courseEventStops(places),query=stops.length?new URLSearchParams({near:JSON.stringify(stops)}).toString():'';
  const [response,setResponse]=useState<{query:string;events:TravelEvent[]}>({query:'',events:[]});
  useEffect(()=>{
    if(!query)return;
    let cancelled=false;
    fetchEvents(new URLSearchParams(query)).then(result=>{if(!cancelled)setResponse({query,events:result.events.slice(0,3)});}).catch(()=>{if(!cancelled)setResponse({query,events:[]});});
    return()=>{cancelled=true;};
  },[query]);
  if(!query||response.query!==query||!response.events.length)return null;
  return <section className="course-nearby-events" aria-label={uiText("코스 주변 문화·행사")}>
    <header><span><TripIcon name="calendar"/>{uiText("코스 옆, 새로운 발견")}</span><h2>{uiText("주변에 이런 행사도 있어요")}</h2><p>{uiText("코스 방문 날짜에 열리는 행사예요.")}<br/>{uiText("마음에 드는 곳이 있다면 여기도 확인해볼래요?")}</p></header>
    <div className="nearby-event-list">{response.events.map(event=><Link className="nearby-event-card" key={event.id} to={eventRoute(event.id)}><EventImage event={event}/><div><small>{uiText(eventKinds[event.kind])} · {event.nearby?.placeIndex}{uiText("번째 장소에서 직선 ")}{eventDistance(event.nearby?.distanceMeters||0)}</small><h3>{<PublicText source={{kind:'event',id:event.id}} text={event.title}/>}</h3><p>{eventDate(event.startDate)} — {eventDate(event.endDate)}</p><span>{event.venue||event.address}</span></div><TripIcon name="arrow"/></Link>)}</div>
    <Link className="nearby-event-more" to={`${ROUTES.events}?${query}`}>{uiText("주변 행사 더 보기 ")}<TripIcon name="arrow"/></Link>
    <p className="nearby-event-note">{uiText("각 장소에서 직선 1km 이내 · 관람 시간·휴관·예약 여부는 공식 안내를 확인해 주세요.")}</p>
  </section>;
}
