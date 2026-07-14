import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppTopBar } from '../../components/ui/AppTopBar';
import { Chip } from '../../components/ui/Chip';
import MapBoard from '../../components/MapBoard';
import { NopiBubble } from '../../components/ui/NopiBubble';
import { PlaceVisual } from '../../components/ui/PlaceVisual';
import { usePlanner } from '../planner/PlannerContext';
import type { CoursePlace } from '../../types/noplan';
import { trackPlaceInteraction } from '../../api/plannerApi';

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

function formatMenuPrice(price?: number | null) {
  return price && price > 0 ? `${price.toLocaleString('ko-KR')}원` : '가격 확인';
}

function openKakaoDestination(place: CoursePlace) {
  trackPlaceInteraction('map_open', place).catch(() => undefined);
  const keyword = encodeURIComponent(place.searchKeyword || place.name || place.title);

  if (hasCoordinates(place)) {
    window.open(`https://map.kakao.com/link/to/${keyword},${place.lat},${place.lng}`, '_blank', 'noopener,noreferrer');
    return;
  }

  window.open(`https://map.kakao.com/link/search/${keyword}`, '_blank', 'noopener,noreferrer');
}

function openKakaoRoute(places: CoursePlace[]) {
  const routePlaces = places.filter(hasCoordinates);
  if (routePlaces.length < 2) {
    const first = places[0];
    if (first) openKakaoDestination(first);
    return;
  }

  const path = routePlaces
    .map((place) => `${encodeURIComponent(place.searchKeyword || place.name || place.title)},${place.lat},${place.lng}`)
    .join('/');

  window.open(`https://map.kakao.com/link/by/walk/${path}`, '_blank', 'noopener,noreferrer');
}

export function CourseMapScreen() {
  const navigate = useNavigate();
  const { condition, plan } = usePlanner();
  const firstPlace = plan.courseData[0];
  const locationText = compactCourseLocation(plan.location, condition.locationLabel);

  return (
    <div className="course-screen">
      <AppTopBar title={plan.title} subtitle={`${locationText} · ${plan.durationText}`} />

      <section className="route-map-panel real-map-panel">
        <MapBoard courseList={plan.courseData} userLocation={plan.location} />
      </section>

      <NopiBubble
        compact
        title="이 순서가 가장 편해 보여."
        body={`${firstPlace?.title || '첫 장소'}부터 시작하면 이동이 짧고 분위기도 자연스럽게 이어져.`}
      />

      <section className="route-list">
        {plan.courseData.map((place, index) => (
          <article className="route-item" key={place.id}>
            <PlaceVisual alt={place.name} color={place.color} imageUrl={place.imageUrl} label={String(index + 1)} />
            <div>
              <span>{index + 1}번째 장소</span>
              <strong>{place.title}</strong>
              <p>{place.summary}</p>
            </div>
            <button type="button" onClick={() => navigate(`/course/place/${index}`)}>
              보기
            </button>
          </article>
        ))}
      </section>

      <div className="sticky-actions">
        <button type="button" onClick={() => navigate('/planner/result')}>
          결과로
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
  const { plan } = usePlanner();
  const place = placeAt(plan.courseData, index);
  const placeIndex = Math.max(Number(index || 0), 0);
  const nextPlace = plan.courseData[placeIndex + 1];

  useEffect(() => {
    if (!place) return;
    trackPlaceInteraction('place_detail_open', place, placeIndex + 1).catch(() => undefined);
    if (place.galleryImages?.length) trackPlaceInteraction('gallery_open', place, placeIndex + 1).catch(() => undefined);
    if (place.menuItems?.length) trackPlaceInteraction('menu_view', place, placeIndex + 1).catch(() => undefined);
  }, [place, placeIndex]);

  return (
    <div className="place-detail-screen">
      <AppTopBar title={place.title} subtitle={place.category || place.type} />

      <section className="place-hero">
        <PlaceVisual alt={place.name} color={place.color} imageUrl={place.imageUrl} label={String(placeIndex + 1)} />
        <div>
          <span>{place.moveText}</span>
          <h1>{place.title}</h1>
          <p>{place.description}</p>
        </div>
      </section>

      {Boolean(place.galleryImages?.length) && (
        <section className="place-gallery" aria-label="장소 사진">
          {place.galleryImages!.slice(0, 6).map((image, imageIndex) => (
            <img alt={`${place.name} ${image.imageType || '사진'} ${imageIndex + 1}`} key={`${image.imageUrl}-${imageIndex}`} loading="lazy" src={image.thumbnailUrl || image.imageUrl} />
          ))}
        </section>
      )}

      <div className="chip-row">
        {place.tags.map((tag) => (
          <Chip active key={tag}>
            {tag}
          </Chip>
        ))}
      </div>

      <NopiBubble title="여기를 고른 이유" body={place.reason} compact />

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
                <b>{formatMenuPrice(menu.price)}</b>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="sticky-actions">
        <button type="button" onClick={() => navigate(`/course/replace/${placeIndex}`)}>
          바꾸기
        </button>
        <button className="primary" type="button" onClick={() => openKakaoDestination(place)}>
          길찾기
        </button>
      </div>
    </div>
  );
}

export function ReplacementCandidates() {
  const navigate = useNavigate();
  const { index } = useParams();
  const placeIndex = Math.max(Number(index || 0), 0);
  const { plan, replacePlace } = usePlanner();
  const current = placeAt(plan.courseData, index);
  const candidates = useMemo(() => {
    const sameType = plan.backupPlaces.filter((place) => place.type === current.type || place.category === current.category);
    return sameType.length ? sameType : plan.backupPlaces;
  }, [current.category, current.type, plan.backupPlaces]);

  return (
    <div className="replacement-screen">
      <AppTopBar title="다른 후보" subtitle={`${current.title} 대신 갈 만한 곳`} />
      <NopiBubble
        title="코스는 하나지만, 장소 하나씩은 바꿀 수 있어."
        body="지금 코스 흐름은 유지하고 해당 자리만 교체해볼게."
        compact
      />

      <section className="candidate-list">
        {candidates.length === 0 && (
          <p className="inline-message warning">백엔드에서 받은 교체 후보가 아직 없어요. 조건을 바꿔 다시 찾아봐줘.</p>
        )}
        {candidates.map((candidate) => (
          <article className="candidate-card" key={candidate.id}>
            <PlaceVisual alt={candidate.name} color={candidate.color} imageUrl={candidate.imageUrl} />
            <div>
              <span>{candidate.category}</span>
              <strong>{candidate.title}</strong>
              <p>{candidate.summary}</p>
              <small>{candidate.reason}</small>
            </div>
            <button
              type="button"
              onClick={() => {
                trackPlaceInteraction('place_replace', candidate, placeIndex + 1).catch(() => undefined);
                replacePlace(placeIndex, candidate);
                navigate('/course/map');
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
