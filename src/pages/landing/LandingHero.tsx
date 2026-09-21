import { t } from '../../i18n/translate';
import { ROUTES } from '../../routes';
import { LandingScreen } from './LandingScreens';

export function LandingHero() {
  return <section className="landing-hero landing-container" aria-labelledby="landing-title">
    <div className="landing-hero-copy">
      <span className="landing-eyebrow">{t('내 취향에 맞는 국내 코스 추천')}</span>
      <h1 id="landing-title">{t('어디로 갈까,')}<br />{t('고민은 짧게.')}<br /><em>{t('좋은 순간은 길게.')}</em></h1>
      <p>{t('함께 떠날 국내 여행부터,')}<br />{t('지금 내 주변에서 보내는 좋은 하루까지.')}<br />{t('당신의 취향을 하나의 코스로 이어드려요.')}</p>
      <div className="landing-hero-actions">
        <a className="landing-button" href={ROUTES.appHome}>{t('노플랜 시작하기')}<span aria-hidden="true">↗</span></a>
        <a className="landing-text-link" href="#how-it-works">{t('서비스 알아보기')}<span aria-hidden="true">↓</span></a>
      </div>
      <small className="landing-coverage">{t('PC에서는 국내 관광지로 떠나는 여행을,')}<br />{t('모바일에서는 서울의 가까운 맛집과 놀거리를 만나보세요.')}</small>
    </div>
    <div className="landing-product-visual">
      <span className="landing-visual-orbit" aria-hidden="true" />
      <figure className="landing-hero-desktop"><LandingScreen device="desktop" eager /><figcaption>PC <span>· {t('함께 준비하는 국내 여행')}</span></figcaption></figure>
      <figure className="landing-hero-mobile"><LandingScreen device="mobile" eager /><figcaption>MOBILE <span>· {t('지금, 서울에서')}</span></figcaption></figure>
      <span className="landing-visual-note">{t('계획 없어도 좋은 하루')} <span aria-hidden="true">✦</span></span>
    </div>
  </section>;
}
