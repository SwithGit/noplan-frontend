export const ROUTES = {
  landing: '/',
  landingPreview: '/landing-preview',
  appHome: '/app',
  plannerChat: '/app/planner/chat',
  plannerCondition: '/app/planner/condition',
  plannerSearching: '/app/planner/searching',
  plannerResult: '/app/planner/result',
  explore: '/app/explore',
  courseMap: '/app/course/map',
  myPage: '/app/mypage',
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
} as const;

export const coursePlaceRoute = (index: number | string) => `/app/course/place/${index}`;

export const courseReplaceRoute = (index: number | string) => `/app/course/replace/${index}`;
