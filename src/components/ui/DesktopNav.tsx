import { Link, NavLink } from 'react-router-dom';
import nopiIcon from '../../assets/nopi/nopi-icon.png';
import { ROUTES } from '../../routes';
import { desktopNavigationItems } from './appNavigation';
import { NavigationIcon } from './NavigationIcon';

export function DesktopNav() {
  return (
    <header className="desktop-header">
      <div className="desktop-header-inner">
        <Link aria-label="NoPlan 홈" className="app-brand" to={ROUTES.appHome}>
          <img alt="" height="40" src={nopiIcon} width="40" />
          <span>noplan<span className="app-brand-caption">일상에서 여행까지</span></span>
        </Link>
        <nav aria-label="상단 메뉴" className="desktop-nav">
          {desktopNavigationItems.map((item) => (
            <NavLink className={({ isActive }) => isActive ? 'active' : ''} end={item.end} key={item.to} to={item.to}>
              <NavigationIcon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <span className="app-service-region"><span aria-hidden="true" />서울에서 만나요</span>
      </div>
    </header>
  );
}
