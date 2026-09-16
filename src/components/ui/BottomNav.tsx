import { NavLink } from 'react-router-dom';
import { appNavigationItems } from './appNavigation';
import { NavigationIcon } from './NavigationIcon';

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="하단 메뉴">
      {appNavigationItems.map((item) => (
        <NavLink className={({ isActive }) => (isActive ? 'active' : '')} end={item.end} key={item.to} to={item.to}>
          <NavigationIcon name={item.icon} />
          <b>{item.label}</b>
        </NavLink>
      ))}
    </nav>
  );
}
