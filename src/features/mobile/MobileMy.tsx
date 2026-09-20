import { t as uiText } from '../../i18n/translate';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import nopiWelcome from '../../assets/nopi/nopi-welcome.png';
import { apiJson } from '../../api/client';
import { listTrips } from '../../api/tripsApi';
import type { ExploreCourse, UserSession } from '../../types/noplan';
import { ROUTES, tripRoute } from '../../routes';
import { readDrafts, shortDate, tripLength, type TripRecord } from '../trips/tripModel';
import { TripDialog } from '../trips/TripDialog';
import { courseFavorite, type FavoriteInput } from './mobileModel';
import { useFavorites } from './favoritesContext';
import { EmptyState, MobileIcon } from './MobileUi';
import { MobileContentDetail, MobileCourseCard } from './MobileCards';

export function MobileMy({user,onLogout,active}:{user:UserSession|null;onLogout:()=>void;active:boolean}) {
  const [trips,setTrips]=useState<TripRecord[]>(()=>readDrafts(user?.userId)),[recent,setRecent]=useState<ExploreCourse[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(Boolean(user)),[revision,setRevision]=useState(0),[settings,setSettings]=useState(false),[detail,setDetail]=useState<FavoriteInput|null>(null),[filter,setFilter]=useState('예정');
  const {items}=useFavorites();
  useEffect(()=>{
    if(!active||!user?.userId)return;let cancelled=false;
    Promise.allSettled([listTrips(),apiJson<{courses:ExploreCourse[]}>('/api/mypage/recent-courses')]).then(([travel,history])=>{
      if(cancelled)return;
      if(travel.status==='fulfilled'){const drafts=readDrafts(user.userId);setTrips([...drafts,...travel.value.filter(trip=>!drafts.some(draft=>draft.id===trip.id))]);}
      if(history.status==='fulfilled')setRecent(history.value.courses||[]);
      setError(travel.status==='rejected'||history.status==='rejected'?'일부 여행 기록을 불러오지 못했어요. 초안은 계속 열 수 있어요.':'');setLoading(false);
    });return()=>{cancelled=true;};
  },[active,user?.userId,revision]);
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const visible=trips.filter(({document:trip})=>filter==='지난 여행'?trip.endDate<today:filter==='여행 중'?trip.startDate<=today&&trip.endDate>=today:trip.startDate>today);
  const nickname=user&&!/^(google|kakao|naver)[_-]/i.test(user.userNick)&&user.userNick!==user.userId?user.userNick:'여행자';
  return <div className="mobile-page m-my"><div className="m-my-title"><div><h1>{uiText("마이")}</h1><p>{uiText("나의 여행과 좋은 순간을 모아봐요.")}</p></div><button type="button" aria-label={uiText("계정 설정")} onClick={()=>setSettings(true)}><MobileIcon name="settings"/></button></div>
    <div className="m-profile"><div className="m-avatar">{user?.profileURL?<img src={user.profileURL} alt=""/>:<span>{user?nickname.slice(0,1):'N'}</span>}</div><div className="m-profile-copy"><span>{uiText("나의 작은 여행 기록")}</span><h2>{uiText(user?`${nickname}님, 반가워요`:'여행의 다음 장을 열어봐요')}</h2><p>{uiText(user?'일상 속 좋은 발견을 모으고 있어요.':'로그인하고 여행과 찜을 이어보세요.')}</p>{!user&&<Link to={ROUTES.login}>{uiText("로그인하기 ")}<MobileIcon name="arrow"/></Link>}</div><img className="m-profile-nopi" src={nopiWelcome} alt=""/></div>
    <Link className="m-my-favorites" to={ROUTES.favorites}><MobileIcon name="heart"/><span>{uiText("나의 찜 목록")}</span><strong>{items.length}</strong><MobileIcon name="arrow"/></Link>
    <section className="m-my-trips"><div className="m-section-title"><div><span>MY TRAVEL NOTE</span><h2>{uiText("내 여행")}</h2></div><Link to={ROUTES.trips}>{uiText("모두 보기 ")}<MobileIcon name="arrow"/></Link></div><div className="m-filter-scroll" aria-label={uiText("여행 상태")}>{['예정','여행 중','지난 여행'].map(value=><button key={value} type="button" aria-pressed={filter===value} className={filter===value?'selected':''} onClick={()=>setFilter(value)}>{value}</button>)}</div>
    {loading?<p className="m-skeleton">{uiText("여행을 불러오고 있어요…")}</p>:visible.length?<div className="m-trip-list">{visible.slice(0,5).map(trip=><Link to={tripRoute(trip.id)} state={{initialTrip:trip}} key={trip.id}><span className="m-trip-art"><MobileIcon name="route"/></span><div><small>{trip.document.destination} · {tripLength(trip.document)}{uiText(trip.version===0?' · 초안':'')}</small><h3>{uiText(trip.document.title)}</h3><p>{shortDate(trip.document.startDate)}</p></div><MobileIcon name="arrow"/></Link>)}</div>:<EmptyState title={uiText(filter==='지난 여행'?'차곡차곡 쌓일 여행의 기억':filter==='여행 중'?'오늘은 새로운 발견을 해볼까요?':'다음 여행을 기다리고 있어요')} action={<Link className="m-primary" to={ROUTES.newTrip}>{uiText("새 여행 만들기")}</Link>}>{uiText("목적지와 날짜를 고르면 여행 노트가 시작돼요.")}</EmptyState>}
    {error&&<div className="m-notice" role="alert">{uiText(error)}<button type="button" onClick={()=>{setLoading(true);setRevision(value=>value+1);}}>{uiText("다시 불러오기")}</button></div>}</section>
    <section className="m-recent"><div className="m-section-title"><h2>{uiText("최근 추천받은 코스")}</h2><span>{recent.length}{uiText("개")}</span></div>{recent.length?<div className="m-card-list">{recent.slice(0,5).map(course=><MobileCourseCard key={course.id} item={courseFavorite(course)} onOpen={()=>setDetail(courseFavorite(course))}/>)}</div>:<p className="m-inline-empty">{uiText(user?'첫 코스를 추천받으면 여기에 남아요.':'로그인하면 추천받은 기록을 모아볼 수 있어요.')}</p>}</section>
    <div className="m-my-links"><Link to={ROUTES.myCourses}>{uiText("저장한 코스·공개 관리")}<MobileIcon name="arrow"/></Link><Link to={ROUTES.privacy}>{uiText("개인정보 처리방침")}<MobileIcon name="arrow"/></Link></div>
    {active&&settings&&<TripDialog title={uiText("계정 설정")} onClose={()=>setSettings(false)}><div className="m-settings"><p>{uiText(user?'이 기기에서 계정 연결을 관리해요.':'로그인해서 여행 기록을 이어보세요.')}</p>{user?<button className="m-primary" type="button" onClick={()=>{setSettings(false);onLogout();}}>{uiText("로그아웃")}</button>:<Link className="m-primary" to={ROUTES.login}>{uiText("로그인하기")}</Link>}<Link to={ROUTES.privacy}>{uiText("개인정보 처리방침")}</Link></div></TripDialog>}
    {active&&detail&&<MobileContentDetail item={detail} onClose={()=>setDetail(null)}/>}
  </div>;
}
