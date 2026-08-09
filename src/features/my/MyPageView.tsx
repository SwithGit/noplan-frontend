import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSharedCourse } from '../../api/courseApi';
import { fetchMyCourses, fetchUserInfo } from '../../api/myPageApi';
import nopiIconImage from '../../assets/nopi/nopi-icon.png';
import { PlaceVisual } from '../../components/ui/PlaceVisual';
import type { CoursePlan, ExploreCourse, MyPageSummary, UserSession } from '../../types/noplan';
import { exploreCourseToPlan, parseExploreCoursePlaces } from '../../utils/coursePlan';
import { usePlanner } from '../planner/PlannerContext';

interface MyPageViewProps {
  onLogout: () => void;
  user: UserSession | null;
}

type CourseListType = 'saved' | 'recent';

export function MyPageView({ onLogout, user }: MyPageViewProps) {
  const navigate = useNavigate();
  const { loadPlan } = usePlanner();
  const [summary, setSummary] = useState<MyPageSummary>({});
  const [savedCourses, setSavedCourses] = useState<ExploreCourse[]>([]);
  const [recentCourses, setRecentCourses] = useState<ExploreCourse[]>([]);
  const [loading, setLoading] = useState(false);
  const [openingCourseId, setOpeningCourseId] = useState<number | null>(null);
  const [courseErrors, setCourseErrors] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!user?.userId) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([fetchUserInfo(user.userId), fetchMyCourses(user.userId)]).then(([nextSummary, courses]) => {
      if (cancelled) return;
      setSummary(nextSummary);
      setSavedCourses(courses.saved);
      setRecentCourses(courses.recent);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [user?.userId]);

  const openCourse = async (course: ExploreCourse, type: CourseListType) => {
    setOpeningCourseId(course.id);
    setCourseErrors((previous) => ({ ...previous, [course.id]: '' }));

    try {
      let plan = exploreCourseToPlan(course, type === 'saved' ? '저장한 코스' : '최근 본 코스');
      if (!plan) {
        const shared = await getSharedCourse(course.id, type);
        if (shared?.data?.length) {
          plan = {
            id: course.id,
            title: shared.title,
            location: shared.location,
            durationText: `${shared.data.length}곳 · ${type === 'saved' ? '저장한 코스' : '최근 본 코스'}`,
            courseData: shared.data,
            backupPlaces: [],
            source: 'api',
          } satisfies CoursePlan;
        }
      }

      if (!plan) throw new Error('코스 상세 데이터가 없어요.');
      loadPlan(plan);
      navigate('/course/map');
    } catch (error) {
      setCourseErrors((previous) => ({
        ...previous,
        [course.id]: error instanceof Error ? error.message : '코스를 불러오지 못했어요.',
      }));
    } finally {
      setOpeningCourseId(null);
    }
  };

  if (!user) {
    return (
      <div className="my-screen logged-out-my-screen">
        <section className="login-empty">
          <img alt="" className="login-nopi" src={nopiIconImage} />
          <span className="eyebrow">내 코스 보관함</span>
          <h1>마음에 든 코스를 다시 만나세요</h1>
          <p>로그인하면 추천 기록과 저장한 코스를 한곳에서 이어볼 수 있어요.</p>
          <button className="primary-bottom-button static" type="button" onClick={() => navigate('/login')}>로그인하기</button>
        </section>
        <section className="login-benefits" aria-label="로그인 혜택">
          <article><strong>저장</strong><span>마음에 든 코스를 보관해요</span></article>
          <article><strong>이어보기</strong><span>최근 본 코스를 다시 열어요</span></article>
          <article><strong>한곳에서</strong><span>내 코스 기록을 모아봐요</span></article>
        </section>
      </div>
    );
  }

  const renderCourseSection = (title: string, courses: ExploreCourse[], type: CourseListType) => (
    <section className="my-course-section">
      <div className="my-section-heading"><h2>{title}</h2><span>{courses.length}개</span></div>
      {loading ? (
        <div className="list-state-card compact"><span className="loading-spinner" /><p>코스를 불러오는 중이에요</p></div>
      ) : courses.length === 0 ? (
        <div className="my-empty-state"><p>{type === 'saved' ? '저장한 코스가 아직 없어요.' : '최근 본 코스가 아직 없어요.'}</p>{type === 'saved' && <button type="button" onClick={() => navigate('/explore')}>코스 둘러보기</button>}</div>
      ) : (
        <div className="my-course-list">
          {courses.map((course) => {
            const places = parseExploreCoursePlaces(course);
            const error = courseErrors[course.id];
            return (
              <article className="my-course-card" key={`${type}-${course.id}`}>
                <PlaceVisual alt={places[0]?.name || course.title} color={places[0]?.color || '#eeecff'} imageUrl={course.review_image || places[0]?.imageUrl} type={places[0]?.type} detailType={places[0]?.detailType} />
                <div><span>{course.location || '홍대입구 주변'}</span><strong>{course.title}</strong><p>{places.length ? `${places.length}곳 · ${places.slice(0, 2).map((place) => place.title).join(' → ')}` : '상세 정보 불러오기 필요'}</p>{error && <small role="alert">{error}</small>}</div>
                <button disabled={openingCourseId === course.id} type="button" onClick={() => void openCourse(course, type)}>{openingCourseId === course.id ? '여는 중' : error ? '재시도' : '보기'}</button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );

  return (
    <div className="my-screen">
      <section className="profile-panel">
        <div className="profile-avatar">{user.profileURL ? <img alt="" src={user.profileURL} /> : <span>{user.userNick.slice(0, 1)}</span>}</div>
        <div><span className="eyebrow">마이페이지</span><h1>{user.userNick}님</h1><p>{summary.email || user.userId}</p></div>
      </section>

      {renderCourseSection('저장한 코스', savedCourses, 'saved')}
      {renderCourseSection('최근 본 코스', recentCourses, 'recent')}

      <section className="account-panel">
        <h2>계정</h2>
        <button className="text-action" type="button" onClick={onLogout}>로그아웃</button>
      </section>
    </div>
  );
}
