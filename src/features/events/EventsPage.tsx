import {useEffect,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {fetchEvents} from '../../api/eventsApi';
import {eventRoute} from '../../routes';
import {TripIcon} from '../trips/TripIcon';
import {EventImage} from './EventImage';
import {eventDate,eventKinds,eventStatus,koreaToday,type EventResult} from './eventModel';
import './events.css';

const regions=['서울','경기','인천','강원','부산','대구','대전','광주','울산','세종','충북','충남','전북','전남','경북','경남','제주'];
export function EventsPage(){
  const [params,setParams]=useSearchParams();const query=params.toString();
  const [revision,setRevision]=useState(0),[response,setResponse]=useState<{key:string;result:EventResult|null;error:string}>({key:'',result:null,error:''});
  const requestKey=`${query}:${revision}`,loading=response.key!==requestKey,result=loading?null:response.result,error=loading?'':response.error;
  const [searchState,setSearchState]=useState({query,value:params.get('q')||''});
  const search=searchState.query===query?searchState.value:params.get('q')||'';
  const setSearch=(value:string)=>setSearchState({query,value});
  useEffect(()=>{let cancelled=false;fetchEvents(new URLSearchParams(query)).then(data=>{if(!cancelled)setResponse({key:requestKey,result:data,error:''});}).catch(cause=>{if(!cancelled)setResponse({key:requestKey,result:null,error:cause instanceof Error?cause.message:'행사를 불러오지 못했어요.'});});return()=>{cancelled=true;};},[query,requestKey]);
  const update=(patch:Record<string,string>)=>{const next=new URLSearchParams(params);next.delete('page');Object.entries(patch).forEach(([key,value])=>value?next.set(key,value):next.delete(key));setParams(next);};
  const weekend=()=>{const now=new Date(`${koreaToday()}T00:00:00Z`),offset=(6-now.getUTCDay()+7)%7;now.setUTCDate(now.getUTCDate()+offset);const from=now.toISOString().slice(0,10);now.setUTCDate(now.getUTCDate()+1);update({from,to:now.toISOString().slice(0,10)});};
  const from=params.get('from')||'',to=params.get('to')||'';
  return <div className="events-page">
    <header className="events-hero"><div><span className="event-eyebrow">A REASON TO GO</span><h1>그날, 그곳에서만<br/><em>만날 수 있는 여행.</em></h1><p>전시 한 편, 축제 하루. 마음에 드는 경험을 여행에 담아보세요.</p></div><div className="events-hero-art" aria-hidden="true"><span>FESTIVAL</span><TripIcon name="calendar"/><b>새로운 발견<br/>좋은 하루</b><small>EXHIBITION & CULTURE</small></div></header>
    <section className="event-search-panel" aria-label="축제·전시 검색">
      <div className="event-search-heading"><h2>축제·전시 찾아보기</h2><span>전국 축제 · 서울 문화행사</span></div>
      <form className="event-search-row" onSubmit={e=>{e.preventDefault();update({q:search});}}>
        <label>지역<select aria-label="행사 지역" value={params.get('region')||''} onChange={e=>update({region:e.target.value})}><option value="">전국</option>{regions.map(region=><option key={region}>{region}</option>)}</select></label>
        <label>방문 시작일<input aria-label="행사 시작일" type="date" min={koreaToday()} value={from} onChange={e=>update({from:e.target.value,...(to&&e.target.value>to?{to:e.target.value}:{})})}/></label>
        <label>방문 종료일<input aria-label="행사 종료일" type="date" min={from||koreaToday()} value={to} onChange={e=>update({to:e.target.value,...(from&&e.target.value&&e.target.value<from?{from:e.target.value}:{})})}/></label>
        <label className="event-search-input">행사·장소 이름<input maxLength={100} placeholder="어떤 경험을 찾고 있나요?" value={search} onChange={e=>setSearch(e.target.value)}/></label><button className="trip-button primary" type="submit">검색 <TripIcon name="arrow"/></button>
      </form>
      <div className="event-quick-dates"><span>날짜 빠르게 선택</span><button type="button" onClick={()=>update({from:koreaToday(),to:koreaToday()})}>오늘</button><button type="button" onClick={weekend}>이번 토·일</button><label className="event-free-filter"><input type="checkbox" checked={params.get('free')==='true'} onChange={e=>update({free:e.target.checked?'true':''})}/>무료로 확인된 행사</label><button type="button" onClick={()=>{setSearch('');setParams({});}}>전체 조건 초기화</button></div>
    </section>
    <div className="event-toolbar"><div className="event-kind-tabs" aria-label="행사 유형">{Object.entries({all:'전체',...eventKinds}).map(([key,label])=><button type="button" key={key} aria-pressed={(params.get('kind')||'all')===key} onClick={()=>update({kind:key==='all'?'':key})}>{label}</button>)}</div><label className="event-sort">정렬<select value={params.get('sort')||'upcoming'} aria-label="행사 정렬" onChange={e=>update({sort:e.target.value})}><option value="upcoming">가까운 일정순</option><option value="ending">곧 종료순</option></select></label></div>
    <div className="event-result-heading"><p>{loading?'행사를 찾고 있어요…':<>지금부터 만날 수 있는 <strong>{result?.total||0}개의 경험</strong></>}</p><span>기간 중 표시와 실제 입장 가능 여부는 달라요.</span></div>
    {result?.sources.some(s=>s.stale||!s.available)&&<p className="event-notice" role="status">일부 제공기관의 최신 정보를 불러오지 못했어요. 현재 확보한 행사 정보를 보여드려요.</p>}
    {loading?<div className="event-grid" role="status" aria-label="행사 불러오는 중">{Array.from({length:6},(_,i)=><div className="event-skeleton" key={i}><div/><span/><span/></div>)}</div>:error?<div className="event-empty" role="alert"><TripIcon name="calendar"/><h2>잠시, 행사를 불러오지 못했어요</h2><p>{error}</p><button className="trip-button primary" onClick={()=>setRevision(v=>v+1)} type="button">다시 불러오기</button></div>:result?.events.length?<><div className="event-grid">{result.events.map(event=><Link className="event-card" to={eventRoute(event.id)} key={event.id}><div className="event-card-poster"><EventImage event={event}/><span className={`event-status ${eventStatus(event)==='기간 중'?'ongoing':''}`}>{eventStatus(event)}</span></div><div className="event-card-copy"><div className="event-card-meta"><span>{eventKinds[event.kind]}</span><span>{event.district||event.region||'지역 확인'}</span>{event.isFree===true&&<span>무료</span>}</div><h3>{event.title}</h3><p className="event-dates"><TripIcon name="calendar"/>{eventDate(event.startDate)} — {eventDate(event.endDate)}</p><p className="event-venue"><TripIcon name="pin"/>{event.venue||event.address||'장소 안내 확인'}</p><div className="event-card-footer"><small>{event.sourceLabel}</small><span>자세히 보기 <TripIcon name="arrow"/></span></div></div></Link>)}</div><nav className="event-pagination" aria-label="행사 페이지"><button className="trip-button" type="button" disabled={result.page===1} onClick={()=>update({page:String(result.page-1)})}>이전</button><span>{result.page} / {Math.ceil(result.total/result.pageSize)}</span><button className="trip-button" type="button" disabled={result.page*result.pageSize>=result.total} onClick={()=>update({page:String(result.page+1)})}>다음</button></nav></>:<div className="event-empty"><TripIcon name="calendar"/><h2>조건에 맞는 행사가 아직 없어요</h2><p>다른 날짜나 지역으로 찾아보세요.</p><button className="trip-button" type="button" onClick={()=>{setSearch('');setParams({});}}>전체 행사 보기</button></div>}
    {result&&<footer className="event-source-note">한국관광공사 TourAPI · 서울문화포털 제공. 제공기관에 등록된 행사 기준이며 전체 민간 전시·팝업을 포함하지는 않아요.<br/>{result.sources.filter(s=>s.fetchedAt).map(s=>`${s.provider==='tourapi'?'관광공사':'서울시'} 확인: ${new Date(s.fetchedAt!).toLocaleString('ko-KR')}`).join(' · ')}</footer>}
  </div>;
}
