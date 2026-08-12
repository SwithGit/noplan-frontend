import { NavLink } from 'react-router-dom';
import { ROUTES } from '../../routes';

const items = [
  { to: ROUTES.appHome, label: '홈', icon: 'home', end: true },
  { to: ROUTES.explore, label: '탐색', icon: 'search' },
  { to: ROUTES.courseMap, label: '코스', icon: 'route' },
  { to: ROUTES.myPage, label: '마이', icon: 'me' },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="하단 메뉴">
      {items.map((item) => (
        <NavLink className={({ isActive }) => (isActive ? 'active' : '')} end={item.end} key={item.to} to={item.to}>
          <span className={`line-icon line-icon-${item.icon}`} />
          <b>{item.label}</b>
        </NavLink>
      ))}
    </nav>
  );
}
