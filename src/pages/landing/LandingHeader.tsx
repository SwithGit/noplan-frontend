import { t as uiText } from '../../i18n/translate';
import { useState } from 'react';
import { useLocale } from '../../i18n/locale';
import { LanguageSelect } from '../../i18n/LanguageSelect';
import { ROUTES } from '../../routes';

const navigationItems = [
  { href: '#how-it-works', label: '서비스' },
  { href: '#local-content', label: '지역 콘텐츠' },
  { href: '#partnership', label: '파트너십' },
];

export function LandingHeader() {
  useLocale();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className={`landing-header ${menuOpen ? 'is-menu-open' : ''}`}>
      <div className="landing-container landing-header-inner">
        <a className="landing-wordmark" href="#top" aria-label={uiText("NoPlan 랜딩페이지 맨 위로 이동")}>
          <span aria-hidden="true">N</span>
          noplan
        </a>

        <nav className="landing-desktop-nav" aria-label={uiText("랜딩페이지 주요 메뉴")}>
          <LanguageSelect />
          {navigationItems.map((item) => <a href={item.href} key={item.href}>{uiText(item.label)}</a>)}
          <a className="landing-button landing-button-small" href={ROUTES.appHome}>{uiText("노플랜 시작하기")}</a>
        </nav>

        <div className="landing-mobile-actions">
          <a className="landing-button landing-button-small" href={ROUTES.appHome}>{uiText("시작하기")}</a>
          <button
            aria-controls="landing-mobile-menu"
            aria-expanded={menuOpen}
            aria-label={uiText(menuOpen ? '메뉴 닫기' : '메뉴 열기')}
            className="landing-menu-button"
            onClick={() => setMenuOpen((current) => !current)}
            type="button"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="landing-mobile-menu" id="landing-mobile-menu" aria-label={uiText("모바일 랜딩페이지 메뉴")}>
          {navigationItems.map((item) => (
            <a href={item.href} key={item.href} onClick={() => setMenuOpen(false)}>{uiText(item.label)}</a>
          ))}
        </nav>
      )}
    </header>
  );
}
