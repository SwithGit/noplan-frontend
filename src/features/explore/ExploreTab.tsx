import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchExploreCourses, toggleCourseLike } from '../../api/exploreApi';
import ExploreDetailModal from '../../components/ExploreDetailModal';
import { Chip } from '../../components/ui/Chip';
import { PlaceVisual } from '../../components/ui/PlaceVisual';
import type { ExploreCourse } from '../../types/noplan';
import { courseSearchText, exploreCourseToPlan, parseExploreCoursePlaces } from '../../utils/coursePlan';
import { extractDongFromText, normalizeDongInput } from '../../utils/location';
import { usePlanner } from '../planner/PlannerContext';

const EXPLORE_DONG_STORAGE_KEY = 'noplanExploreDong';

function readSavedDong() {
  try {
    return normalizeDongInput(localStorage.getItem(EXPLORE_DONG_STORAGE_KEY) || '');
  } catch {
    return '';
  }
}

export function ExploreTab() {
  const navigate = useNavigate();
  const { detectCurrentLocation, loadPlan } = usePlanner();
  const [courses, setCourses] = useState<ExploreCourse[]>([]);
  const [sort, setSort] = useState<'likes' | 'views'>('likes');
  const [query, setQuery] = useState('');
  const [dong, setDong] = useState(readSavedDong);
  const [manualDong, setManualDong] = useState('');
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<ExploreCourse | null>(null);
  const didRequestLocation = useRef(false);

  const applyDong = useCallback((nextDong: string) => {
    setDong(nextDong);
    setManualDong('');
    setLocationError('');
    try {
      localStorage.setItem(EXPLORE_DONG_STORAGE_KEY, nextDong);
    } catch {
      // 동네 저장이 막혀 있어도 현재 탐색은 계속한다.
    }
  }, []);

  const locateNeighborhood = useCallback(async (silentWithSavedDong = false) => {
    setLocating(true);
    setLocationError('');

    try {
      const location = await detectCurrentLocation({ updateCondition: false, updateStatus: false });
      const nextDong = extractDongFromText(location.label, location.address);
      if (!nextDong) throw new Error('현재 주소에서 동 정보를 확인하지 못했어요.');
      applyDong(nextDong);
    } catch (error) {
      if (!silentWithSavedDong || !dong) {
        setLocationError(error instanceof Error ? error.message : '현재 동네를 찾지 못했어요.');
      }
    } finally {
      setLocating(false);
    }
  }, [applyDong, detectCurrentLocation, dong]);

  useEffect(() => {
    if (didRequestLocation.current) return;
    didRequestLocation.current = true;
    void locateNeighborhood(true);
  }, [locateNeighborhood]);

  const loadCourses = async () => {
    if (!dong) {
      setCourses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError('');
    try {
      setCourses(await fetchExploreCourses(sort, dong));
    } catch (error) {
      setCourses([]);
      setLoadError(error instanceof Error ? error.message : '공개된 코스를 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCourses();
    // sort가 바뀔 때 실제 정렬 API를 다시 조회한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dong, sort]);

  const applyManualDong = () => {
    const nextDong = normalizeDongInput(manualDong);
    if (!nextDong) {
      setLocationError('연남동처럼 동 단위로 입력해 주세요.');
      return;
    }
    applyDong(nextDong);
  };

  const visibleCourses = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('ko-KR');
    if (!keyword) return courses;
    return courses.filter((course) => courseSearchText(course).includes(keyword));
  }, [courses, query]);

  const applyCourse = (course: ExploreCourse) => {
    const plan = exploreCourseToPlan(course, '둘러보기 코스');
    if (!plan) {
      setMessage('이 코스의 장소 상세 데이터가 없어 사용할 수 없어요.');
      return;
    }
    loadPlan(plan);
    navigate('/course/map');
  };

  const likeCourse = async (course: ExploreCourse) => {
    try {
      const result = await toggleCourseLike(course.id);
      const likes = result.currentLikes ?? course.likes ?? 0;
      setCourses((previous) => previous.map((item) => item.id === course.id ? { ...item, likes } : item));
      setSelectedCourse((previous) => previous?.id === course.id ? { ...previous, likes } : previous);
      setMessage(result.liked ? '좋아요에 담았어요.' : '좋아요를 취소했어요.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '좋아요를 반영하지 못했어요.');
    }
  };

  return (
    <div className="explore-screen">
      <header className="explore-header">
        <div><span className="eyebrow">둘러보기</span><h1>{dong ? `${dong} 주변 코스` : '내 주변 코스'}</h1></div>
      </header>

      <section className="explore-neighborhood" aria-label="탐색 동네">
        <div><span>내 동네</span><strong>{dong ? `${dong} 주변` : locating ? '현재 동네 찾는 중' : '동네를 설정해 주세요'}</strong></div>
        <button disabled={locating} type="button" onClick={() => void locateNeighborhood()}>{locating ? '확인 중' : '현 위치로 설정'}</button>
      </section>

      {(!dong || locationError) && (
        <section className="explore-location-fallback">
          {locationError && <p role="alert">{locationError}</p>}
          <div>
            <input aria-label="탐색할 동네" placeholder="예: 연남동" value={manualDong} onChange={(event) => setManualDong(event.target.value)} />
            <button type="button" onClick={applyManualDong}>동네 적용</button>
          </div>
        </section>
      )}

      <label className="explore-search">
        <span aria-hidden="true" className="line-icon-search" />
        <input aria-label="코스 검색" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="지역, 장소, 태그로 검색" />
      </label>

      <div className="chip-row explore-sort" aria-label="정렬">
        <Chip active={sort === 'likes'} onClick={() => setSort('likes')}>인기순</Chip>
        <Chip active={sort === 'views'} onClick={() => setSort('views')}>조회순</Chip>
      </div>

      {message && <p className="inline-message" role="status">{message}</p>}
      {loading && <section className="list-state-card"><span className="loading-spinner" /><h2>코스를 불러오는 중이에요</h2></section>}
      {!loading && loadError && (
        <section className="list-state-card" role="alert"><h2>코스를 불러오지 못했어요</h2><p>{loadError}</p><button className="primary" type="button" onClick={() => void loadCourses()}>다시 시도</button></section>
      )}
      {!loading && !loadError && dong && courses.length === 0 && (
        <section className="list-state-card"><h2>{dong}에 공개된 코스가 아직 없어요</h2><p>다른 동네를 입력하거나 현 위치를 다시 확인해 주세요.</p></section>
      )}
      {!loading && !loadError && courses.length > 0 && visibleCourses.length === 0 && (
        <section className="list-state-card"><h2>검색 결과가 없어요</h2><p>장소 이름이나 동네 이름으로 다시 검색해 보세요.</p><button type="button" onClick={() => setQuery('')}>검색어 지우기</button></section>
      )}

      <section className="explore-course-list" aria-live="polite">
        {visibleCourses.map((course) => {
          const places = parseExploreCoursePlaces(course);
          const totalMinutes = places.reduce((sum, place) => sum + (place.durationMinutes || 90), 0);
          return (
            <article className="explore-course-card" key={course.id}>
              <button className="course-card-main" type="button" onClick={() => setSelectedCourse(course)}>
                <PlaceVisual alt={places[0]?.name || course.title} color={places[0]?.color || '#eeecff'} imageUrl={course.review_image || places[0]?.imageUrl} type={places[0]?.type} detailType={places[0]?.detailType} />
                <div>
                  <span>{course.location || '홍대입구 주변'}</span>
                  <strong>{course.title}</strong>
                  <p>{places.length ? places.slice(0, 3).map((place) => place.title).join(' → ') : '장소 상세 정보 확인 필요'}</p>
                </div>
              </button>
              <div className="course-card-meta">
                <span>{places.length}곳 · 약 {Math.max(1, Math.round(totalMinutes / 60))}시간</span>
                <span>좋아요 {course.likes || 0} · 조회 {course.views || 0}</span>
              </div>
            </article>
          );
        })}
      </section>

      {selectedCourse && (
        <ExploreDetailModal
          course={selectedCourse}
          onClose={() => setSelectedCourse(null)}
          onLike={() => void likeCourse(selectedCourse)}
          onUseCourse={() => applyCourse(selectedCourse)}
          places={parseExploreCoursePlaces(selectedCourse)}
        />
      )}
    </div>
  );
}
