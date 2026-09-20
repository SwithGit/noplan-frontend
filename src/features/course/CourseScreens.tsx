import { t as uiText } from '../../i18n/translate';
import { FavoriteButton } from '../mobile/MobileUi';
import { placeFavorite, planFavorite } from '../mobile/mobileModel';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AppTopBar } from '../../components/ui/AppTopBar';
import { Chip } from '../../components/ui/Chip';
import MapBoard from '../../components/MapBoard';
import { NopiBubble } from '../../components/ui/NopiBubble';
import { PlaceVisual } from '../../components/ui/PlaceVisual';
import { CrowdingStatus } from '../../components/ui/CrowdingStatus';
import { kakaoPlaceUrl } from '../../utils/placeMap';
import { usePlanner } from '../planner/PlannerContext';
import type { CoursePlace, CoursePlan } from '../../types/noplan';
import { generateCourse, trackPlaceInteraction } from '../../api/plannerApi';
import { ROUTES, coursePlaceRoute, courseReplaceRoute } from '../../routes';
import './replacement-screen.css';

function placeAt(places: CoursePlace[], indexValue: string | undefined) {
  const index = Number(indexValue || 0);
  return places[index] || places[0];
}

function compactCourseLocation(location: string, label?: string) {
  if (label) return label;

  const cleaned = location
    .replace(/^서울특별시\s*/, '')
    .replace(/^서울시\s*/, '')
    .replace(/^경기도\s*/, '')
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const dong = parts.find((part) => part.endsWith('동'));
  const district = parts.find((part) => /(구|군)$/.test(part));
  const road = parts.find((part) => /(로|길)\d*(가길|길)?$/.test(part));

  if (dong) return dong;
  if (district && road) return `${district} ${road.replace(/^(.+?로)\d.*$/, '$1')}`;

  return cleaned || location;
}

function hasCoordinates(place: CoursePlace) {
  return Number.isFinite(Number(place.lat)) && Number.isFinite(Number(place.lng));
}

function formatMenuPrice(price?: number | null, priceText?: string) {
  if (priceText?.trim()) return priceText.trim();
  return price && price > 0 ? `${price.toLocaleString('ko-KR')}원` : '가격 확인';
}

function openKakaoDestination(place: CoursePlace) {
  trackPlaceInteraction('external_map_open', place, undefined, { provider: 'kakao' }).catch(() => undefined);
  const keyword = encodeURIComponent(place.searchKeyword || place.name || place.title);

  if (hasCoordinates(place)) {
    window.open(`https://map.kakao.com/link/to/${keyword},${place.lat},${place.lng}`, '_blank', 'noopener,noreferrer');
    return;
  }

  window.open(`https://map.kakao.com/link/search/${keyword}`, '_blank', 'noopener,noreferrer');
}

function openPlaceLink(url?: string) {
  if (!url) return;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return;
    window.open(parsed.toString(), '_blank', 'noopener,noreferrer');
  } catch {
    // 관리자가 완전한 URL을 입력하기 전에는 외부 링크를 열지 않는다.
  }
}

function externalMapUrl(place: CoursePlace, provider: 'naver' | 'kakao') {
  const query = encodeURIComponent([place.searchKeyword || place.name || place.title, place.address].filter(Boolean).join(' '));
  if (provider === 'naver') return `https://map.naver.com/p/search/${query}`;
  return kakaoPlaceUrl(place);
}

function openExternalMap(place: CoursePlace, provider: 'naver' | 'kakao') {
  trackPlaceInteraction('external_map_open', place, undefined, { provider }).catch(() => undefined);
  window.open(externalMapUrl(place, provider), '_blank', 'noopener,noreferrer');
}

function openKakaoRoute(places: CoursePlace[]) {
  const routePlaces = places.filter(hasCoordinates);
  if (routePlaces.length < 2) {
    const first = places[0];
    if (first) openKakaoDestination(first);
    return;
  }

  trackPlaceInteraction('external_map_open', routePlaces[0], 1, { provider: 'kakao', route: true }).catch(() => undefined);

  const path = routePlaces
    .map((place) => `${encodeURIComponent(place.searchKeyword || place.name || place.title)},${place.lat},${place.lng}`)
    .join('/');

  window.open(`https://map.kakao.com/link/by/walk/${path}`, '_blank', 'noopener,noreferrer');
}

