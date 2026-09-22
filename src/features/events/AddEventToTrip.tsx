import { t as uiText } from '../../i18n/translate';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listTrips } from '../../api/tripsApi';
import type { UserSession } from '../../types/noplan';
import { tripRoute } from '../../routes';
import { TripDialog } from '../trips/TripDialog';
import { createTrip, clock, newId, readDrafts, writeDraft, usedMinutes, minutes, type TripRecord, type TripPlace } from '../trips/tripModel';
import { eventKinds, koreaToday, type TravelEvent } from './eventModel';

export function AddEventToTrip({event,user,onClose}:{event:TravelEvent;user:UserSession|null;onClose:()=>void}){
  const navigate=useNavigate();
  const [trips,setTrips]=useState<TripRecord[]>(()=>readDrafts(user?.userId));
  const [visitStart,setVisitStart]=useState('');
  const [tripId,setTripId]=useState('new'),[dayId,setDayId]=useState(''),[blockId,setBlockId]=useState('');
  const [date,setDate]=useState(event.startDate>koreaToday()?event.startDate:koreaToday()),[duration,setDuration]=useState(60),[error,setError]=useState(''),[loadError,setLoadError]=useState(false),[loading,setLoading]=useState(Boolean(user)),[revision,setRevision]=useState(0);
  useEffect(()=>{if(!user)return;let cancelled=false;listTrips().then(remote=>{if(!cancelled){const drafts=readDrafts(user.userId);setTrips([...drafts,...remote.filter(t=>!drafts.some(d=>d.id===t.id))]);setLoadError(false);}}).catch(()=>{if(!cancelled)setLoadError(true);}).finally(()=>{if(!cancelled)setLoading(false);});return()=>{cancelled=true;};},[user,revision]);
  const trip=trips.find(t=>t.id===tripId),days=trip?.document.days.filter(day=>day.date>=event.startDate&&day.date<=event.endDate&&day.date>=koreaToday())||[];
  const day=days.find(d=>d.id===dayId)||days[0],block=day?.blocks.find(b=>b.id===blockId)||day?.blocks[0];
  const add=()=>{
    setError('');
    if(event.status==='cancelled'||event.endDate<koreaToday())return setError('종료되거나 취소된 행사는 담을 수 없어요.');
    if(!Number.isInteger(duration)||duration<10||duration>600)return setError('머무는 시간을 10~600분으로 입력해 주세요.');
    if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(visitStart)||minutes(visitStart)+duration>1439)return setError('공식 행사 시간을 확인하고 방문 시작 시간을 선택해 주세요.');
    const visitEnd=clock(minutes(visitStart)+duration);
    const place:TripPlace={id:newId(),name:event.title,address:event.address||event.venue,type:eventKinds[event.kind],lat:event.lat,lng:event.lng,durationMinutes:duration,fixed:true,requiredVisit:{start:visitStart,end:visitEnd},source:'manual',sourceUrl:event.sourceUrl,event:{id:event.id,startDate:event.startDate,endDate:event.endDate,hours:event.hours}};
    let next:TripRecord,selectedDay:string,selectedBlock:string;
    if(tripId==='new'){
      if(!date||date<event.startDate||date>event.endDate||date<koreaToday())return setError('행사 기간 안의 방문 날짜를 선택해 주세요.');
      next=createTrip({title:`${event.title.slice(0,80)} 여행`,destination:event.region||'서울',startDate:date,endDate:date,outbound:'local',transport:'walk',companion:'혼자'});
      const eventBlock={...next.document.days[0].blocks[1],title:'축제·행사 방문',startTime:visitStart,endTime:visitEnd,places:[place]};
      selectedDay=next.document.days[0].id;selectedBlock=eventBlock.id;
      next.document.days[0].blocks=[eventBlock];
    }else{
      if(!trip||!day||!block)return setError('행사 기간에 해당하는 여행 날짜와 구간을 선택해 주세요.');
      if(day.blocks.some(b=>b.places.some(p=>p.event?.id===event.id)))return setError('이 날짜에 이미 담은 행사예요.');
      if(minutes(visitStart)<minutes(block.startTime)+usedMinutes(block)+(block.places.length?15:0)||visitEnd>block.endTime)return setError('선택한 구간의 기존 일정 뒤에 들어갈 방문 시간을 골라 주세요. 시간이 부족하면 구간을 먼저 조정해 주세요.');
      if(block.places.length>=15)return setError('한 구간에는 최대 15곳을 담을 수 있어요.');
      place.travelMinutes=minutes(visitStart)-minutes(block.startTime)-usedMinutes(block);
      // Protect a draft changed in another tab after the picker opened.
      const latest=readDrafts(user?.userId).find(t=>t.id===trip.id);
      if(latest&&JSON.stringify(latest)!==JSON.stringify(trip))return setError('다른 화면에서 여행이 바뀌었어요. 닫고 다시 담아주세요.');
      next={...trip,updatedAt:new Date().toISOString(),document:{...trip.document,days:trip.document.days.map(d=>d.id===day.id?{...d,blocks:d.blocks.map(b=>b.id===block.id?{...b,places:[...b.places,place]}:b)}:d)}};
      selectedDay=day.id;selectedBlock=block.id;
    }
    try{writeDraft(next,user?.userId);navigate(tripRoute(next.id),{state:{initialTrip:next,focusDayId:selectedDay,focusBlockId:selectedBlock}});}catch{setError('브라우저에 초안을 저장하지 못했어요. 저장 공간을 확인해 주세요.');}
  };
  return <TripDialog title={uiText("내 여행에 담기")} onClose={onClose}><form className="trip-form" onSubmit={e=>{e.preventDefault();add();}}>
    <div className="event-add-summary"><strong>{uiText(event.title)}</strong><p>{event.startDate} — {event.endDate}</p><small>{uiText("관람 시간: ")}{uiText(event.hours||'공식 안내 확인 필요')}</small></div>
    <label>{uiText("담을 여행")}<select value={tripId} onChange={e=>{setTripId(e.target.value);setDayId('');setBlockId('');setError('');}}><option value="new">{uiText("새 당일 여행 만들기")}</option>{trips.map(t=><option key={t.id} value={t.id}>{uiText(t.document.title)} · {t.document.startDate}{uiText(t.version===0?' (초안)':'')}</option>)}</select></label>
    {loading&&<p role="status">{uiText("계정의 여행을 불러오고 있어요…")}</p>}
    {loadError&&<div className="trip-alert" role="alert">{uiText("계정의 여행을 불러오지 못했어요. ")}<button type="button" onClick={()=>{setLoading(true);setRevision(v=>v+1);}}>{uiText("다시 불러오기")}</button></div>}
    {tripId==='new'?<label>{uiText("방문 날짜")}<input type="date" required min={event.startDate>koreaToday()?event.startDate:koreaToday()} max={event.endDate} value={date} onChange={e=>setDate(e.target.value)}/></label>:days.length?<><label>{uiText("여행 날짜")}<select value={day?.id||''} onChange={e=>{setDayId(e.target.value);setBlockId('');}}>{days.map(d=><option key={d.id} value={d.id}>{d.date}</option>)}</select></label><label>{uiText("일정 구간")}<select value={block?.id||''} onChange={e=>setBlockId(e.target.value)}>{day?.blocks.map(b=><option key={b.id} value={b.id}>{b.startTime}–{b.endTime} · {uiText(b.title)}</option>)}</select></label></>:<p className="trip-alert">{uiText("이 여행은 행사 기간과 겹치지 않아요. 다른 여행을 선택해 주세요.")}</p>}
    <label>{uiText("방문 시작 시간")}<input type="time" required value={visitStart} onChange={e=>setVisitStart(e.target.value)}/><small>{uiText("공식 행사 시간을 확인하고 방문할 시간을 직접 선택해 주세요.")}</small></label>
    <label>{uiText("예상 관람 시간 (분)")}<input required type="number" min={10} max={600} step={5} value={duration} onChange={e=>setDuration(Number(e.target.value))}/><small>{uiText("기본 60분은 직접 조정하는 계획값이에요.")}</small></label>
    {block&&usedMinutes(block)+duration+(block.places.length?15:0)>minutes(block.endTime)-minutes(block.startTime)&&<p className="trip-alert">{uiText("선택한 구간보다 길어요. 담은 뒤 구간 시간을 조정해 주세요.")}</p>}
    <p className="event-help">{uiText("초안에 담고 편집기로 이동해요. 관람 시간·휴관·예약 여부를 확인하고, 계정 보관은 편집기에서 ‘여행 저장’을 눌러주세요.")}</p>
    {error&&<p className="trip-alert" role="alert">{uiText(error)}</p>}<button className="trip-button primary" type="submit" disabled={tripId!=='new'&&!block}>{uiText("담고 일정 확인하기")}</button>
  </form></TripDialog>;
}
