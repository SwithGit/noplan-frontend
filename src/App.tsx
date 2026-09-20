import { NearbyPlaces } from './features/mobile/NearbyPlaces';
import { useLocale } from './i18n/locale';
import { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { getSharedCourse } from './api/courseApi';
import { fetchAuthSession, logoutSession } from './api/authApi';
import { AppFrame } from './components/ui/AppFrame';
import { CourseMapScreen, PlaceDetailScreen, ReplacementCandidates } from './features/course/CourseScreens';
import { ExploreEntry, MyEntry } from './features/mobile/MobileEntries';
import { MobileFavorites } from './features/mobile/MobileFavorites';
import { MobileRoute } from './features/mobile/MobileRoute';
import { useDesktop } from './features/mobile/useDesktop';
import { FavoritesProvider } from './features/mobile/FavoritesProvider';
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
import LegalPage from './pages/legal/LegalPage';
import PrivacyArchive from './pages/legal/PrivacyArchive';
import Supporters from './pages/Supporters';
import PlaceAdmin from './pages/admin/PlaceAdmin';
import PlaceMapAdmin from './pages/admin/PlaceMapAdmin';
import LandingPage from './pages/landing/LandingPage';
import { ROUTES, coursePlaceRoute, courseReplaceRoute } from './routes';
import { HomeEntry } from './features/trips/HomeEntry';
import { TripHome } from './features/trips/TripHome';
import { TripCreatePage } from './features/trips/TripCreatePage';
import { TripWorkspace } from './features/trips/TripWorkspace';
import { PENDING_TRIP_INVITE, TripJoin } from './features/trips/TripSharing';
import { TripPublicView } from './features/trips/TripPublicView';
import { readPendingTripCreation } from './features/trips/pendingTripCreation';
import { EventsPage } from './features/events/EventsPage';
import { EventDetail } from './features/events/EventDetail';
import type { UserSession } from './types/noplan';

const appFullPagePaths = [
  ROUTES.login,
  ROUTES.signup,
  ROUTES.kakaoSignup,
  ROUTES.naverSignup,
  ROUTES.googleSignup,
] as const;

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

function PreserveRedirect({ to }: { to: string }) {
  const location = useLocation();
  return <Navigate replace state={location.state} to={`${to}${location.search}${location.hash}`} />;
}

function LegacyCoursePlaceRedirect() {
  const { index = '' } = useParams();
  return <PreserveRedirect to={coursePlaceRoute(index)} />;
}

function LegacyCourseReplaceRedirect() {
  const { index = '' } = useParams();
  return <PreserveRedirect to={courseReplaceRoute(index)} />;
}

function LandingEntry() {
  const location = useLocation();
  const seq = Number(new URLSearchParams(location.search).get('seq') || 0);

  if (seq > 0) return <PreserveRedirect to={ROUTES.courseMap} />;
  return <LandingPage />;
}

function TripRouteEntry({ user }: { user: UserSession | null }) {
  const { id } = useParams();
  return <TripWorkspace key={`${user?.userId || 'guest'}:${id}`} user={user} />;
}

function AppRoutes() {
  useLocale();
  const desktop = useDesktop();
  const location = useLocation();
  const navigate = useNavigate();
  const { loadPlan } = usePlanner();
  const [user, setUser] = useState<UserSession | null>(() => readUserSession());

  useEffect(() => {
    if (!user || location.pathname !== ROUTES.appHome) return;
    if (readPendingTripCreation()) { navigate(`${ROUTES.newTrip}?resume=1`, { replace: true }); return; }
    try {
      const token = sessionStorage.getItem(PENDING_TRIP_INVITE);
      if (token && /^[a-zA-Z0-9_-]{43}$/.test(token)) navigate(`${ROUTES.tripJoin}#${token}`, { replace: true });
    } catch { /* A user can reopen the original invitation if session storage is unavailable. */ }
  }, [user, location.pathname, navigate]);

  useEffect(() => {
    const syncUser = () => setUser(readUserSession());
    window.addEventListener('storage', syncUser);
    return () => window.removeEventListener('storage', syncUser);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchAuthSession().then((session) => {
      if (cancelled) return;
      if (session === undefined) return;
      if (!session) window.localStorage.removeItem('loggedInUser');
      setUser(session);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (desktop || location.pathname !== ROUTES.courseMap) return;

    const params = new URLSearchParams(location.search);
    const seq = Number(params.get('seq') || 0);
    const type = params.get('type') || 'saved';

    if (!seq) return;

    let cancelled = false;
    const showShareError = () => {
      if (cancelled) return;
      navigate(`${ROUTES.courseMap}${location.search}`, {
        replace: true,
        state: { sharedCourseError: true },
      });
    };

    getSharedCourse(seq, type).then((shared) => {
      if (cancelled) return;
      if (!shared) {
        showShareError();
        return;
      }

      loadPlan({
        id: seq,
        title: shared.title,
        location: shared.location,
        durationText: `${shared.data.length}곳 · 공유 코스`,
        courseData: shared.data,
        backupPlaces: shared.data,
      });
      navigate(ROUTES.courseMap, { replace: true });
    }).catch(showShareError);

    return () => {
      cancelled = true;
    };
  }, [desktop, loadPlan, location.pathname, location.search, navigate]);

  const hideNav = useMemo(
    () =>
      location.pathname.startsWith('/app/planner') ||
      location.pathname.startsWith('/app/course/place') ||
      location.pathname.startsWith('/app/course/replace'),
    [location.pathname],
  );

  const fullPage = !location.pathname.startsWith('/app') || appFullPagePaths.includes(location.pathname as (typeof appFullPagePaths)[number]);

  const routes = (
    <Routes>
      <Route path={ROUTES.landing} element={<LandingEntry />} />
      {import.meta.env.DEV && <Route path={ROUTES.landingPreview} element={<LandingPage />} />}

      <Route path={ROUTES.appHome} element={<HomeEntry user={user} />} />
      <Route path={ROUTES.trips} element={<TripHome key={user?.userId || 'guest'} user={user} libraryOnly />} />
      <Route path={ROUTES.newTrip} element={<TripCreatePage key={user?.userId || 'guest'} user={user} />} />
      <Route path={ROUTES.tripShared} element={<TripPublicView />} />
      <Route path={ROUTES.events} element={<EventsPage />} />
      <Route path="/app/events/:id" element={<EventDetail user={user} />} />
      <Route path="/app/trips/:id" element={<TripRouteEntry user={user} />} />
      <Route path={ROUTES.tripJoin} element={<TripJoin user={user} />} />
      <Route path={ROUTES.explore} element={<ExploreEntry />} />
      <Route path={ROUTES.nearbyPlaces} element={<NearbyPlaces />} />
      <Route path={ROUTES.favorites} element={<MobileFavorites />} />
      <Route element={<MobileRoute />}>
        <Route path={ROUTES.quickHome} element={<PlannerHome />} />
        <Route path={ROUTES.plannerChat} element={<ChatStart />} />
        <Route path={ROUTES.plannerCondition} element={<ConditionConfirm />} />
        <Route path={ROUTES.plannerSearching} element={<SearchingScreen />} />
        <Route path={ROUTES.plannerResult} element={<ResultScreen />} />
        <Route path={ROUTES.courseMap} element={<CourseMapScreen />} />
        <Route path="/app/course/place/:index" element={<PlaceDetailScreen />} />
        <Route path="/app/course/replace/:index" element={<ReplacementCandidates />} />
        <Route path={ROUTES.myCourses} element={<MyPageView user={user} onLogout={() => {void logoutSession().finally(()=>{setUser(null);navigate(ROUTES.appHome);});}}/>}/>
      </Route>
      <Route path={ROUTES.myPage} element={<MyEntry onLogout={() => {
        void logoutSession().finally(() => {
          setUser(null);
          navigate(ROUTES.appHome);
        });
      }} user={user} />} />

      <Route path={ROUTES.login} element={<Login onGoToSignup={() => navigate(ROUTES.signup)} onLoginSuccess={(id, profileURL, userNick) => {
        const nextUser = { userId: id, userNick, profileURL: profileURL || '' };
        window.localStorage.setItem('loggedInUser', JSON.stringify(nextUser));
        setUser(nextUser);
        navigate(ROUTES.appHome);
      }} />} />
      <Route path={ROUTES.signup} element={<Signup onGoToLogin={() => navigate(ROUTES.login)} />} />
      <Route path={ROUTES.kakaoSignup} element={<KakaoSignup />} />
      <Route path={ROUTES.naverSignup} element={<NaverSignup />} />
      <Route path={ROUTES.googleSignup} element={<GoogleSignup />} />

      <Route path={ROUTES.kakaoCallback} element={<KakaoCallback />} />
      <Route path={ROUTES.naverCallback} element={<NaverCallback />} />
      <Route path={ROUTES.googleCallback} element={<GoogleCallback />} />
      <Route path={ROUTES.privacy} element={<Privacy />} />
      <Route path={ROUTES.terms} element={<LegalPage documentId="terms" />} />
      <Route path={ROUTES.privacyConsent} element={<LegalPage documentId="privacyConsent" />} />
      <Route path={ROUTES.marketingConsent} element={<LegalPage documentId="marketing" />} />
      <Route path={ROUTES.privacyArchive} element={<PrivacyArchive />} />
      <Route path={ROUTES.supporters} element={<Supporters />} />
      <Route path={ROUTES.placeAdmin} element={<PlaceAdmin />} />
      <Route path={ROUTES.placeAdminMap} element={<PlaceMapAdmin />} />

      <Route path="/planner/chat" element={<PreserveRedirect to={ROUTES.plannerChat} />} />
      <Route path="/planner/condition" element={<PreserveRedirect to={ROUTES.plannerCondition} />} />
      <Route path="/planner/searching" element={<PreserveRedirect to={ROUTES.plannerSearching} />} />
      <Route path="/planner/result" element={<PreserveRedirect to={ROUTES.plannerResult} />} />
      <Route path="/explore" element={<PreserveRedirect to={ROUTES.explore} />} />
      <Route path="/course/map" element={<PreserveRedirect to={ROUTES.courseMap} />} />
      <Route path="/course/place/:index" element={<LegacyCoursePlaceRedirect />} />
      <Route path="/course/replace/:index" element={<LegacyCourseReplaceRedirect />} />
      <Route path="/mypage" element={<PreserveRedirect to={ROUTES.myPage} />} />
      <Route path="/chatbot" element={<PreserveRedirect to={ROUTES.plannerChat} />} />
      <Route path="/login" element={<PreserveRedirect to={ROUTES.login} />} />
      <Route path="/signup" element={<PreserveRedirect to={ROUTES.signup} />} />
      <Route path="/kakao-signup" element={<PreserveRedirect to={ROUTES.kakaoSignup} />} />
      <Route path="/naver-signup" element={<PreserveRedirect to={ROUTES.naverSignup} />} />
      <Route path="/google-signup" element={<PreserveRedirect to={ROUTES.googleSignup} />} />

      <Route path="*" element={<Navigate replace to={location.pathname.startsWith('/app/') ? ROUTES.appHome : ROUTES.landing} />} />
    </Routes>
  );

  return <FavoritesProvider key={user?.userId || 'guest'} user={user}>{fullPage ? routes : <AppFrame hideNav={hideNav}>{routes}</AppFrame>}</FavoritesProvider>;
}

export default function App() {
  return (
    <PlannerProvider>
      <AppRoutes />
    </PlannerProvider>
  );
}
