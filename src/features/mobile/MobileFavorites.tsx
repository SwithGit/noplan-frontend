import { t as uiText } from '../../i18n/translate';
import { useDesktop } from './useDesktop';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES, eventRoute } from '../../routes';
import { useFavorites } from './favoritesContext';
import type { Favorite } from './mobileModel';
import { EmptyState, MobileHeading, MobileIcon } from './MobileUi';
import { MobileContentDetail, MobileCourseCard } from './MobileCards';

import { MobileTravelSuggestions } from './MobileTravelSuggestions';
import { favoriteEventId } from '../events/eventFavorite';

export function MobileFavorites() {
  const desktop=useDesktop();const navigate=useNavigate();
  const {user,items,loading,error,reload}=useFavorites();
  const [tab,setTab]=useState<'course'|'place'>('course'),[query,setQuery]=useState(''),[detail,setDetail]=useState<Favorite|null>(null);
  const visible=items.filter(item=>item.kind===tab&&`${item.title} ${item.location} ${item.places.map(place=>`${place.name} ${place.address}`).join(' ')}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <div className="mobile-page m-favorites"><MobileHeading eyebrow={uiText("나의 여행 컬렉션")} title={uiText(<>{uiText("마음에 담은")}<br/><em>{uiText("여행")}</em></>)} description={uiText("찜한 장소와 코스를 모아봤어요.")}/>
    <div className="m-tabs" role="group" aria-label={uiText("찜 종류")}><button type="button" aria-pressed={tab==='course'} onClick={()=>setTab('course')}><MobileIcon name="route"/>{uiText("코스 ")}<small>{items.filter(item=>item.kind==='course').length}</small></button><button type="button" aria-pressed={tab==='place'} onClick={()=>setTab('place')}><MobileIcon name="pin"/>{uiText("장소 ")}<small>{items.filter(item=>item.kind==='place').length}</small></button></div>
    {!user?<><EmptyState title={uiText("좋아하는 곳을 오래 기억해요")} action={<Link className="m-primary" to={ROUTES.login}>{uiText("로그인하기")}</Link>}>{uiText("로그인하면 찜한 코스와 장소를 다른 기기에서도 이어볼 수 있어요.")}</EmptyState><MobileTravelSuggestions guest/></>:<><label className="m-search"><MobileIcon name="search"/><input aria-label={uiText("찜 검색")} value={query} onChange={event=>setQuery(event.target.value)} placeholder={uiText("이름이나 동네로 찾기")}/></label><div className="m-list-top"><span>{visible.length}{uiText("개의 ")}{uiText(tab==='course'?'코스':'장소')}</span><span>{uiText("최근 찜한 순")}</span></div>{loading?<div className="m-skeleton" role="status">{uiText("찜한 순간을 불러오고 있어요…")}</div>:error?<EmptyState title={uiText("찜 목록을 불러오지 못했어요")} action={<button type="button" className="m-primary" onClick={reload}>{uiText("다시 불러오기")}</button>}>{uiText(error)}</EmptyState>:visible.length?<div className="m-card-list">{visible.map(item=><MobileCourseCard key={item.id} item={item} unavailable={item.unavailable} onOpen={()=>{const eventId=favoriteEventId(item);if(eventId)navigate(eventRoute(eventId));else setDetail(item);}}/>)}</div>:<EmptyState title={uiText(query?'검색 결과가 없어요':`아직 찜한 ${tab==='course'?'코스가':'장소가'} 없어요`)} action={query?<button type="button" onClick={()=>setQuery('')}>{uiText("검색어 지우기")}</button>:<Link className="m-primary" to={ROUTES.explore}>{uiText("코스 둘러보기")}</Link>}>{uiText(query?'다른 이름이나 동네로 검색해 보세요.':'홈·탐색·장소 상세에서 하트를 눌러 담아보세요.')}</EmptyState>}{!loading&&!error&&!query.trim()&&!items.some(item=>item.kind===tab)&&<MobileTravelSuggestions guest/>}{!desktop&&<Link className="m-legacy-link" to={ROUTES.myCourses}>{uiText("이전에 저장한 코스 보기 ")}<MobileIcon name="arrow"/></Link>}</>}
    {detail&&<MobileContentDetail item={detail} unavailable={detail.unavailable} onClose={()=>setDetail(null)}/>}
  </div>;
}
