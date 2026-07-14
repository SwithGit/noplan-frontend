import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchExploreCourses, toggleCourseLike } from '../../api/exploreApi';
import { Chip } from '../../components/ui/Chip';
import { NopiBubble } from '../../components/ui/NopiBubble';
import { PlaceVisual } from '../../components/ui/PlaceVisual';
import { usePlanner } from '../planner/PlannerContext';
import type { CoursePlace, CoursePlan, ExploreCourse } from '../../types/noplan';

const fallbackPlaces: CoursePlace[] = [
  {
    id: 'explore-cafe',
    time: '1',
    title: '차분한 카페',
    name: '차분한 카페',
    type: 'cafe',
    category: '카페',
    summary: '대화하기 좋은 첫 장소',
    description: '조용하고 좌석 여유가 있는 카페예요.',
    reason: '대화 흐름을 시작하기 좋아.',
    moveText: '도보 7분',
    waitText: '낮음',
    moodText: '차분',
    color: '#E1F0FF',
    tags: ['조용한 곳', '실내', '대화'],
  },
  {
    id: 'explore-dessert',
    time: '2',
    title: '디저트 스팟',
    name: '디저트 스팟',
    type: 'dessert',
    category: '디저트',
    summary: '사진 남기기 좋은 마무리',
    description: '가볍게 디저트를 먹으며 마무리하기 좋은 장소예요.',
    reason: '첫 장소와 이동 거리가 짧아.',
    moveText: '도보 9분',
    waitText: '보통',
    moodText: '귀여움',
    color: '#FFF0D8',
    tags: ['디저트', '사진', '짧은 이동'],
  },
];

const fallbackCourses: ExploreCourse[] = [
  {
    id: 101,
    title: '성수 카페 산책 코스',
    location: '성수',
    likes: 124,
    views: 892,
    user_nick: 'Nopi',
    courseData: fallbackPlaces,
  },
  {
    id: 102,
    title: '비 오는 날 실내 코스',
    location: '홍대',
    likes: 88,
    views: 641,
    user_nick: 'NoPlan',
    courseData: fallbackPlaces.map((place) => ({ ...place, id: `${place.id}-rain`, moodText: '실내' })),
  },
];

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function asText(record: Record<string, unknown>, keys: string[], fallback: string) {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim()) return String(value);
  }

  return fallback;
}

function normalizePlace(value: unknown, index: number): CoursePlace {
  const record = toRecord(value);
  const fallback = fallbackPlaces[index % fallbackPlaces.length];
  const title = asText(record, ['title', 'name', 'searchKeyword'], fallback.title);

  return {
    id: asText(record, ['id'], `explore-place-${index}`),
    time: asText(record, ['time'], String(index + 1)),
    title,
    name: asText(record, ['name', 'title'], title),
    type: asText(record, ['type'], fallback.type),
    category: asText(record, ['category'], fallback.category),
    summary: asText(record, ['summary', 'hanjul'], fallback.summary),
    description: asText(record, ['description'], fallback.description),
    address: asText(record, ['address'], ''),
    hours: asText(record, ['hours', 'businessHours'], ''),
    phone: asText(record, ['phone'], ''),
    reason: asText(record, ['reason'], fallback.reason),
    moveText: asText(record, ['moveText'], fallback.moveText),
    waitText: asText(record, ['waitText'], fallback.waitText),
    moodText: asText(record, ['moodText'], fallback.moodText),
    color: index === 0 ? '#E1F0FF' : '#FFF0D8',
    lat: record.lat as number | string | undefined,
    lng: record.lng as number | string | undefined,
    searchKeyword: asText(record, ['searchKeyword', 'name'], title),
    tags: Array.isArray(record.tags) ? record.tags.map(String) : fallback.tags,
  };
}

