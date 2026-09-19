import { useDesktop } from './useDesktop';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../routes';
import { useFavorites } from './favoritesContext';
import type { Favorite } from './mobileModel';
import { EmptyState, MobileHeading, MobileIcon } from './MobileUi';
import { MobileContentDetail, MobileCourseCard } from './MobileCards';

export function MobileFavorites() {
  const desktop=useDesktop();
  const {user,items,loading,error,reload}=useFavorites();
  const [tab,setTab]=useState<'course'|'place'>('course'),[query,setQuery]=useState(''),[detail,setDetail]=useState<Favorite|null>(null);
  const visible=items.filter(item=>item.kind===tab&&`${item.title} ${item.location} ${item.places.map(place=>`${place.name} ${place.address}`).join(' ')}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <div className="mobile-page m-favorites"><MobileHeading eyebrow="나의 여행 컬렉션" title={<>마음에 담은<br/><em>여행</em></>} description="찜한 장소와 코스를 모아봤어요."/>
    <div className="m-tabs" role="group" aria-label="찜 종류"><button type="button" aria-pressed={tab==='course'} onClick={()=>setTab('course')}><MobileIcon name="route"/>코스 <small>{items.filter(item=>item.kind==='course').length}</small></button><button type="button" aria-pressed={tab==='place'} onClick={()=>setTab('place')}><MobileIcon name="pin"/>장소 <small>{items.filter(item=>item.kind==='place').length}</small></button></div>
    {!user?<EmptyState title="좋아하는 곳을 오래 기억해요" action={<Link className="m-primary" to={ROUTES.login}>로그인하기</Link>}>로그인하면 찜한 코스와 장소를 다른 기기에서도 이어볼 수 있어요.</EmptyState>:<><label className="m-search"><MobileIcon name="search"/><input aria-label="찜 검색" value={query} onChange={event=>setQuery(event.target.value)} placeholder="이름이나 동네로 찾기"/></label><div className="m-list-top"><span>{visible.length}개의 {tab==='course'?'코스':'장소'}</span><span>최근 찜한 순</span></div>{loading?<div className="m-skeleton" role="status">찜한 순간을 불러오고 있어요…</div>:error?<EmptyState title="찜 목록을 불러오지 못했어요" action={<button type="button" className="m-primary" onClick={reload}>다시 불러오기</button>}>{error}</EmptyState>:visible.length?<div className="m-card-list">{visible.map(item=><MobileCourseCard key={item.id} item={item} unavailable={item.unavailable} onOpen={()=>setDetail(item)}/>)}</div>:<EmptyState title={query?'검색 결과가 없어요':`아직 찜한 ${tab==='course'?'코스가':'장소가'} 없어요`} action={query?<button type="button" onClick={()=>setQuery('')}>검색어 지우기</button>:<Link className="m-primary" to={ROUTES.explore}>코스 둘러보기</Link>}>{query?'다른 이름이나 동네로 검색해 보세요.':'홈·탐색·장소 상세에서 하트를 눌러 담아보세요.'}</EmptyState>}{!desktop&&<Link className="m-legacy-link" to={ROUTES.myCourses}>이전에 저장한 코스 보기 <MobileIcon name="arrow"/></Link>}</>}
    {detail&&<MobileContentDetail item={detail} unavailable={detail.unavailable} onClose={()=>setDetail(null)}/>}
  </div>;
}
