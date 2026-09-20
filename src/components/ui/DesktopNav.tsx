import { t as uiText } from '../../i18n/translate';
import { Link, NavLink } from 'react-router-dom';
import { LanguageSelect } from '../../i18n/LanguageSelect';
import nopiIcon from '../../assets/nopi/nopi-icon.png';
import { ROUTES } from '../../routes';
import { desktopNavigationItems } from './appNavigation';
import { NavigationIcon } from './NavigationIcon';
import { useFavorites } from '../../features/mobile/favoritesContext';
import '../../features/events/events.css';

export function DesktopNav() {
  const {user}=useFavorites();
  return (
    <header className="desktop-header">
      <div className="desktop-header-inner">
        <Link aria-label={uiText("NoPlan 홈")} className="app-brand" to={ROUTES.appHome}>
          <img alt="" height="40" src={nopiIcon} width="40" />
          <span>noplan<span className="app-brand-caption">{uiText("일상에서 여행까지")}</span></span>
        </Link>
        <nav aria-label={uiText("상단 메뉴")} className="desktop-nav">
          {desktopNavigationItems.map((item) => (
            <NavLink className={({ isActive }) => isActive ? 'active' : ''} end={item.end} key={item.to} to={item.to}>
              <NavigationIcon name={item.icon} />
              <span>{uiText(item.label)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="desktop-header-actions"><Link className="desktop-create-trip" to={ROUTES.newTrip}>{uiText("새 여행 만들기")}</Link><Link className="desktop-account" to={user?ROUTES.myPage:ROUTES.login}><NavigationIcon name="user"/>{uiText(user?'마이':'로그인')}</Link><LanguageSelect /></div>
      </div>
    </header>
  );
}