function parsePlaces(course: ExploreCourse) {
  const rawData = course.courseData || course.course_data;

  if (Array.isArray(rawData)) return rawData.map(normalizePlace);
  if (typeof rawData !== 'string') return fallbackPlaces;

  try {
    const parsed: unknown = JSON.parse(rawData);
    return Array.isArray(parsed) ? parsed.map(normalizePlace) : fallbackPlaces;
  } catch {
    return fallbackPlaces;
  }
}

function makePlan(course: ExploreCourse): CoursePlan {
  const courseData = parsePlaces(course);

  return {
    id: course.id,
    title: course.title,
    location: course.location || '추천 지역',
    durationText: `${courseData.length}곳 · 저장된 코스`,
    courseData,
    backupPlaces: fallbackPlaces,
  };
}

export function ExploreTab() {
  const navigate = useNavigate();
  const { loadPlan } = usePlanner();
  const [courses, setCourses] = useState<ExploreCourse[]>(fallbackCourses);
  const [sort, setSort] = useState<'likes' | 'views'>('likes');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetchExploreCourses(sort).then((nextCourses) => {
      if (!cancelled && nextCourses.length > 0) setCourses(nextCourses);
    });

    return () => {
      cancelled = true;
    };
  }, [sort]);

  const visibleCourses = useMemo(() => {
    const keyword = query.trim();
    if (!keyword) return courses;

    return courses.filter((course) =>
      [course.title, course.location, course.user_nick].filter(Boolean).join(' ').includes(keyword),
    );
  }, [courses, query]);

  const openCourse = (course: ExploreCourse) => {
    loadPlan(makePlan(course));
    navigate('/course/map');
  };

  const likeCourse = async (course: ExploreCourse) => {
    try {
      const result = await toggleCourseLike(course.id);
      setCourses((prev) =>
        prev.map((item) =>
          item.id === course.id ? { ...item, likes: result.currentLikes ?? item.likes ?? 0 } : item,
        ),
      );
      setMessage(result.liked ? '좋아요에 담았어요.' : '좋아요를 취소했어요.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '잠시 후 다시 시도해줘.');
    }
  };

  return (
    <div className="explore-screen">
      <header className="explore-header">
        <div>
          <span className="eyebrow">탐색</span>
          <h1>다른 사람은 어디 갔을까?</h1>
        </div>
        <button aria-label="필터" className="icon-button" type="button">
          <span className="line-icon-filter" />
        </button>
      </header>

      <section className="explore-search">
        <span className="line-icon-search" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="지역, 무드, 코스 검색" />
      </section>

      <div className="chip-row">
        <Chip active={sort === 'likes'} onClick={() => setSort('likes')}>
          인기순
        </Chip>
        <Chip active={sort === 'views'} onClick={() => setSort('views')}>
          조회순
        </Chip>
        <Chip>근처</Chip>
        <Chip>실내</Chip>
      </div>

      <section className="explore-map-card">
        <span className="map-road map-road-a" />
        <span className="map-road map-road-b" />
        <i />
        <b />
      </section>

      <NopiBubble compact title="마음에 드는 코스는 바로 지도에서 열 수 있어." body="내 조건으로 다시 찾기 전, 후보 감 잡는 용도로 좋아." />

      {message && <p className="inline-message">{message}</p>}

      <section className="explore-course-list">
        {visibleCourses.map((course) => {
          const places = parsePlaces(course);

          return (
            <article className="explore-course-card" key={course.id}>
              <button className="course-card-main" type="button" onClick={() => openCourse(course)}>
                <PlaceVisual color={places[0]?.color || '#E1F0FF'} />
                <div>
                  <span>{course.location || '추천'} · {course.user_nick || 'Nopi'}</span>
                  <strong>{course.title}</strong>
                  <p>{places.slice(0, 2).map((place) => place.title).join(' → ')}</p>
                </div>
              </button>
              <div className="course-card-meta">
                <button type="button" onClick={() => likeCourse(course)}>
                  좋아요 {course.likes || 0}
                </button>
                <span>조회 {course.views || 0}</span>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
