import { ROUTES } from '../../routes';

// Mobile navigation: home stays in the center; desktop uses its own ordering below.
export const appNavigationItems = [
  { to: ROUTES.events, label: '문화·행사', desktopLabel: '축제·전시', icon: 'calendar', end: false },
  { to: ROUTES.explore, label: '탐색', desktopLabel: '탐색', icon: 'compass', end: false },
  { to: ROUTES.appHome, label: '홈', desktopLabel: '추천받기', icon: 'home', end: true },
  { to: ROUTES.favorites, label: '찜', desktopLabel: '찜', icon: 'heart', end: false },
  { to: ROUTES.myPage, label: '마이', desktopLabel: '마이', icon: 'user', end: false },
] as const;

export type NavigationIconName = (typeof appNavigationItems)[number]['icon'] | 'route';

export const desktopNavigationItems = [
  { to: ROUTES.events, label: '축제·전시', icon: 'compass', end: false },
  { to: ROUTES.trips, label: '내 여행', icon: 'route', end: false },
] as const;
