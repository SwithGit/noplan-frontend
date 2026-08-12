import { useState } from 'react';
import { ROUTES } from '../../routes';

const navigationItems = [
  { href: '#how-it-works', label: '서비스' },
  { href: '#local-content', label: '지역 콘텐츠' },
  { href: '#partnership', label: '파트너십' },
];

export function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className={`landing-header ${menuOpen ? 'is-menu-open' : ''}`}>
      <div className="landing-container landing-header-inner">
        <a className="landing-wordmark" href="#top" aria-label="NoPlan 랜딩페이지 맨 위로 이동">
          <span aria-hidden="true">N</span>
          noplan
        </a>

        <nav className="landing-desktop-nav" aria-label="랜딩페이지 주요 메뉴">
          {navigationItems.map((item) => <a href={item.href} key={item.href}>{item.label}</a>)}
          <a className="landing-button landing-button-small" href={ROUTES.appHome}>노플랜 시작하기</a>
        </nav>

        <div className="landing-mobile-actions">
          <a className="landing-button landing-button-small" href={ROUTES.appHome}>시작하기</a>
          <button
            aria-controls="landing-mobile-menu"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
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
        <nav className="landing-mobile-menu" id="landing-mobile-menu" aria-label="모바일 랜딩페이지 메뉴">
          {navigationItems.map((item) => (
            <a href={item.href} key={item.href} onClick={() => setMenuOpen(false)}>{item.label}</a>
          ))}
        </nav>
      )}
    </header>
  );
}
