export const ROUTES = {
  landing: '/',
  landingPreview: '/landing-preview',
  appHome: '/app',
  quickHome: '/app/quick',
  trips: '/app/trips',
  newTrip: '/app/trips/new',
  events: '/app/events',
  plannerChat: '/app/planner/chat',
  plannerCondition: '/app/planner/condition',
  plannerSearching: '/app/planner/searching',
  plannerResult: '/app/planner/result',
  explore: '/app/explore',
  courseMap: '/app/course/map',
  myPage: '/app/mypage',
  myCourses: '/app/mypage/courses',
  favorites: '/app/favorites',
  login: '/app/login',
  signup: '/app/signup',
  kakaoSignup: '/app/kakao-signup',
  naverSignup: '/app/naver-signup',
  googleSignup: '/app/google-signup',
  kakaoCallback: '/auth/kakao/callback',
  naverCallback: '/auth/naver/callback',
  googleCallback: '/auth/google/callback',
  privacy: '/privacy',
  supporters: '/supporters',
  placeAdmin: '/admin/places',
  placeAdminMap: '/admin/places/map',
} as const;

export const coursePlaceRoute = (index: number | string) => `/app/course/place/${index}`;

export const courseReplaceRoute = (index: number | string) => `/app/course/replace/${index}`;

export const tripRoute = (id: string) => `/app/trips/${encodeURIComponent(id)}`;
export const eventRoute = (id: string) => `/app/events/${encodeURIComponent(id)}`;
