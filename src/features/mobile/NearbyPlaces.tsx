import { t as uiText } from '../../i18n/translate';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiJson } from '../../api/client';
import { normalizeCoursePlace } from '../../utils/coursePlan';
import type { CoursePlace } from '../../types/noplan';
import { ROUTES } from '../../routes';
import { PlaceVisual } from '../../components/ui/PlaceVisual';
import { usePlanner } from '../planner/PlannerContext';
import { MobileContentDetail } from './MobileCards';
import { categories, placeFavorite } from './mobileModel';
import './mobile.css';
import './nearbyPlaces.css';

type RankedPlace = CoursePlace & { rank: number; distanceMeters: number };
export function NearbyPlaces() {
  const [params, setParams] = useSearchParams();
  const category = categories.find(item => item.key === params.get('category')) || categories[0];
  const { condition, currentPosition, setCondition, detectCurrentLocation } = usePlanner();
  const area = condition.locationLabel || condition.location;
  const [input, setInput] = useState(area), [locating, setLocating] = useState(false), [notice, setNotice] = useState('');
  const [places, setPlaces] = useState<RankedPlace[]>([]), [loading, setLoading] = useState(false), [error, setError] = useState('');
  const [retry, setRetry] = useState(0), [detail, setDetail] = useState<CoursePlace | null>(null);
  const initialLocation = useRef(false);
  const locate = async () => {
    setLocating(true); setNotice('');
    try { const found = await detectCurrentLocation(); setInput(found.label); }
    catch { setNotice('위치를 확인하지 못했어요. 권한을 허용하거나 동네·역 이름을 직접 입력해 주세요.'); }
    finally { setLocating(false); }
  };
  useEffect(() => {
    if (!area && !initialLocation.current) { initialLocation.current = true; void locate(); }
    // Ask once when entering without an area, following the category click.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!condition.location) return;
    const controller = new AbortController();
    const query = new URLSearchParams({ category: category.key, area: condition.location });
    if (currentPosition?.address === condition.location) { query.set('lat', String(currentPosition.lat)); query.set('lng', String(currentPosition.lng)); }
    setLoading(true); setError(''); setPlaces([]); setDetail(null);
    const timer = window.setTimeout(() => controller.abort(), 12000);
    let active = true;
    apiJson<{ places: Array<Record<string, unknown>> }>(`/api/library/rankings?${query}`, { signal: controller.signal })
      .then(result => {
        if (!active) return;
        setPlaces(result.places.flatMap((raw, index) => {
          const place = normalizeCoursePlace(raw, index);
          return place ? [{ ...place, rating: raw.rating == null ? undefined : Number(raw.rating), reviewCount: raw.reviewCount == null ? undefined : Number(raw.reviewCount), rank: Number(raw.rank), distanceMeters: Number(raw.distanceMeters) }] : [];
        }));
      }).catch(cause => { if (active) setError(cause?.name === 'AbortError' ? '조회가 늦어지고 있어요. 다시 시도해 주세요.' : cause instanceof Error ? cause.message : '주변 가게를 불러오지 못했어요.'); })
      .finally(() => { clearTimeout(timer); if (active) setLoading(false); });
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [category.key, condition.location, currentPosition, retry]);
  const chooseArea = (event: FormEvent) => {
    event.preventDefault();
    if (input.trim().length < 2) { setNotice('동네나 역 이름을 두 글자 이상 입력해 주세요.'); return; }
    setNotice(''); setCondition({ location: input.trim(), locationLabel: input.trim() }); setRetry(value => value + 1);
  };
  return <div className="mobile-page nearby-page">
    <header className="nearby-header"><Link to={ROUTES.appHome} aria-label={uiText("홈으로")}>‹</Link><div><small>{uiText("우리 동네 발견")}</small><h1>{uiText("주변 ")}{uiText(category.label)}{uiText(category.key === 'hotplace' ? '' : ' 순위')}</h1></div></header>
    <form className="nearby-location" onSubmit={chooseArea}><label htmlFor="nearby-area">{uiText("어디를 둘러볼까요?")}</label><div><input id="nearby-area" value={input} onChange={event => setInput(event.target.value)} placeholder={uiText("예: 홍대입구역, 성수동")} maxLength={80}/><button type="submit">{uiText("지역 선택")}</button></div><button type="button" disabled={locating} onClick={() => void locate()}>{uiText(locating ? '현재 위치 확인 중…' : '현재 위치로 찾기')}</button></form>
    {notice && <p className="m-notice" role="status">{uiText(notice)}</p>}
    <nav className="nearby-categories" aria-label={uiText("장소 카테고리")}>{categories.map(item => <button key={item.key} type="button" aria-pressed={category.key === item.key} onClick={() => setParams({ category: item.key })}>{uiText(item.label)}</button>)}</nav>
    <div className="nearby-intro"><h2>{uiText(area || '내 주변')} <span>{uiText("반경 2km")}</span></h2><p>{uiText(category.key === 'hotplace' ? '가까운 순으로 모았어요. 산책·명소에는 별점과 후기 수를 표시하지 않아요.' : '노플랜 DB 평점에 후기 수를 반영해 정렬했어요. 점수가 같으면 후기 수와 거리를 비교해요.')}</p></div>
    {loading ? <p className="m-inline-empty" role="status">{uiText("주변 장소를 확인하고 있어요…")}</p> : error ? <div className="m-inline-empty" role="alert"><p>{uiText(error)}</p><button type="button" onClick={() => setRetry(value => value + 1)}>{uiText("다시 불러오기")}</button></div> : !area ? <p className="m-inline-empty">{uiText("현재 위치를 사용하거나 동네를 직접 선택해 주세요.")}</p> : !places.length ? <p className="m-inline-empty">{uiText("이 지역 2km 안에는 등록된 ")}{uiText(category.label)}{uiText(" 장소가 아직 없어요. 다른 동네를 선택해 주세요.")}</p> : <ol className="nearby-list">{places.map(place => <li key={place.id}><button type="button" className="nearby-place" onClick={() => setDetail(place)}><span className="nearby-rank">{place.rank}</span><PlaceVisual imageUrl={place.imageUrl} type={place.type} detailType={place.detailType} alt=""/><span className="nearby-place-copy"><small>{uiText(place.detailType || category.label)}{uiText(" · 직선 ")}{place.distanceMeters < 1000 ? `${place.distanceMeters}m` : `${(place.distanceMeters / 1000).toFixed(1)}km`}</small><strong>{place.name}</strong><span>{place.address}</span>{category.key !== 'hotplace' && <span className="nearby-rating">{uiText(place.rating != null && place.rating > 0 ? `★ ${place.rating.toFixed(1)}` : '별점 미확인')} · {uiText(place.reviewCount != null ? `후기 ${place.reviewCount.toLocaleString()}개` : '후기 수 미확인')}</span>}</span><span aria-hidden="true">›</span></button></li>)}</ol>}
    <p className="nearby-footnote">{uiText("등록된 장소 기준 · 영업시간과 메뉴는 방문 전 확인해 주세요.")}</p>
    {detail && <MobileContentDetail item={placeFavorite(detail)} onClose={() => setDetail(null)}/>}
  </div>;
}
