import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMyCourses, fetchUserInfo } from '../../api/myPageApi';
import { Chip } from '../../components/ui/Chip';
import { PlaceVisual } from '../../components/ui/PlaceVisual';
import type { ExploreCourse, MyPageSummary, UserSession } from '../../types/noplan';

interface MyPageViewProps {
  onLogout: () => void;
  user: UserSession | null;
}

type MyTab = 'saved' | 'recent' | 'visited';

const emptyCourses: ExploreCourse[] = [
  {
    id: 901,
    title: '아직 저장한 코스가 없어요',
    location: '탐색에서 마음에 드는 코스를 찾아봐요',
    likes: 0,
    views: 0,
  },
];

export function MyPageView({ onLogout, user }: MyPageViewProps) {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<MyPageSummary>({});
  const [savedCourses, setSavedCourses] = useState<ExploreCourse[]>([]);
  const [recentCourses, setRecentCourses] = useState<ExploreCourse[]>([]);
  const [activeTab, setActiveTab] = useState<MyTab>('saved');

  useEffect(() => {
    if (!user?.userId) return;

    let cancelled = false;

    Promise.all([fetchUserInfo(user.userId), fetchMyCourses(user.userId)]).then(([nextSummary, courses]) => {
      if (cancelled) return;
      setSummary(nextSummary);
      setSavedCourses(courses.saved);
      setRecentCourses(courses.recent);
    });

    return () => {
      cancelled = true;
    };
  }, [user?.userId]);

  const visibleCourses = useMemo(() => {
    if (activeTab === 'saved') return savedCourses.length ? savedCourses : emptyCourses;
    if (activeTab === 'recent') return recentCourses.length ? recentCourses : emptyCourses;

    return emptyCourses;
  }, [activeTab, recentCourses, savedCourses]);

  if (!user) {
    return (
      <div className="my-screen">
        <section className="login-empty">
          <PlaceVisual color="#E1F0FF" />
          <h1>내 코스를 모아보려면 로그인이 필요해요.</h1>
          <p>저장한 코스, 최근 본 코스, 방문 기록을 한 곳에서 볼 수 있어요.</p>
          <button className="primary-bottom-button static" type="button" onClick={() => navigate('/login')}>
            로그인하기
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="my-screen">
      <section className="profile-panel">
        <div className="profile-avatar">
          {user.profileURL ? <img alt="" src={user.profileURL} /> : <span>{user.userNick.slice(0, 1)}</span>}
        </div>
        <div>
          <span className="eyebrow">마이</span>
          <h1>{user.userNick}님</h1>
          <p>{summary.email || user.userId}</p>
        </div>
        <button type="button" onClick={onLogout}>
          로그아웃
        </button>
      </section>

      <section className="point-strip">
        <article>
          <span>포인트</span>
          <strong>{summary.point || 0}P</strong>
        </article>
        <article>
          <span>여행 성향</span>
          <strong>{summary.travelStyle || '아직 없음'}</strong>
        </article>
      </section>

      <div className="chip-row">
        <Chip active={activeTab === 'saved'} onClick={() => setActiveTab('saved')}>
          저장
        </Chip>
        <Chip active={activeTab === 'recent'} onClick={() => setActiveTab('recent')}>
          최근
        </Chip>
        <Chip active={activeTab === 'visited'} onClick={() => setActiveTab('visited')}>
          방문
        </Chip>
      </div>

      <section className="my-course-list">
        {visibleCourses.map((course) => (
          <article className="my-course-card" key={course.id}>
            <PlaceVisual color="#FFF0D8" />
            <div>
              <span>{course.location || 'NoPlan'}</span>
              <strong>{course.title}</strong>
              <p>좋아요 {course.likes || 0} · 조회 {course.views || 0}</p>
            </div>
            <button type="button" onClick={() => navigate('/explore')}>
              보기
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}
