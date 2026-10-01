import { Link } from 'react-router-dom';
import './stampEvent.css';

export function StampEventBanner() {
  return <Link className="ne-banner" to="/event">
    <div><span className="ne-tag">스탬프 이벤트</span><h2>노피를<br /><em>찾아라!</em></h2><p>숨어 있는 노피 5명을 찾아보세요</p><span className="ne-banner-cta">이벤트 참여하기 →</span></div>
    <div className="ne-banner-character"><img src="/images/stamp-event/hero.webp" alt="스탬프 카드를 든 노피" /></div>
  </Link>;
}