export function CourseMapScreen() {
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const { activePlan: plan, condition, hasActivePlan } = usePlanner();
  const routeState = routeLocation.state as { replacementMessage?: string; sharedCourseError?: boolean } | null;
  const replacementMessage = routeState?.replacementMessage;
  const sharedCourseError = routeState?.sharedCourseError;

  if (!hasActivePlan || !plan || plan.courseData.length === 0) {
    return (
      <div className="course-screen course-empty-screen">
        <AppTopBar title={uiText("내 코스")} subtitle={uiText(sharedCourseError ? '공유 코스를 확인하지 못했어요' : '아직 출발할 코스가 없어요')} />
        <section className="course-empty-state">
          <span aria-hidden="true">⌁</span>
          <h1>{uiText(sharedCourseError ? '공유 코스를 불러오지 못했어요' : '아직 선택한 코스가 없어요')}</h1>
          <p>{uiText(sharedCourseError
            ? '코스가 삭제되었거나 잠시 연결이 원활하지 않을 수 있어요. 다시 시도하거나 새 코스를 추천받아보세요.'
            : '검색 결과에서 ‘이 코스로 출발’을 누르거나 탐색에서 마음에 드는 코스를 골라보세요.')}</p>
          {sharedCourseError && <button type="button" onClick={() => navigate(0)}>{uiText("다시 시도")}</button>}
          <button className="primary" type="button" onClick={() => navigate(ROUTES.appHome)}>{uiText("코스 추천받기")}</button>
          <button type="button" onClick={() => navigate(ROUTES.explore)}>{uiText("탐색에서 둘러보기")}</button>
        </section>
      </div>
    );
  }
  const firstPlace = plan.courseData[0];
  const nextPlace = plan.courseData[1];
  const locationText = compactCourseLocation(plan.location, condition.locationLabel);

  return (
    <div className="course-screen">
      <AppTopBar title={uiText(plan.title)} subtitle={uiText(`${locationText} · ${plan.durationText}`)} /><div className="m-mobile-only"><FavoriteButton item={planFavorite(plan)}/></div>

      <section className="route-map-panel real-map-panel">
        <MapBoard courseList={plan.courseData} userLocation={plan.location} />
      </section>

      {replacementMessage && <p className="inline-message" role="status">{replacementMessage}</p>}

      <section className="route-progress-panel">
        <span>{uiText("현재 코스 · 1/")}{plan.courseData.length}</span>
        <strong>{uiText(firstPlace.title)}</strong>
        <p>{uiText(nextPlace ? `다음은 ${nextPlace.title} · ${nextPlace.moveText}` : '이 장소가 코스의 마지막이에요.')}</p>
      </section>

      <section className="route-list">
        {plan.courseData.map((place, index) => (
          <article className="route-item" key={place.id}>
            <PlaceVisual alt={place.name} color={place.color} imageUrl={place.imageUrl} label={uiText(String(index + 1))} type={place.type} detailType={place.detailType} />
            <div>
              <span>{index + 1}{uiText("번째 장소")}</span>
              <strong>{uiText(place.title)}</strong>
              <p>{uiText(place.summary)}</p>
              <CrowdingStatus compact snapshot={place.crowding} />
            </div>
            <button type="button" onClick={() => navigate(coursePlaceRoute(index))}>{uiText("보기")}</button>
          </article>
        ))}
      </section>

      <div className="sticky-actions">
        <button type="button" onClick={() => navigate(ROUTES.plannerResult)}>{uiText("추천 결과")}</button>
        <button className="primary" type="button" onClick={() => {
          if (firstPlace) trackPlaceInteraction('course_start', firstPlace, 1).catch(() => undefined);
          openKakaoRoute(plan.courseData);
        }}>{uiText("카카오 길찾기")}</button>
      </div>
    </div>
  );
}

