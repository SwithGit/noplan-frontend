import heroHomeImage from '../../assets/landing/hero-home.webp';
import heroSearchingImage from '../../assets/landing/hero-searching.webp';
import { ROUTES } from '../../routes';

export function LandingHero() {
  return (
    <section className="landing-hero landing-hero-content landing-container" aria-labelledby="landing-title">
      <div className="landing-hero-copy">
        <div className="landing-hero-enter landing-hero-enter-title">
          <span className="landing-eyebrow">내 취향에 맞는 홍대 코스 추천</span>
          <h1 id="landing-title">갈 만한 곳,<br /><em>노플랜이 다 찾아드릴게요.</em></h1>
        </div>
        <p className="landing-hero-enter landing-hero-enter-description">무엇을 할지, 누구와 가는지 알려주세요.<br />홍대의 장소를 취향과 동선에 맞는 코스로 연결해드려요.</p>
        <div className="landing-hero-enter landing-hero-enter-actions">
          <div className="landing-hero-actions">
            <a className="landing-button" href={ROUTES.appHome}>빠른 추천 받기 <span aria-hidden="true">→</span></a>
            <a className="landing-button landing-button-outline" href="#how-it-works">서비스 알아보기</a>
          </div>
          <small>현재 서비스는 홍대 권역을 중심으로 제공하고 있어요.</small>
        </div>
      </div>

      <div className="landing-product-visual" aria-label="실제 NoPlan 추천 결과와 장소 상세 화면">
        <div className="landing-orbit landing-orbit-one" />
        <div className="landing-orbit landing-orbit-two" />
        <figure className="landing-phone landing-phone-primary landing-hero-enter landing-hero-enter-screen-one">
          <img src={heroHomeImage} width="756" height="1369" alt="상암동에서 오늘 어디 갈지 입력하는 실제 NoPlan 홈 화면" />
        </figure>
        <figure className="landing-phone landing-phone-secondary landing-hero-enter landing-hero-enter-screen-two">
          <img src={heroSearchingImage} width="864" height="1491" alt="선택한 조건에 맞는 코스를 확인하는 실제 NoPlan 검색 화면" />
        </figure>
        <div className="landing-visual-note landing-hero-enter landing-hero-enter-note"><span aria-hidden="true">✓</span> 실제 서비스 화면</div>
      </div>
    </section>
  );
}
