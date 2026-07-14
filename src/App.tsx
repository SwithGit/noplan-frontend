import { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { getSharedCourse } from './api/courseApi';
import { AppFrame } from './components/ui/AppFrame';
import { CourseMapScreen, PlaceDetailScreen, ReplacementCandidates } from './features/course/CourseScreens';
import { ExploreTab } from './features/explore/ExploreTab';
import { MyPageView } from './features/my/MyPageView';
import { PlannerProvider, usePlanner } from './features/planner/PlannerContext';
import { ChatStart, ConditionConfirm, PlannerHome, ResultScreen, SearchingScreen } from './features/planner/PlannerScreens';
import GoogleCallback from './pages/auth/GoogleCallback';
import GoogleSignup from './pages/auth/GoogleSignup';
import KakaoCallback from './pages/auth/KakaoCallback';
import KakaoSignup from './pages/auth/KakaoSignup';
import Login from './pages/auth/Login';
import NaverCallback from './pages/auth/NaverCallback';
import NaverSignup from './pages/auth/NaverSignup';
import Signup from './pages/auth/Signup';
import Privacy from './pages/Privacy';
import Supporters from './pages/Supporters';
import type { UserSession } from './types/noplan';

const fullPagePaths = [
  '/login',
  '/signup',
  '/auth/kakao/callback',
  '/auth/naver/callback',
  '/auth/google/callback',
  '/kakao-signup',
  '/naver-signup',
  '/google-signup',
  '/privacy',
  '/supporters',
];

function readUserSession(): UserSession | null {
  const raw = window.localStorage.getItem('loggedInUser');
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<UserSession> & { id?: string; nickname?: string };
    const userId = parsed.userId || parsed.id;
    if (!userId) return null;

    return {
      userId,
      userNick: parsed.userNick || parsed.nickname || userId,
      profileURL: parsed.profileURL || '',
    };
  } catch {
    return null;
  }
}

function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const { loadPlan } = usePlanner();
  const [user, setUser] = useState<UserSession | null>(() => readUserSession());

  useEffect(() => {
    setUser(readUserSession());
  }, [location.pathname]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const seq = Number(params.get('seq') || 0);
    const type = params.get('type') || 'saved';

    if (!seq) return;

    getSharedCourse(seq, type).then((shared) => {
      if (!shared) return;

      loadPlan({
        id: seq,
        title: shared.title,
        location: shared.location,
        durationText: `${shared.data.length}곳 · 공유 코스`,
        courseData: shared.data,
        backupPlaces: shared.data,
      });
      navigate('/course/map', { replace: true });
    });
  }, [loadPlan, location.search, navigate]);

  const hideNav = useMemo(
    () =>
      location.pathname.startsWith('/planner') ||
      location.pathname.startsWith('/course/place') ||
      location.pathname.startsWith('/course/replace'),
    [location.pathname],
  );

  const fullPage = fullPagePaths.includes(location.pathname);

  const routes = (
    <Routes>
      <Route path="/" element={<PlannerHome />} />
      <Route path="/planner/chat" element={<ChatStart />} />
      <Route path="/planner/condition" element={<ConditionConfirm />} />
      <Route path="/planner/searching" element={<SearchingScreen />} />
      <Route path="/planner/result" element={<ResultScreen />} />
      <Route path="/course/map" element={<CourseMapScreen />} />
      <Route path="/course/place/:index" element={<PlaceDetailScreen />} />
      <Route path="/course/replace/:index" element={<ReplacementCandidates />} />
      <Route path="/explore" element={<ExploreTab />} />
      <Route path="/mypage" element={<MyPageView onLogout={() => {
        window.localStorage.removeItem('loggedInUser');
        setUser(null);
        navigate('/');
      }} user={user} />} />
      <Route path="/chatbot" element={<Navigate replace to="/planner/chat" />} />

      <Route path="/login" element={<Login onGoToSignup={() => navigate('/signup')} onLoginSuccess={(id, profileURL, userNick) => {
        const nextUser = { userId: id, userNick, profileURL: profileURL || '' };
        window.localStorage.setItem('loggedInUser', JSON.stringify(nextUser));
        setUser(nextUser);
        navigate('/');
      }} />} />
      <Route path="/signup" element={<Signup onGoToLogin={() => navigate('/login')} />} />
      <Route path="/auth/kakao/callback" element={<KakaoCallback />} />
      <Route path="/auth/naver/callback" element={<NaverCallback />} />
      <Route path="/auth/google/callback" element={<GoogleCallback />} />
      <Route path="/kakao-signup" element={<KakaoSignup />} />
      <Route path="/naver-signup" element={<NaverSignup />} />
      <Route path="/google-signup" element={<GoogleSignup />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/supporters" element={<Supporters />} />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  );

  return fullPage ? routes : <AppFrame hideNav={hideNav}>{routes}</AppFrame>;
}

export default function App() {
  return (
    <PlannerProvider>
      <AppRoutes />
    </PlannerProvider>
  );
}
