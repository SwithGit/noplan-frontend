import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSharedCourse } from '../../api/courseApi';
import { publishExploreCourse } from '../../api/exploreApi';
import { fetchMyCourses, fetchUserInfo } from '../../api/myPageApi';
import nopiIconImage from '../../assets/nopi/nopi-icon.png';
import { PlaceVisual } from '../../components/ui/PlaceVisual';
import type { CoursePlan, ExploreCourse, MyPageSummary, UserSession } from '../../types/noplan';
import { exploreCourseToPlan, parseExploreCoursePlaces } from '../../utils/coursePlan';
import { extractDongFromText, normalizeDongInput } from '../../utils/location';
import { usePlanner } from '../planner/PlannerContext';
import { ROUTES } from '../../routes';

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
  const [activeTab, setActiveTab] = useState<CourseListType>('saved');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [openingCourseId, setOpeningCourseId] = useState<number | null>(null);
  const [publishingCourse, setPublishingCourse] = useState<ExploreCourse | null>(null);
  const [publishDong, setPublishDong] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState('');
  const [courseErrors, setCourseErrors] = useState<Record<number, string>>({});
  const listRef = useRef<HTMLElement>(null);
  const publishInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (publishingCourse) publishInputRef.current?.focus();
  }, [publishingCourse]);

  useEffect(() => {
    if (!publishingCourse) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !publishing) {
        setPublishingCourse(null);
        setPublishMessage('');
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [publishing, publishingCourse]);

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
      navigate(ROUTES.courseMap);
    } catch (error) {
      setCourseErrors((previous) => ({
        ...previous,
        [course.id]: error instanceof Error ? error.message : '코스를 불러오지 못했어요.',
      }));
    } finally {
      setOpeningCourseId(null);
    }
  };

  const openPublishDialog = (course: ExploreCourse) => {
    const places = parseExploreCoursePlaces(course);
    const inferredDong = extractDongFromText(
      course.location_dong,
      course.location,
      ...places.map((place) => place.address),
    );
    setPublishingCourse(course);
    setPublishDong(inferredDong);
    setPublishMessage('');
  };

  const closePublishDialog = () => {
    if (publishing) return;
    setPublishingCourse(null);
    setPublishMessage('');
  };

  const submitPublish = async () => {
    if (!publishingCourse) return;
    const nextDong = normalizeDongInput(publishDong);
    if (!nextDong) {
      setPublishMessage('연남동처럼 동 단위로 입력해 주세요.');
      return;
    }

    setPublishing(true);
    setPublishMessage('');
    try {
      const result = await publishExploreCourse(publishingCourse.id, nextDong);
      if (!result.success) throw new Error(result.message || '탐색 등록 결과를 확인해 주세요.');
      setSavedCourses((previous) => previous.map((course) => (
        course.id === publishingCourse.id
          ? { ...course, is_public: true, location_dong: result.locationDong || nextDong }
          : course
      )));
      setPublishingCourse(null);
      setPublishMessage(`${nextDong} 탐색에 코스를 등록했어요.`);
    } catch (error) {
      setPublishMessage(error instanceof Error ? error.message : '탐색에 등록하지 못했어요.');
    } finally {
      setPublishing(false);
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
          <button className="primary-bottom-button static" type="button" onClick={() => navigate(ROUTES.login)}>로그인하기</button>
        </section>
        <section className="login-benefits" aria-label="로그인 혜택">
          <article><strong>저장</strong><span>마음에 든 코스를 보관해요</span></article>
          <article><strong>이어보기</strong><span>최근 본 코스를 다시 열어요</span></article>
          <article><strong>한곳에서</strong><span>내 코스 기록을 모아봐요</span></article>
        </section>
      </div>
    );
  }

  const activeCourses = activeTab === 'saved' ? savedCourses : recentCourses;
  const selectTab = (tab: CourseListType) => {
    setActiveTab(tab);
    window.requestAnimationFrame(() => listRef.current?.scrollIntoView({ block: 'start' }));
  };

  return (
    <div className="my-screen">
      <header className="my-compact-header">
        <div className="my-title-row"><h1>마이</h1><button type="button" onClick={() => setSettingsOpen((open) => !open)}>설정</button></div>
        <div className="my-profile-row">
          <div className="profile-avatar">{user.profileURL ? <img alt="" src={user.profileURL} /> : <span>{user.userNick.slice(0, 1)}</span>}</div>
          <div><strong>{user.userNick}님</strong><p>{summary.email || user.userId}</p></div>
        </div>
        {settingsOpen && (
          <section className="my-settings-panel" aria-label="계정 설정">
            <span>계정 설정</span>
            <button className="text-action" type="button" onClick={onLogout}>로그아웃</button>
          </section>
        )}
      </header>

      <nav aria-label="내 코스 목록" className="my-course-tabs">
        <button aria-pressed={activeTab === 'saved'} className={activeTab === 'saved' ? 'active' : ''} type="button" onClick={() => selectTab('saved')}>
          저장한 코스{savedCourses.length > 0 ? ` ${savedCourses.length}` : ''}
        </button>
        <button aria-pressed={activeTab === 'recent'} className={activeTab === 'recent' ? 'active' : ''} type="button" onClick={() => selectTab('recent')}>
          최근 본 코스{recentCourses.length > 0 ? ` ${recentCourses.length}` : ''}
        </button>
      </nav>

      {publishMessage && !publishingCourse && <p className="inline-message" role="status">{publishMessage}</p>}

      <section className="my-course-section" ref={listRef}>
        {loading ? (
          <div className="list-state-card compact"><span className="loading-spinner" /><p>코스를 불러오는 중이에요</p></div>
        ) : activeCourses.length === 0 ? (
          <div className="my-empty-state">
            <p>{activeTab === 'saved' ? '아직 저장한 코스가 없어요. 탐색에서 마음에 드는 홍대 코스를 찾아보세요.' : '최근 본 코스가 아직 없어요.'}</p>
            {activeTab === 'saved' && <button type="button" onClick={() => navigate(ROUTES.explore)}>탐색으로 이동</button>}
          </div>
        ) : (
          <div className="my-course-list">
            {activeCourses.map((course) => {
              const places = parseExploreCoursePlaces(course);
              const error = courseErrors[course.id];
              return (
                <article className="my-course-card" key={`${activeTab}-${course.id}`}>
                  <PlaceVisual alt={places[0]?.name || course.title} color={places[0]?.color || '#eeecff'} imageUrl={course.review_image || places[0]?.imageUrl} type={places[0]?.type} detailType={places[0]?.detailType} />
                  <div><span>{course.location || '홍대입구 주변'}</span><strong>{course.title}</strong><p>{places.length ? `${places.length}곳 · ${places.slice(0, 2).map((place) => place.title).join(' → ')}` : '상세 정보 불러오기 필요'}</p>{error && <small role="alert">{error}</small>}</div>
                  <div className="my-course-card-actions">
                    <button disabled={openingCourseId === course.id} type="button" onClick={() => void openCourse(course, activeTab)}>{openingCourseId === course.id ? '여는 중' : error ? '재시도' : '코스로 열기'}</button>
                    {activeTab === 'saved' && (
                      <button className="publish" disabled={Boolean(course.is_public)} type="button" onClick={() => openPublishDialog(course)}>
                        {course.is_public ? '탐색 등록됨' : '탐색에 등록'}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {publishingCourse && (
        <div className="publish-course-overlay" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closePublishDialog();
        }}>
          <section aria-labelledby="publish-course-title" aria-modal="true" className="publish-course-dialog" role="dialog">
            <header><div><span>탐색에 등록</span><h2 id="publish-course-title">{publishingCourse.title}</h2></div><button aria-label="닫기" disabled={publishing} type="button" onClick={closePublishDialog}>×</button></header>
            <p>이 코스를 어느 동네 사람들에게 보여줄지 확인해 주세요.</p>
            <label><span>코스 동네</span><input ref={publishInputRef} placeholder="예: 연남동" value={publishDong} onChange={(event) => setPublishDong(event.target.value)} /></label>
            {publishMessage && <p className="inline-message warning" role="alert">{publishMessage}</p>}
            <div className="publish-course-actions"><button disabled={publishing} type="button" onClick={closePublishDialog}>취소</button><button className="primary" disabled={publishing} type="button" onClick={() => void submitPublish()}>{publishing ? '등록 중' : '탐색에 등록'}</button></div>
          </section>
        </div>
      )}
    </div>
  );
}
