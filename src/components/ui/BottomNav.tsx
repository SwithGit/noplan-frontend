import { NavLink } from 'react-router-dom';

const items = [
  { to: '/', label: '홈', icon: 'home' },
  { to: '/explore', label: '탐색', icon: 'search' },
  { to: '/course/map', label: '코스', icon: 'route' },
  { to: '/mypage', label: '마이', icon: 'me' },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="하단 메뉴">
      {items.map((item) => (
        <NavLink className={({ isActive }) => (isActive ? 'active' : '')} key={item.to} to={item.to}>
          <span className={`line-icon line-icon-${item.icon}`} />
          <b>{item.label}</b>
        </NavLink>
      ))}
    </nav>
  );
}
