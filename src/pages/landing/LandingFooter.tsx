import { t as uiText } from '../../i18n/translate';
import { LandingBrand } from './LandingBrand';
export function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-container landing-footer-inner">
        <LandingBrand />
        <nav aria-label={uiText("푸터 메뉴")}>
          <a href="#how-it-works">{uiText("서비스 소개")}</a>
          <a href="/privacy">{uiText("개인정보처리방침")}</a>
        </nav>
        <small>© {new Date().getFullYear()} NoPlan. All rights reserved.</small>
      </div>
    </footer>
  );
}
