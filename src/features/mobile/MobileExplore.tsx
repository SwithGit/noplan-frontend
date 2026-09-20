import { t as uiText } from '../../i18n/translate';
import { useEffect, useMemo, useState } from 'react';
import { fetchExploreCourses } from '../../api/exploreApi';
import type { ExploreCourse } from '../../types/noplan';
import { courseSearchText } from '../../utils/coursePlan';
import { extractDongFromText, normalizeDongInput } from '../../utils/location';
import { usePlanner } from '../planner/PlannerContext';
import { categories, courseFavorite, type FavoriteInput } from './mobileModel';
import { MobileContentDetail, MobileCourseCard } from './MobileCards';
import { EmptyState, MobileHeading, MobileIcon } from './MobileUi';

export function MobileExplore({active}:{active:boolean}) {
  const {condition,detectCurrentLocation}=usePlanner();
  const [dong,setDong]=useState(()=>extractDongFromText(condition.locationLabel,condition.location));
  const [editor,setEditor]=useState(false),[manual,setManual]=useState(''),[locating,setLocating]=useState(false),[locationError,setLocationError]=useState('');
  const [sort,setSort]=useState<'likes'|'latest'>('likes'),[query,setQuery]=useState(''),[theme,setTheme]=useState('전체'),[courses,setCourses]=useState<ExploreCourse[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0),[detail,setDetail]=useState<FavoriteInput|null>(null);
  useEffect(()=>{if(!active)return;let cancelled=false;fetchExploreCourses(sort,dong).then(result=>{if(!cancelled){setCourses(result);setError('');}}).catch(cause=>{if(!cancelled){setCourses([]);setError(cause instanceof Error?cause.message:'코스를 불러오지 못했어요.');}}).finally(()=>{if(!cancelled)setLoading(false);});return()=>{cancelled=true;};},[active,sort,dong,revision]);
  const updateDong=(next:string)=>{setLoading(true);setDong(next);setEditor(false);setLocationError('');};
  const visible=useMemo(()=>courses.filter(course=>{const item=courseFavorite(course);return courseSearchText(course).includes(query.trim().toLowerCase())&&(theme==='전체'||item.places.some(place=>place.type===categories.find(category=>category.label===theme)?.type));}),[courses,query,theme]);
  return <div className="mobile-page m-explore"><MobileHeading eyebrow={uiText("둘러보기")} title={uiText(<>{uiText("지역별")}<br/><em>{uiText("인기 코스")}</em></>)} description={uiText("동네마다 다른 여행을 만나보세요.")}/>
    <div className="m-region-bar"><MobileIcon name="pin"/><div><small>{uiText("살펴보는 지역")}</small><strong>{uiText(dong?`${dong} 주변`:'전체 공개 코스')}</strong></div><button type="button" onClick={()=>{setManual(dong);setEditor(value=>!value);}} aria-expanded={editor}>{uiText("동네 변경")}</button></div>
    {editor&&<form className="m-location-editor" onSubmit={event=>{event.preventDefault();const next=normalizeDongInput(manual);if(!next){setLocationError('성수동처럼 동 단위로 입력해 주세요.');return;}updateDong(next);}}><label>{uiText("탐색할 동네")}<input autoFocus value={manual} onChange={event=>setManual(event.target.value)} maxLength={80} placeholder={uiText("예: 성수동")}/></label><div><button type="button" onClick={()=>updateDong('')}>{uiText("전체 보기")}</button><button type="button" disabled={locating} onClick={()=>{setLocating(true);void detectCurrentLocation({updateCondition:false,updateStatus:false}).then(location=>{const next=extractDongFromText(location.label,location.address);if(!next)throw new Error('동네를 직접 입력해 주세요.');updateDong(next);}).catch(cause=>setLocationError(cause instanceof Error?cause.message:'현재 위치를 확인하지 못했어요.')).finally(()=>setLocating(false));}}>{uiText(locating?'확인 중…':'현 위치')}</button><button className="m-primary" type="submit">{uiText("적용")}</button></div>{locationError&&<p className="m-notice" role="alert">{uiText(locationError)}</p>}</form>}
    <label className="m-search"><MobileIcon name="search"/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder={uiText("코스나 장소 이름을 검색해요")} aria-label={uiText("코스 검색")}/>{query&&<button type="button" aria-label={uiText("검색어 지우기")} onClick={()=>setQuery('')}><MobileIcon name="close"/></button>}</label>
    <div className="m-filter-scroll" aria-label={uiText("코스 테마")}>{['전체',...categories.map(item=>item.label)].map(value=><button className={theme===value?'selected':''} aria-pressed={theme===value} key={value} type="button" onClick={()=>setTheme(value)}>{uiText(value)}</button>)}</div>
    <div className="m-list-top"><span>{uiText(dong||'모든 동네')} · {visible.length}{uiText("개의 코스")}</span><label><span className="m-sr-only">{uiText("코스 정렬")}</span><select aria-label={uiText("코스 정렬")} value={sort} onChange={event=>{setLoading(true);setSort(event.target.value as 'likes'|'latest');}}><option value="likes">{uiText("좋아요 많은 순")}</option><option value="latest">{uiText("최신 공개순")}</option></select></label></div>
    {loading?<div className="m-skeleton" role="status">{uiText("여행 코스를 불러오고 있어요…")}</div>:error?<EmptyState title={uiText("코스를 불러오지 못했어요")} action={<button type="button" className="m-primary" onClick={()=>{setLoading(true);setRevision(value=>value+1);}}>{uiText("다시 불러오기")}</button>}>{uiText(error)}</EmptyState>:visible.length?<div className="m-card-list">{visible.map(course=><MobileCourseCard key={course.id} item={courseFavorite(course)} onOpen={()=>setDetail(courseFavorite(course))}/>)}</div>:<EmptyState title={uiText(query||theme!=='전체'?'조건에 맞는 코스가 없어요':'아직 공개된 코스가 없어요')} action={<button type="button" onClick={()=>{setQuery('');setTheme('전체');setManual(dong);setEditor(true);}}>{uiText("조건·동네 바꾸기")}</button>}>{uiText("다른 테마나 가까운 동네를 살펴보세요.")}</EmptyState>}
    <p className="m-area-note">{uiText("공개된 코스의 좋아요 수 또는 공개일 기준이에요. 체류시간에는 이동시간이 포함되지 않아요.")}</p>
    {active&&detail&&<MobileContentDetail item={detail} onClose={()=>setDetail(null)}/>}
  </div>;
}
