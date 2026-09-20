import { t as uiText } from '../../i18n/translate';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { CoursePlace, UserSession } from '../../types/noplan';
import { fetchNearby } from '../../api/libraryApi';
import { PlaceVisual } from '../../components/ui/PlaceVisual';
import { ROUTES } from '../../routes';
import nopi from '../../assets/nopi/nopi-home.png';
import travelMap from '../../assets/travel/coastal-escape.webp';
import { usePlanner } from '../planner/PlannerContext';
import { categoryKeyFromLabel } from '../planner/plannerIntents';
import { trackPlannerEvent } from '../../api/plannerApi';
import { categories, placeFavorite, type FavoriteInput } from './mobileModel';
import { EmptyState, MobileIcon } from './MobileUi';
import { MobileContentDetail, MobilePlaceCard } from './MobileCards';
import './mobile.css';

export function MobileHome({user,active}:{user:UserSession|null;active:boolean}) {
  const navigate=useNavigate();const {condition,setCondition,startFromText,detectCurrentLocation,currentPosition,activePlan,hasActivePlan}=usePlanner();
  const [text,setText]=useState(condition.rawText),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const [locationOpen,setLocationOpen]=useState(false),[areaInput,setAreaInput]=useState(''),[locating,setLocating]=useState(false);
  const [nearby,setNearby]=useState<CoursePlace[]>([]),[nearbyError,setNearbyError]=useState(''),[loading,setLoading]=useState(false),[reload,setReload]=useState(0),[detail,setDetail]=useState<FavoriteInput|null>(null);
  const area=condition.locationLabel||condition.location;
  useEffect(()=>{
    if(!active||!user?.userId||!area)return;
    let cancelled=false;setLoading(true);setNearbyError('');setNearby([]);
    const position=currentPosition?.address===condition.location?currentPosition:null;
    fetchNearby(area,position).then(places=>{if(!cancelled)setNearby(places);}).catch(cause=>{if(!cancelled)setNearbyError(cause instanceof Error?cause.message:'장소를 불러오지 못했어요.');}).finally(()=>{if(!cancelled)setLoading(false);});
    return()=>{cancelled=true;};
  },[active,user?.userId,area,condition.location,currentPosition,reload]);
  const locate=async()=>{setLocating(true);setMessage('');try{await detectCurrentLocation();setLocationOpen(false);}catch(cause){setMessage(cause instanceof Error?cause.message:'위치를 찾지 못했어요. 동네를 직접 입력해 주세요.');setLocationOpen(true);}finally{setLocating(false);}};
  const submit=async(event:FormEvent)=>{event.preventDefault();if(busy||!text.trim())return;setBusy(true);setMessage('');try{const hasLocation=await startFromText(text);navigate(hasLocation?ROUTES.plannerCondition:ROUTES.plannerChat);}catch{setMessage('조건을 읽지 못했어요. 다시 시도해 주세요.');}finally{setBusy(false);}};
  const quick=(mood='')=>{void trackPlannerEvent('planner_start',{entryMode:'quick'},undefined,{resetSession:true}).catch(()=>undefined);setCondition({rawText:'',time:'',duration:'',companion:'',mood,mainCategory:categoryKeyFromLabel(mood),supportingCategories:[],coreIntent:'',coreIntentExplicit:false,coreIntentSkipped:false,atmosphereTags:[]});navigate(ROUTES.plannerChat);};
  return <div className="mobile-page m-home">
    <header className="m-home-top"><button type="button" aria-expanded={locationOpen} onClick={()=>{setAreaInput(area);setLocationOpen(value=>!value);}}><MobileIcon name="pin"/><strong>{uiText(area||'어디에서 출발할까요?')}</strong><MobileIcon name="arrow"/></button><Link to={ROUTES.myPage} aria-label={uiText("마이로 이동")}><img src={nopi} alt=""/></Link></header>
    {locationOpen&&<form className="m-location-editor" onSubmit={event=>{event.preventDefault();if(areaInput.trim().length<2){setMessage('동네나 역 이름을 두 글자 이상 입력해 주세요.');return;}setCondition({location:areaInput.trim(),locationLabel:areaInput.trim()});setLocationOpen(false);setMessage('');}}><label>{uiText("출발할 동네·역")}<input autoFocus value={areaInput} onChange={event=>setAreaInput(event.target.value)} maxLength={80} placeholder={uiText("예: 서울 성수동")}/></label><div><button type="button" disabled={locating} onClick={()=>void locate()}>{uiText(locating?'위치 확인 중…':'현 위치 사용')}</button><button className="m-primary" type="submit">{uiText("지역 선택")}</button></div></form>}
    {message&&<p className="m-notice" role="status">{uiText(message)}</p>}
    {hasActivePlan&&activePlan&&<Link className="m-resume" to={ROUTES.courseMap}><span className="m-resume-icon"><MobileIcon name="route"/></span><div><small>{uiText("골라둔 코스가 있어요")}</small><strong>{uiText(activePlan.title)}</strong></div><MobileIcon name="arrow"/></Link>}
    <section className="m-home-intro"><div><span>{uiText("오늘")}</span><h1>{uiText("어디 ")}<em>{uiText("갈까?")}</em></h1><p>{uiText("상황만 알려줘.")}<br/>{uiText("코스는 내가 골라볼게.")}</p></div><img src={nopi} alt=""/></section>
    <form className="m-prompt" onSubmit={submit}><label htmlFor="mobile-home-prompt"><MobileIcon name="spark"/>{uiText("노피에게 말해줘")}</label><div><input id="mobile-home-prompt" value={text} maxLength={1000} onChange={event=>setText(event.target.value)} placeholder={uiText("예: 성수에서 친구랑 조용한 카페")}/><button type="submit" disabled={busy||!text.trim()} aria-label={uiText("채팅으로 추천받기")}>{busy?'…':'↑'}</button></div></form>
    <button type="button" className="m-quick" onClick={()=>quick()}><span className="m-quick-icon"><MobileIcon name="spark"/></span><span><strong>{uiText("빠른 추천 받기")}</strong><small>{uiText("입력 없이, 몇 번의 선택으로")}</small></span><MobileIcon name="arrow"/></button>
    <div className="m-promo m-promo-sea"><img src={travelMap} alt=""/><div><span>{uiText("noplan과 함께")}</span><strong>{uiText("계획 없어도")}<br/><em>{uiText("좋은 하루")}</em></strong><p>{uiText("새로운 발견은 생각보다 가까이")}</p></div></div>
    <section className="m-category-section" aria-label={uiText("취향대로 골라 떠나요")}><div className="m-categories">{categories.map(category=><button type="button" key={category.key} onClick={()=>navigate(`${ROUTES.nearbyPlaces}?category=${category.key}`)}><PlaceVisual type={category.type} color="transparent"/><span>{uiText(category.label)}</span></button>)}</div></section>
    <section className="m-nearby"><div className="m-section-title"><div><span>LOCAL DISCOVERIES</span><h2>{uiText(area?`${area}의 작은 발견`:'내 주변, 새로운 발견')}</h2></div><MobileIcon name="pin"/></div><p className="m-section-copy">{uiText("별점 높은 순 · 같은 별점이면 후기 많은 순")}</p>
      {!user?<div className="m-login-card"><img src={nopi} alt=""/><div><strong>{uiText("우리 동네의 좋은 곳, 만나볼까요?")}</strong><p>{uiText("로그인하고 주변 추천 장소를 확인해요.")}</p><Link to={ROUTES.login}>{uiText("로그인하기 ")}<MobileIcon name="arrow"/></Link></div></div>:!area?<div className="m-inline-empty"><p>{uiText("위치를 허용하거나 동네를 직접 골라주세요.")}</p><button type="button" onClick={()=>{setLocationOpen(true);window.scrollTo({top:0});}}>{uiText("동네 선택하기")}</button></div>:loading?<p role="status" className="m-inline-empty">{uiText("동네의 좋은 곳을 찾고 있어요…")}</p>:nearbyError?<div className="m-inline-empty" role="alert"><p>{nearbyError}</p><button type="button" onClick={()=>setReload(value=>value+1)}>{uiText("다시 불러오기")}</button></div>:nearby.length?<><div className="m-place-scroll">{nearby.map(place=><MobilePlaceCard key={place.id} place={place} onOpen={()=>setDetail(placeFavorite(place))}/>)}</div><p className="m-area-note">{uiText("등록된 장소 기준이며, 현재 영업 여부는 방문 전 확인해 주세요.")}</p></>:<EmptyState title={uiText("이 동네는 조금 더 준비 중이에요")}>{uiText("추천 가능한 등록 장소가 없어요. 다른 서울 동네를 선택해 보세요.")}</EmptyState>}
    </section>
    <Link className="m-explore-link" to={ROUTES.explore}><span><small>{uiText("다른 사람의 여행에서 힌트 얻기")}</small><strong>{uiText("동네 코스 둘러보기")}</strong></span><MobileIcon name="arrow"/></Link>
    {active&&detail&&<MobileContentDetail item={detail} onClose={()=>setDetail(null)}/>}
  </div>;
}
