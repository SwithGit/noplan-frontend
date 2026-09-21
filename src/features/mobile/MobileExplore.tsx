import { t as uiText } from '../../i18n/translate';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { fetchExploreCourses } from '../../api/exploreApi';
import type { ExploreCourse } from '../../types/noplan';
import { courseSearchText } from '../../utils/coursePlan';
import { usePlanner } from '../planner/PlannerContext';
import { categories, courseFavorite, type FavoriteInput } from './mobileModel';
import { MobileTravelSuggestions } from './MobileTravelSuggestions';
import { MobileContentDetail, MobileCourseCard } from './MobileCards';
import { EmptyState, MobileHeading, MobileIcon } from './MobileUi';

export function MobileExplore({active}:{active:boolean}) {
  const [searchParams,setSearchParams]=useSearchParams();
  const navigate=useNavigate(),routeLocation=useLocation();
  const requestedList=searchParams.get('list');
  const list=requestedList==='nearby'||requestedList==='shared'?requestedList:null;
  const overviewScroll=useRef({window:0,content:0});
  const openList=(next:'nearby'|'shared')=>{
    overviewScroll.current={window:window.scrollY,content:document.getElementById('app-content')?.scrollTop||0};
    const params=new URLSearchParams(searchParams);params.set('list',next);
    setSearchParams(params,{state:{fromExploreOverview:true}});
  };
  const backToOverview=()=>{
    if(routeLocation.state?.fromExploreOverview){navigate(-1);return;}
    const params=new URLSearchParams(searchParams);params.delete('list');setSearchParams(params,{replace:true});
  };
  useEffect(()=>{
    if(!active)return;
    window.scrollTo({top:list?0:overviewScroll.current.window,behavior:'instant'});
    document.getElementById('app-content')?.scrollTo({top:list?0:overviewScroll.current.content,behavior:'instant'});
  },[active,list]);
  const {condition,currentPosition,detectCurrentLocation,ensureCurrentLocation}=usePlanner();
  const sharedDong=condition.locationLabel||condition.location;
  const [areaOverride,setAreaOverride]=useState<{source:string;dong:string}|null>(null);
  const source=condition.location;
  const dong=areaOverride?.source===source?areaOverride.dong:sharedDong;
  useEffect(()=>{if(active)ensureCurrentLocation();},[active,ensureCurrentLocation]);
  const [editor,setEditor]=useState(false),[manual,setManual]=useState(''),[locating,setLocating]=useState(false),[locationError,setLocationError]=useState('');
  const [sort,setSort]=useState<'likes'|'latest'>('likes'),[query,setQuery]=useState(''),[theme,setTheme]=useState('전체'),[courses,setCourses]=useState<ExploreCourse[]>([]),[error,setError]=useState(''),[revision,setRevision]=useState(0),[detail,setDetail]=useState<FavoriteInput|null>(null);
  const [shared,setShared]=useState<ExploreCourse[]>([]),[sharedError,setSharedError]=useState('');
  const position=areaOverride?.source===source?null:currentPosition?.address===condition.location?currentPosition:null;
  const nearbyAvailable=Boolean(position||dong);
  const requestKey=`${sort}:${dong}:${position?.lat}:${position?.lng}:${revision}`;
  const [completedKey,setCompletedKey]=useState('');
  const loading=completedKey!==requestKey;
  useEffect(()=>{
    if(!active)return;
    let cancelled=false;
    Promise.allSettled([nearbyAvailable?fetchExploreCourses(sort,dong,position):Promise.resolve([]),fetchExploreCourses(sort)]).then(([nearby,all])=>{
      if(cancelled)return;
      setCourses(nearby.status==='fulfilled'?nearby.value:[]);
      setError(nearby.status==='rejected'?'동네 코스를 불러오지 못했어요.':'');
      setShared(all.status==='fulfilled'?all.value:[]);
      setSharedError(all.status==='rejected'?'공유 코스를 불러오지 못했어요.':'');
      setCompletedKey(requestKey);
    });
    return()=>{cancelled=true;};
  },[active,sort,dong,position,nearbyAvailable,revision,requestKey]);
  const updateDong=(next:string)=>{setAreaOverride({source,dong:next});setEditor(false);setLocationError('');};
  const visible=useMemo(()=>courses.filter(course=>{const item=courseFavorite(course);return courseSearchText(course).includes(query.trim().toLowerCase())&&(theme==='전체'||item.places.some(place=>place.type===categories.find(category=>category.label===theme)?.type));}),[courses,query,theme]);
  const sharedVisible=useMemo(()=>shared.filter(course=>courseSearchText(course).includes(query.trim().toLowerCase())&&(theme==='전체'||courseFavorite(course).places.some(place=>place.type===categories.find(category=>category.label===theme)?.type))),[shared,query,theme]);
  const nearbyCards=list==='nearby'?visible:visible.slice(0,5);
  const sharedCards=list==='shared'?sharedVisible:sharedVisible.slice(0,5);
  return <div className="mobile-page m-explore">{list&&<button className="m-explore-back" type="button" onClick={backToOverview}><MobileIcon name="arrow"/>{uiText("탐색으로 돌아가기")}</button>}{list?<MobileHeading eyebrow={uiText("코스 모아보기")} title={uiText(list==='nearby'?'내 주변 추천 코스':'사람들이 공유한 코스')} description={uiText(list==='nearby'?'시작점 3km 이내의 코스를 가까운 순으로 둘러보세요.':'사람들이 공개한 여행 코스를 둘러보세요.')}/>:<MobileHeading eyebrow={uiText("둘러보기")} title={uiText(<>{uiText("내 주변")}<br/><em>{uiText("인기 코스")}</em></>)} description={uiText("동네마다 다른 여행을 만나보세요.")}/> }
    {list!=='shared'&&<div className="m-region-bar"><MobileIcon name="pin"/><div><small>{uiText("살펴보는 지역")}</small><strong>{uiText(dong?`${dong} 주변`:'전체 공개 코스')}</strong></div><button type="button" onClick={()=>{setManual(dong);setEditor(value=>!value);}} aria-expanded={editor}>{uiText("동네 변경")}</button></div>}
    {editor&&list!=='shared'&&<form className="m-location-editor" onSubmit={event=>{event.preventDefault();const next=manual.trim();if(next.length<2){setLocationError('지역이나 역 이름을 두 글자 이상 입력해 주세요.');return;}updateDong(next);}}><label>{uiText("탐색할 동네")}<input autoFocus value={manual} onChange={event=>setManual(event.target.value)} maxLength={80} placeholder={uiText("예: 성수, 성동구, 건대입구역")}/></label><div><button type="button" onClick={()=>updateDong('')}>{uiText("전체 보기")}</button><button type="button" disabled={locating} onClick={()=>{setLocating(true);void detectCurrentLocation().then(()=>{setAreaOverride(null);setEditor(false);setLocationError('');}).catch(cause=>setLocationError(cause instanceof Error?cause.message:'현재 위치를 확인하지 못했어요.')).finally(()=>setLocating(false));}}>{uiText(locating?'확인 중…':'현 위치')}</button><button className="m-primary" type="submit">{uiText("적용")}</button></div>{locationError&&<p className="m-notice" role="alert">{uiText(locationError)}</p>}</form>}
    <label className="m-search"><MobileIcon name="search"/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder={uiText("코스나 장소 이름을 검색해요")} aria-label={uiText("코스 검색")}/>{query&&<button type="button" aria-label={uiText("검색어 지우기")} onClick={()=>setQuery('')}><MobileIcon name="close"/></button>}</label>
    <div className="m-filter-scroll" aria-label={uiText("코스 테마")}>{['전체',...categories.map(item=>item.label)].map(value=><button className={theme===value?'selected':''} aria-pressed={theme===value} key={value} type="button" onClick={()=>setTheme(value)}>{uiText(value)}</button>)}</div>
    <div className="m-list-top"><span>{uiText(list==='shared'?'전체 지역':dong||'모든 동네')} · {list==='shared'?sharedVisible.length:nearbyAvailable?visible.length:sharedVisible.length}{uiText("개의 코스")}</span>{list==='nearby'?<span>{uiText("가까운 순")}</span>:<label><span className="m-sr-only">{uiText("공유 코스 정렬")}</span><select aria-label={uiText("공유 코스 정렬")} value={sort} onChange={event=>{setSort(event.target.value as 'likes'|'latest');}}><option value="likes">{uiText("좋아요 많은 순")}</option><option value="latest">{uiText("최신 공개순")}</option></select></label>}</div>
    {list!=='shared'&&<section className="m-discovery-section"><div className="m-section-title"><h2><MobileIcon name="pin"/>{uiText("내 주변 추천 코스")}</h2><span>{uiText("시작점 3km 이내 · 가까운 순")}</span></div>
    {!nearbyAvailable?<div className="m-discovery-empty"><p>{uiText("동네를 선택하면 주변의 공개 코스를 볼 수 있어요.")}</p><button type="button" onClick={()=>setEditor(true)}>{uiText("동네 선택하기")}</button></div>:loading?<div className="m-skeleton" role="status">{uiText("여행 코스를 불러오고 있어요…")}</div>:error?<EmptyState title={uiText("코스를 불러오지 못했어요")} action={<button type="button" className="m-primary" onClick={()=>{setRevision(value=>value+1);}}>{uiText("다시 불러오기")}</button>}>{uiText(error)}</EmptyState>:visible.length?<div className="m-card-list">{nearbyCards.map(course=><MobileCourseCard key={course.id} item={courseFavorite(course)} byline={course.distanceMeters!=null?`시작점까지 직선 ${(course.distanceMeters/1000).toFixed(1)}km`:undefined} onOpen={()=>setDetail(courseFavorite(course))}/>)}</div>:<EmptyState title={uiText(query||theme!=='전체'?'조건에 맞는 코스가 없어요':'아직 공개된 코스가 없어요')} action={<button type="button" onClick={()=>{setQuery('');setTheme('전체');setManual(dong);setEditor(true);}}>{uiText("조건·동네 바꾸기")}</button>}>{uiText("다른 테마나 가까운 동네를 살펴보세요.")}</EmptyState>}
    {!list&&!loading&&!error&&visible.length>0&&<button className="m-discovery-more" type="button" onClick={()=>openList('nearby')}>{uiText("내 주변 코스 더보기")}<MobileIcon name="arrow"/></button>}
    </section>}
    {list!=='nearby'&&<section className="m-discovery-section"><div className="m-section-title"><h2><MobileIcon name="heart"/>{uiText('사람들이 공유한 코스')}</h2><span>{uiText(sort==='likes'?'좋아요 많은 순':'최신 공개순')}</span></div>
      {loading?<div className="m-skeleton" role="status">{uiText('공유 코스를 불러오고 있어요…')}</div>:sharedError?<div className="m-discovery-empty" role="alert"><p>{uiText(sharedError)}</p><button type="button" onClick={()=>setRevision(value=>value+1)}>{uiText('다시 불러오기')}</button></div>:sharedVisible.length?<div className="m-card-list">{sharedCards.map(course=><MobileCourseCard key={course.id} byline={[course.user_nick,course.likes!=null?`${uiText('좋아요')} ${course.likes.toLocaleString()}`:''].filter(Boolean).join(' · ')} item={courseFavorite(course)} onOpen={()=>setDetail(courseFavorite(course))}/>)}</div>:<div className="m-discovery-empty"><p>{uiText(query||theme!=='전체'?'조건에 맞는 공유 코스가 없어요.':'아직 공유된 코스가 없어요. 아래의 여행 코스를 둘러보세요.')}</p></div>}
    {!list&&!loading&&!sharedError&&sharedVisible.length>0&&<button className="m-discovery-more" type="button" onClick={()=>openList('shared')}>{uiText("공유 코스 더보기")}<MobileIcon name="arrow"/></button>}
    </section>}
    {!list&&!query&&theme==='전체'&&<MobileTravelSuggestions/>}
    <p className="m-area-note">{uiText("주변 코스는 시작점까지의 직선거리 기준이에요. 실제 도보 거리는 다를 수 있어요. 공유 코스는 좋아요 수 또는 공개일 순이에요.")}</p>
    {active&&detail&&<MobileContentDetail item={detail} onClose={()=>setDetail(null)}/>}
  </div>;
}
