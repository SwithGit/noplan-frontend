import { FavoriteButton } from '../mobile/MobileUi';
import { eventFavorite } from './eventFavorite';
import { PublicText, PublicTranslationNote } from '../../i18n/PublicText';
import { t as uiText } from '../../i18n/translate';
import {useEffect,useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import {fetchEvent} from '../../api/eventsApi';
import type {UserSession} from '../../types/noplan';
import {ROUTES} from '../../routes';
import {TripIcon} from '../trips/TripIcon';
import {AddEventToTrip} from './AddEventToTrip';
import {EventImage} from './EventImage';
import {eventDate,eventKinds,eventStatus,type TravelEvent} from './eventModel';
import './events.css';
export function EventDetail({user}:{user:UserSession|null}){
  const {id=''}=useParams();return <EventDetailContent key={`${id}:${user?.userId||'guest'}`} id={id} user={user}/>;
}
function EventDetailContent({id,user}:{id:string;user:UserSession|null}){
  const [event,setEvent]=useState<TravelEvent|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[adding,setAdding]=useState(false),[revision,setRevision]=useState(0);
  useEffect(()=>{let cancelled=false;fetchEvent(id).then(item=>{if(!cancelled)setEvent(item);}).catch(cause=>{if(!cancelled)setError(cause instanceof Error?cause.message:'행사를 불러오지 못했어요.');}).finally(()=>{if(!cancelled)setLoading(false);});return()=>{cancelled=true;};},[id,revision]);
  if(loading)return <div className="event-empty" role="status"><TripIcon name="calendar"/><h2>{uiText("행사 정보를 펼치고 있어요")}</h2></div>;
  if(!event)return <div className="event-empty" role="alert"><h2>{uiText("행사 정보를 확인할 수 없어요")}</h2><p>{uiText(error)}</p><button type="button" className="trip-button" onClick={()=>{setLoading(true);setError('');setRevision(v=>v+1);}}>{uiText("다시 불러오기")}</button><Link className="trip-button" to={ROUTES.events}>{uiText("목록으로")}</Link></div>;
  const status=eventStatus(event),closed=['종료','취소'].includes(status);
  return <div className="events-page event-detail"><nav className="event-breadcrumb"><Link to={ROUTES.events}>{uiText("축제·전시")}</Link><span>/</span><span>{uiText(eventKinds[event.kind])}</span></nav><div className="event-detail-layout"><div className="event-detail-poster"><EventImage event={event}/><p>{uiText(event.sourceLabel)}{event.imageLicense?` · ${event.imageLicense}`:''}</p></div><section className="event-detail-copy"><div className="event-detail-tags"><span>{uiText(eventKinds[event.kind])}</span><span>{uiText(event.region)}</span><span>{uiText(status)}</span></div><h1>{<PublicText source={{kind:'event',id:event.id}} text={event.title}/>}</h1><PublicTranslationNote source={{kind:'event',id:event.id}}/><p className="event-detail-date"><TripIcon name="calendar"/>{eventDate(event.startDate)} — {eventDate(event.endDate)}</p>
    {event.detailUnavailable&&<p className="event-notice">{uiText("상세 정보를 갱신하지 못했어요. 현재 확인된 기본 정보를 보여드려요.")}</p>}
    <dl className="event-facts"><div><dt>{uiText("장소")}</dt><dd>{<PublicText source={{kind:'event',id:event.id}} text={event.venue||event.address||'공식 안내 확인 필요'}/>}</dd></div><div><dt>{uiText("관람 시간")}</dt><dd>{<PublicText source={{kind:'event',id:event.id}} text={event.hours||'공식 안내 확인 필요'}/>}</dd></div><div><dt>{uiText("이용 요금")}</dt><dd>{<PublicText source={{kind:'event',id:event.id}} text={event.price||(event.isFree===true?'무료':'공식 안내 확인 필요')}/>}</dd></div><div><dt>{uiText("관람 대상")}</dt><dd>{<PublicText source={{kind:'event',id:event.id}} text={event.age||'공식 안내 확인 필요'}/>}</dd></div>{event.phone&&<div><dt>{uiText("문의")}</dt><dd>{event.phone}</dd></div>}</dl>
    <div className="event-detail-actions"><FavoriteButton item={eventFavorite(event)}/><button className="trip-button primary" type="button" disabled={closed} onClick={()=>setAdding(true)}><TripIcon name="plus"/>{uiText(closed?'종료·취소된 행사':'내 여행에 담기')}</button>{event.sourceUrl&&<a className="trip-button" href={event.sourceUrl} target="_blank" rel="noreferrer">{uiText("공식 안내 ")}<TripIcon name="arrow"/></a>}{event.bookingUrl&&event.bookingUrl!==event.sourceUrl&&<a className="trip-button" href={event.bookingUrl} target="_blank" rel="noreferrer">{uiText("예약·기관 안내 ")}<TripIcon name="arrow"/></a>}</div><p className="event-help">{uiText("행사를 고정한 뒤, 빈 일정은 노피와 채워보세요.")}<br/>{uiText("기간 중인 행사도 휴관·예약 마감일 수 있어요. 방문 전 공식 안내를 확인해 주세요.")}</p></section></div>
    <div className="event-detail-bottom"><section><span className="event-eyebrow">ABOUT THIS EXPERIENCE</span><h2>{uiText("어떤 경험이 기다릴까요?")}</h2><p className="event-description">{<PublicText source={{kind:'event',id:event.id}} text={event.description||'자세한 프로그램은 공식 안내에서 확인해 주세요.'}/>}</p></section><aside><h2>{uiText("찾아가는 길")}</h2><p><PublicText source={{kind:'event',id:event.id}} text={event.venue||event.title}/></p><p><PublicText source={{kind:'event',id:event.id}} text={event.address}/></p><a className="trip-button" href={`https://map.kakao.com/link/search/${encodeURIComponent(`${event.venue||event.title} ${event.address}`)}`} target="_blank" rel="noreferrer"><TripIcon name="pin"/>{uiText("지도에서 위치 확인")}</a><p className="event-help">{uiText("전국 행사 탐색이 가능하며, AI 주변 코스 추천은 현재 서울·도보 기준이에요.")}</p></aside></div>
    {adding&&<AddEventToTrip event={event} user={user} onClose={()=>setAdding(false)}/>}
  </div>;
}
