import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AppTopBar } from '../../components/ui/AppTopBar';
import { Chip } from '../../components/ui/Chip';
import MapBoard from '../../components/MapBoard';
import { NopiBubble } from '../../components/ui/NopiBubble';
import { PlaceVisual } from '../../components/ui/PlaceVisual';
import { CrowdingStatus } from '../../components/ui/CrowdingStatus';
import { usePlanner } from '../planner/PlannerContext';
import type { CoursePlace } from '../../types/noplan';
import { trackPlaceInteraction } from '../../api/plannerApi';
import { ROUTES, coursePlaceRoute, courseReplaceRoute } from '../../routes';

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

function externalMapUrl(place: CoursePlace, provider: 'naver' | 'google') {
  const query = encodeURIComponent([place.searchKeyword || place.name || place.title, place.address].filter(Boolean).join(' '));
  if (provider === 'naver') return `https://map.naver.com/p/search/${query}`;
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function openExternalMap(place: CoursePlace, provider: 'naver' | 'google') {
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
        <AppTopBar title="내 코스" subtitle={sharedCourseError ? '공유 코스를 확인하지 못했어요' : '아직 출발할 코스가 없어요'} />
        <section className="course-empty-state">
          <span aria-hidden="true">⌁</span>
          <h1>{sharedCourseError ? '공유 코스를 불러오지 못했어요' : '아직 선택한 코스가 없어요'}</h1>
          <p>{sharedCourseError
            ? '코스가 삭제되었거나 잠시 연결이 원활하지 않을 수 있어요. 다시 시도하거나 새 코스를 추천받아보세요.'
            : '검색 결과에서 ‘이 코스로 출발’을 누르거나 탐색에서 마음에 드는 코스를 골라보세요.'}</p>
          {sharedCourseError && <button type="button" onClick={() => navigate(0)}>다시 시도</button>}
          <button className="primary" type="button" onClick={() => navigate(ROUTES.appHome)}>코스 추천받기</button>
          <button type="button" onClick={() => navigate(ROUTES.explore)}>탐색에서 둘러보기</button>
        </section>
      </div>
    );
  }
  const firstPlace = plan.courseData[0];
  const nextPlace = plan.courseData[1];
  const locationText = compactCourseLocation(plan.location, condition.locationLabel);

  return (
    <div className="course-screen">
      <AppTopBar title={plan.title} subtitle={`${locationText} · ${plan.durationText}`} />

      <section className="route-map-panel real-map-panel">
        <MapBoard courseList={plan.courseData} userLocation={plan.location} />
      </section>

      {replacementMessage && <p className="inline-message" role="status">{replacementMessage}</p>}

      <section className="route-progress-panel">
        <span>현재 코스 · 1/{plan.courseData.length}</span>
        <strong>{firstPlace.title}</strong>
        <p>{nextPlace ? `다음은 ${nextPlace.title} · ${nextPlace.moveText}` : '이 장소가 코스의 마지막이에요.'}</p>
      </section>

      <section className="route-list">
        {plan.courseData.map((place, index) => (
          <article className="route-item" key={place.id}>
            <PlaceVisual alt={place.name} color={place.color} imageUrl={place.imageUrl} label={String(index + 1)} type={place.type} detailType={place.detailType} />
            <div>
              <span>{index + 1}번째 장소</span>
              <strong>{place.title}</strong>
              <p>{place.summary}</p>
              <CrowdingStatus compact snapshot={place.crowding} />
            </div>
            <button type="button" onClick={() => navigate(coursePlaceRoute(index))}>
              보기
            </button>
          </article>
        ))}
      </section>

      <div className="sticky-actions">
        <button type="button" onClick={() => navigate(ROUTES.plannerResult)}>
          추천 결과
        </button>
        <button className="primary" type="button" onClick={() => {
          if (firstPlace) trackPlaceInteraction('course_start', firstPlace, 1).catch(() => undefined);
          openKakaoRoute(plan.courseData);
        }}>
          카카오 길찾기
        </button>
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
        <AppTopBar title="장소 상세" />
        <section className="course-empty-state">
          <h1>열 수 있는 장소가 없어요</h1>
          <p>먼저 코스를 선택해 주세요.</p>
          <button className="primary" type="button" onClick={() => navigate(ROUTES.explore)}>코스 둘러보기</button>
        </section>
      </div>
    );
  }

  return (
    <div className="place-detail-screen">
      <AppTopBar title={place.title} subtitle={place.category || place.type} />

      {place.galleryImages?.length ? (
        <section className="place-gallery place-gallery-first" aria-label="장소 사진">
          {place.galleryImages!.slice(0, 6).map((image, imageIndex) => (
            <img alt={`${place.name} ${image.imageType || '사진'} ${imageIndex + 1}`} key={`${image.imageUrl}-${imageIndex}`} loading="lazy" src={image.thumbnailUrl || image.imageUrl} />
          ))}
        </section>
      ) : (
        <section className="place-detail-cover">
          <PlaceVisual alt={place.name} color={place.color} imageUrl={place.imageUrl} label={String(placeIndex + 1)} type={place.type} detailType={place.detailType} />
        </section>
      )}

      <section className="place-hero">
        <div>
          <span>{place.moveText}</span>
          <h1>{place.title}</h1>
          <p>{place.description}</p>
        </div>
      </section>

      <div className="chip-row">
        {place.tags.map((tag) => (
          <Chip active key={tag}>
            {tag}
          </Chip>
        ))}
      </div>

      <NopiBubble title="여기를 고른 이유" body={place.reason} compact />
      <CrowdingStatus snapshot={place.crowding} />

      <section className="fit-grid">
        <article>
          <span>이동</span>
          <strong>{place.moveText}</strong>
        </article>
        <article>
          <span>대기</span>
          <strong>{place.waitText}</strong>
        </article>
        <article>
          <span>무드</span>
          <strong>{place.moodText}</strong>
        </article>
      </section>

      <section className="info-list">
        <div>
          <span>주소</span>
          <strong>{place.address || `${plan.location} 근처`}</strong>
        </div>
        <div>
          <span>운영</span>
          <strong>{place.hours || '상세 확인 필요'}</strong>
        </div>
        <div>
          <span>다음 코스</span>
          <strong>{nextPlace ? nextPlace.title : '마지막 장소'}</strong>
        </div>
      </section>

      {place.rating != null && place.reviewCount != null && (
        <section className="google-quality-panel">
          <strong>Google 평점 {place.rating.toFixed(1)} · 리뷰 {place.reviewCount.toLocaleString('ko-KR')}개</strong>
          <span>{place.googleAttribution || 'Google Maps 제공'}</span>
        </section>
      )}

      <section className="external-map-links" aria-label="외부 지도에서 장소 보기">
        <button type="button" onClick={() => openExternalMap(place, 'naver')}>네이버지도에서 보기</button>
        <button type="button" onClick={() => openExternalMap(place, 'google')}>Google Maps에서 보기</button>
        {place.instagramUrl && <button type="button" onClick={() => openPlaceLink(place.instagramUrl)}>인스타그램 보기</button>}
        {place.reservationUrl && <button type="button" onClick={() => openPlaceLink(place.reservationUrl)}>예약하기</button>}
      </section>

      {Boolean(place.menuItems?.length) && (
        <section className="place-menu-section">
          <h2>메뉴</h2>
          <div className="place-menu-list">
            {place.menuItems!.slice(0, 8).map((menu, menuIndex) => (
              <article key={`${menu.name}-${menuIndex}`}>
                {menu.imageUrl ? <img alt={menu.name} loading="lazy" src={menu.imageUrl} /> : <span className="place-menu-placeholder" />}
                <div>
                  <strong>{menu.name}{menu.isSignature ? ' · 대표' : ''}</strong>
                  {menu.description && <p>{menu.description}</p>}
                </div>
                <b>{formatMenuPrice(menu.price, menu.priceText)}</b>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="sticky-actions">
        <button type="button" onClick={() => navigate(courseReplaceRoute(placeIndex))}>
          바꾸기
        </button>
        <button className="primary" type="button" onClick={() => openKakaoDestination(place)}>
          카카오맵 길찾기
        </button>
      </div>
    </div>
  );
}

export function ReplacementCandidates() {
  const navigate = useNavigate();
  const { index } = useParams();
  const placeIndex = Math.max(Number(index || 0), 0);
  const { activePlan: plan, hasActivePlan, replacePlace } = usePlanner();
  const current = placeAt(plan?.courseData || [], index);
  const candidates = useMemo(() => {
    if (!current || !plan) return [];
    const sameType = plan.backupPlaces.filter((place) => place.type === current.type || place.category === current.category);
    return sameType.length ? sameType : plan.backupPlaces;
  }, [current, plan]);

  if (!hasActivePlan || !plan || !current) {
    return (
      <div className="replacement-screen course-empty-screen">
        <AppTopBar title="장소 바꾸기" />
        <section className="course-empty-state">
          <h1>바꿀 장소가 없어요</h1>
          <p>먼저 코스를 선택해 주세요.</p>
          <button className="primary" type="button" onClick={() => navigate(ROUTES.explore)}>코스 둘러보기</button>
        </section>
      </div>
    );
  }

  return (
    <div className="replacement-screen">
      <AppTopBar title="다른 후보" subtitle={`${current.title} 대신 갈 만한 곳`} />
      <section className="replacement-current-card">
        <span>현재 장소</span>
        <strong>{current.title}</strong>
        <p>{current.category} · {current.moveText} · {current.waitText}</p>
      </section>

      <section className="candidate-list">
        {candidates.length === 0 && (
          <section className="replacement-empty">
            <p className="inline-message warning">현재 코스와 비슷한 교체 후보가 아직 없어요.</p>
            <button type="button" onClick={() => navigate(ROUTES.plannerCondition)}>조건 수정하기</button>
            <button className="primary" type="button" onClick={() => navigate(ROUTES.courseMap)}>현재 장소 유지</button>
          </section>
        )}
        {candidates.map((candidate) => (
          <article className="candidate-card" key={candidate.id}>
            <PlaceVisual alt={candidate.name} color={candidate.color} imageUrl={candidate.imageUrl} type={candidate.type} detailType={candidate.detailType} />
            <div>
              <span>{candidate.category}</span>
              <strong>{candidate.title}</strong>
              <p>{candidate.summary}</p>
              <small>{candidate.moveText} · {candidate.waitText} · {candidate.moodText}</small>
              <small>{candidate.reason}</small>
              <CrowdingStatus compact snapshot={candidate.crowding} />
            </div>
            <button
              type="button"
              onClick={() => {
                trackPlaceInteraction('place_replace', candidate, placeIndex + 1).catch(() => undefined);
                replacePlace(placeIndex, candidate);
                navigate(ROUTES.courseMap, { state: { replacementMessage: `${current.title}을(를) ${candidate.title}(으)로 바꿨어요.` } });
              }}
            >
              교체
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}