export function PlaceDetailScreen() {
  const navigate = useNavigate();
  const { index } = useParams();
  const { activePlan: plan, hasActivePlan } = usePlanner();
  const activePlaces = plan?.courseData || [];
  const place = placeAt(activePlaces, index);
  const placeIndex = Math.max(Number(index || 0), 0);
  const nextPlace = activePlaces[placeIndex + 1];

  useEffect(() => {
    if (!place) return;
    trackPlaceInteraction('place_detail_open', place, placeIndex + 1).catch(() => undefined);
    if (place.galleryImages?.length) trackPlaceInteraction('gallery_open', place, placeIndex + 1).catch(() => undefined);
    if (place.menuItems?.length) trackPlaceInteraction('menu_view', place, placeIndex + 1).catch(() => undefined);
  }, [place, placeIndex]);

  if (!hasActivePlan || !plan || !place) {
    return (
      <div className="place-detail-screen course-empty-screen">
        <AppTopBar title={uiText("장소 상세")} />
        <section className="course-empty-state">
          <h1>{uiText("열 수 있는 장소가 없어요")}</h1>
          <p>{uiText("먼저 코스를 선택해 주세요.")}</p>
          <button className="primary" type="button" onClick={() => navigate(ROUTES.explore)}>{uiText("코스 둘러보기")}</button>
        </section>
      </div>
    );
  }

  return (
    <div className="place-detail-screen">
      <AppTopBar title={uiText(place.title)} subtitle={uiText(place.category || place.type)} /><div className="m-mobile-only"><FavoriteButton item={placeFavorite(place)}/></div>

      {place.galleryImages?.length ? (
        <section className="place-gallery place-gallery-first" aria-label={uiText("장소 사진")}>
          {place.galleryImages!.slice(0, 6).map((image, imageIndex) => (
            <img alt={uiText(`${place.name} ${image.imageType || '사진'} ${imageIndex + 1}`)} key={`${image.imageUrl}-${imageIndex}`} loading="lazy" src={image.thumbnailUrl || image.imageUrl} />
          ))}
        </section>
      ) : (
        <section className="place-detail-cover">
          <PlaceVisual alt={place.name} color={place.color} imageUrl={place.imageUrl} label={uiText(String(placeIndex + 1))} type={place.type} detailType={place.detailType} />
        </section>
      )}

      <section className="place-hero">
        <div>
          <span>{uiText(place.moveText)}</span>
          <h1>{uiText(place.title)}</h1>
          <p>{uiText(place.description)}</p>
        </div>
      </section>

      <div className="chip-row">
        {place.tags.map((tag) => (
          <Chip active key={tag}>
            {uiText(tag)}
          </Chip>
        ))}
      </div>

      <NopiBubble title={uiText("여기를 고른 이유")} body={place.reason} compact />
      <CrowdingStatus snapshot={place.crowding} />

      <section className="fit-grid">
        <article>
          <span>{uiText("이동")}</span>
          <strong>{uiText(place.moveText)}</strong>
        </article>
        <article>
          <span>{uiText("대기")}</span>
          <strong>{uiText(place.waitText)}</strong>
        </article>
        <article>
          <span>{uiText("무드")}</span>
          <strong>{uiText(place.moodText)}</strong>
        </article>
      </section>

      <section className="info-list">
        <div>
          <span>{uiText("주소")}</span>
          <strong>{uiText(place.address || `${plan.location} 근처`)}</strong>
        </div>
        <div>
          <span>{uiText("운영")}</span>
          <strong>{uiText(place.hours || '상세 확인 필요')}</strong>
        </div>
        <div>
          <span>{uiText("다음 코스")}</span>
          <strong>{uiText(nextPlace ? nextPlace.title : '마지막 장소')}</strong>
        </div>
      </section>

      {place.type !== 'hotplace' && (place.catalogRating != null || place.catalogReviewCount != null) && (
        <section className="google-quality-panel">
          <strong>{uiText([
            place.catalogRating != null ? `저장 평점 ${place.catalogRating.toFixed(1)}` : null,
            place.catalogReviewCount != null ? `저장 리뷰 ${place.catalogReviewCount.toLocaleString('ko-KR')}개` : null,
          ].filter(Boolean).join(' · '))}</strong>
          <span>{uiText("노플랜 수집 정보")}</span>
        </section>
      )}

      {place.businessStatus !== 'open' && place.businessStatus !== 'closed' && (
        <p className="inline-message">{uiText("영업시간을 확인하지 못한 장소예요. 방문 전 아래 카카오맵에서 영업시간과 라스트오더를 확인해 주세요.")}</p>
      )}
      <section className="external-map-links" aria-label={uiText("외부 지도에서 장소 보기")}>
        <button type="button" onClick={() => openExternalMap(place, 'naver')}>{uiText("네이버지도에서 보기")}</button>
        <button type="button" onClick={() => openExternalMap(place, 'kakao')}>{uiText("카카오맵에서 보기")}</button>
        {place.instagramUrl && <button type="button" onClick={() => openPlaceLink(place.instagramUrl)}>{uiText("인스타그램 보기")}</button>}
        {place.reservationUrl && <button type="button" onClick={() => openPlaceLink(place.reservationUrl)}>{uiText("예약하기")}</button>}
      </section>

      {Boolean(place.menuItems?.length) && (
        <section className="place-menu-section">
          <h2>{uiText("메뉴")}</h2>
          <div className="place-menu-list">
            {place.menuItems!.slice(0, 8).map((menu, menuIndex) => (
              <article key={`${menu.name}-${menuIndex}`}>
                {menu.imageUrl ? <img alt={menu.name} loading="lazy" src={menu.imageUrl} /> : <span className="place-menu-placeholder" />}
                <div>
                  <strong>{menu.name}{uiText(menu.isSignature ? ' · 대표' : '')}</strong>
                  {menu.description && <p>{uiText(menu.description)}</p>}
                </div>
                <b>{formatMenuPrice(menu.price, menu.priceText)}</b>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="sticky-actions">
        <button type="button" onClick={() => navigate(courseReplaceRoute(placeIndex))}>{uiText("바꾸기")}</button>
        <button className="primary" type="button" onClick={() => openKakaoDestination(place)}>{uiText("카카오맵 길찾기")}</button>
      </div>
    </div>
  );
}

export function ReplacementCandidates() {
  const navigate = useNavigate();
  const { index } = useParams();
  const placeIndex = Number(index);
  const { activePlan: plan, hasActivePlan, applyReplacementPlan } = usePlanner();
  const current = Number.isInteger(placeIndex) ? plan?.courseData[placeIndex] : undefined;
  const [attempt, setAttempt] = useState(0);
  const replacementApplied = useRef(false);
  const [response, setResponse] = useState<{ plan: CoursePlan; index: number; attempt: number; result: CoursePlan } | null>(null);
  const context = plan?.planningContext;
  const window = plan?.requestedWindow;
  const canSearch = Boolean(current && context && window && plan?.courseData.every(place => place.catalogPlaceId));
  const result = response?.plan === plan && response?.index === placeIndex && response?.attempt === attempt ? response.result : null;
  const loading = canSearch && !result;
  const candidates = result?.source === 'api' ? result.courseOptions || [] : [];

  useEffect(() => {
    if (replacementApplied.current || !canSearch || !plan || !context || !window) return;
    const controller = new AbortController();
    generateCourse(context.condition, context.currentPosition, {
      replacement: { index: placeIndex, coursePlaceIds: plan.courseData.map(place => place.catalogPlaceId!), window },
      signal: controller.signal,
    }).then(next => {
      if (!controller.signal.aborted) setResponse({ plan, index: placeIndex, attempt, result: next });
    });
    return () => controller.abort();
  }, [plan, context, window, placeIndex, attempt, canSearch]);

  if (!hasActivePlan || !plan || !current) {
    return (
      <div className="replacement-screen course-empty-screen">
        <AppTopBar title={uiText("장소 바꾸기")} />
        <section className="course-empty-state">
          <h1>{uiText("바꿀 장소가 없어요")}</h1>
          <p>{uiText("먼저 코스를 선택해 주세요.")}</p>
          <button className="primary" type="button" onClick={() => navigate(ROUTES.explore)}>{uiText("코스 둘러보기")}</button>
        </section>
      </div>
    );
  }

  return (
    <div className="replacement-screen">
      <AppTopBar title={uiText("다른 후보")} subtitle={uiText(`${current.title} 대신 갈 만한 곳`)} />
      <section className="replacement-current-card">
        <span>{uiText("현재 장소")}</span>
        <strong>{uiText(current.title)}</strong>
        <p>{uiText(current.category)} · {uiText(current.moveText)} · {uiText(current.waitText)}</p>
      </section>

      <section className="candidate-list">
        {loading && <p className="inline-message" role="status">{uiText("주변 후보의 영업시간·앞뒤 이동 거리·전체 예산을 확인하고 있어요.")}</p>}
        {!loading && candidates.length === 0 && (
          <section className="replacement-empty">
            <p className="inline-message warning" role="status">{uiText(!canSearch
              ? plan?.courseData.some(place => place.candidateSource === 'live')
                ? '실시간 검색 코스는 개별 장소 교체를 아직 지원하지 않아요. 조건을 수정해 코스를 다시 추천받아 주세요.'
                : '이 코스에는 처음 추천받은 조건이 저장되어 있지 않아요. 조건을 입력해 코스를 다시 찾으면 장소를 바꿀 수 있어요.'
              : result?.message || '현재 코스의 조건을 모두 확인한 교체 후보를 찾지 못했어요. 현재 장소는 유지했어요.')}</p>
            {canSearch && <button type="button" onClick={() => setAttempt(value => value + 1)}>{uiText("후보 다시 찾기")}</button>}
            <button type="button" onClick={() => navigate(ROUTES.plannerCondition)}>{uiText("조건 수정하기")}</button>
            <button className="primary" type="button" onClick={() => navigate(ROUTES.courseMap)}>{uiText("현재 장소 유지")}</button>
          </section>
        )}
        {candidates.length > 0 && <p className="inline-message">{uiText("다른 장소는 그대로 유지해요. 교체 후 전체 일정과 비용을 다시 계산했어요.")}</p>}
        {candidates.map(option => {
          const candidate = option.courseData[placeIndex];
          return (
          <article className="candidate-card" key={candidate.id}>
            <PlaceVisual alt={candidate.name} color={candidate.color} imageUrl={candidate.imageUrl} type={candidate.type} detailType={candidate.detailType} />
            <div className="replacement-candidate-info">
              <span>{uiText(candidate.category)}</span>
              <strong>{uiText(candidate.title)}</strong>
              <small>{uiText(candidate.moveText)} · {uiText(candidate.scheduledStart ? new Date(candidate.scheduledStart).toLocaleTimeString('ko-KR', {timeZone:'Asia/Seoul',hour:'numeric',minute:'2-digit'}) + ' 방문' : candidate.time)}</small>
              <p className="replacement-course-cost">{uiText(option.summary.costKnown ? `${option.summary.estimatedMin?.toLocaleString()}~${option.summary.estimatedMax?.toLocaleString()}원` : '가격 확인 필요')}<span>{uiText("교체 후 전체 코스 · 1인 예상")}</span></p>
              {option.courseData.some(place => place.estimatedCost?.assumptions?.length) && <small>{uiText("일부 가격 가정 포함")}</small>}
              <details className="replacement-candidate-details"><summary>{uiText("방문·가격 안내")}</summary><p>{uiText(candidate.reason)}</p>{option.summary.warnings.map((warning, i) => <p key={i}>{warning}</p>)}</details>
              <CrowdingStatus compact snapshot={candidate.crowding} />
            </div>
            <button
              type="button"
              onClick={() => {
                if (!result) return;
                const end = new Date(option.summary.endAt).toLocaleTimeString('ko-KR', {timeZone:'Asia/Seoul',hour:'numeric',minute:'2-digit'});
                replacementApplied.current = true;
                if (!applyReplacementPlan(placeIndex, {...result,courseData:option.courseData,accuracySummary:option.summary,durationText:`${option.courseData.length}곳 · ${end}까지`}, plan)) {
                  replacementApplied.current = false;
                  return;
                }
                trackPlaceInteraction('place_replace', candidate, placeIndex + 1).catch(() => undefined);
                navigate(ROUTES.courseMap, { state: { replacementMessage: `${current.title}을(를) ${candidate.title}(으)로 바꿨어요.` } });
              }}
            >{uiText("교체")}</button>
          </article>
        );})}
      </section>
    </div>
  );
}
