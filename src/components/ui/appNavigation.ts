import { ROUTES } from '../../routes';

// Keep navigation destinations shared as the mobile and desktop shells evolve.
// Saved places/courses get their own destination in the next product milestone.
export const appNavigationItems = [
  { to: ROUTES.appHome, label: '홈', desktopLabel: '추천받기', icon: 'home', end: true },
  { to: ROUTES.explore, label: '탐색', desktopLabel: '탐색', icon: 'compass', end: false },
  { to: ROUTES.courseMap, label: '코스', desktopLabel: '내 코스', icon: 'route', end: false },
  { to: ROUTES.myPage, label: '마이', desktopLabel: '마이', icon: 'user', end: false },
] as const;

export type NavigationIconName = (typeof appNavigationItems)[number]['icon'];

export const desktopNavigationItems = [
  { to: ROUTES.appHome, label: '여행 만들기', icon: 'home', end: true },
  { to: ROUTES.trips, label: '내 여행', icon: 'route', end: false },
  { to: ROUTES.explore, label: '탐색', icon: 'compass', end: false },
  { to: ROUTES.quickHome, label: '주변 코스', icon: 'compass', end: false },
  { to: ROUTES.myPage, label: '마이', icon: 'user', end: false },
] as const;
