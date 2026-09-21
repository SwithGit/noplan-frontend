import { usePublicTranslation } from '../../i18n/usePublicTranslation';
import { t as uiText } from '../../i18n/translate';
import { useDesktop } from './useDesktop';
import { useNavigate } from 'react-router-dom';
import { PlaceVisual } from '../../components/ui/PlaceVisual';
import { TripDialog } from '../trips/TripDialog';
import { usePlanner } from '../planner/PlannerContext';
import { ROUTES } from '../../routes';
import type { CoursePlace } from '../../types/noplan';
import { durationLabel, placeFavorite, type FavoriteInput } from './mobileModel';
import { FavoriteButton, MobileIcon } from './MobileUi';

export function MobileCourseCard({item,onOpen,unavailable=false,byline}:{item:FavoriteInput;onOpen:()=>void;unavailable?:boolean;byline?:string}) {
  const {text:copy}=usePublicTranslation(item.publicCourseId?{kind:'course',id:item.publicCourseId}:undefined);
  const first=item.places[0];const event=first?.type==='event';
  const coverPlace=item.places.find(place=>place.imageUrl||place.galleryImages?.some(image=>image.imageUrl))||first;
  const coverUrl=coverPlace?.imageUrl||coverPlace?.galleryImages?.find(image=>image.imageUrl)?.imageUrl;
  return <article className="m-course-card"><button type="button" className="m-course-main" onClick={onOpen}><PlaceVisual imageUrl={coverUrl} type={coverPlace?.type} detailType={coverPlace?.detailType} alt={coverUrl?`${item.title} · ${coverPlace.name}`:item.title}/><div><span className="m-kicker"><MobileIcon name="pin"/>{copy(item.location||'동네 여행')}</span><h3>{copy(item.title)}</h3><p>{event?copy(first.description.split('\n')[1]||first.address||''):item.places.slice(0,3).map(place=>copy(place.name)).join(' → ')}</p><span className="m-course-duration"><MobileIcon name="clock"/>{event?first.summary:uiText(durationLabel(item.places))}</span><span className="m-course-tags">{[...new Set(item.places.map(place=>place.category).filter(Boolean))].slice(0,2).map(tag=><span key={tag}>#{uiText(tag)}</span>)}</span></div></button><FavoriteButton item={item} compact/>{byline&&<p className="m-course-byline">{byline}</p>}{unavailable&&<p className="m-notice">{uiText("현재 이용 여부를 확인할 장소가 있어요.")}</p>}</article>;
}
export function MobilePlaceCard({place,onOpen}:{place:CoursePlace;onOpen:()=>void}) {return <article className="m-place-card"><button type="button" onClick={onOpen}><PlaceVisual imageUrl={place.imageUrl} type={place.type} detailType={place.detailType} alt={place.name}/><span>{uiText(place.detailType||place.category||'동네의 발견')}</span><h3>{place.name}</h3><p>{uiText(place.address||'주소 확인 필요')}</p><span className="m-place-rating">{place.rating!=null&&place.rating>0?<><b>★ {place.rating.toFixed(1)}</b><span>{uiText(place.reviewCount!=null?`후기 ${place.reviewCount.toLocaleString()}개`:'후기 수 미확인')}</span></>:<span>{uiText("별점 정보 없음")}{uiText(place.reviewCount!=null?` · 후기 ${place.reviewCount.toLocaleString()}개`:'')}</span>}</span></button><FavoriteButton item={placeFavorite(place)} compact/></article>;}
export function MobileContentDetail({item,onClose,unavailable=false}:{item:FavoriteInput;onClose:()=>void;unavailable?:boolean}) {
  const {text:copy}=usePublicTranslation(item.publicCourseId?{kind:'course',id:item.publicCourseId}:undefined);
  const {loadPlan}=usePlanner();const navigate=useNavigate();const desktop=useDesktop();
  return <TripDialog title={copy(item.title)} onClose={onClose}><div className="m-detail"><span className="m-kicker"><MobileIcon name="pin"/>{copy(item.location||'장소 정보')}</span><p>{uiText(durationLabel(item.places))}{uiText(" · 이동시간 별도")}</p><FavoriteButton item={item}/><div className="m-detail-places">{item.places.map((place,index)=><article key={`${place.id}-${index}`}><PlaceVisual imageUrl={place.imageUrl} type={place.type} detailType={place.detailType} alt={copy(place.name)}/><div><small>{uiText(item.kind==='course'?`${index+1}번째 장소 · `:'')}{uiText(place.category)}</small><h3>{copy(place.name)}</h3><p>{copy(place.description)}</p><p>{copy(place.address||'')}</p>{item.kind==='course'&&<FavoriteButton item={placeFavorite(place)}/>}<a href={`https://map.kakao.com/link/search/${encodeURIComponent(`${copy(place.name)} ${place.address||''}`)}`} target="_blank" rel="noreferrer">{uiText("지도에서 확인 ")}<MobileIcon name="arrow"/></a></div></article>)}</div><p className="m-notice">{uiText(unavailable?'삭제되거나 추천에서 제외된 장소가 포함되어 있어요. 다른 코스를 골라주세요.':'저장된 장소 정보예요. 출발 전 영업시간과 실제 이동시간을 확인해 주세요.')}</p>{!desktop&&item.kind==='course'&&<button type="button" className="m-primary" disabled={unavailable} onClick={()=>{loadPlan({title:item.title,location:item.location,courseData:item.places,backupPlaces:[],source:'api',durationText:durationLabel(item.places)});onClose();navigate(ROUTES.courseMap);}}>{uiText("이 코스로 출발 ")}<MobileIcon name="arrow"/></button>}</div></TripDialog>;
}
