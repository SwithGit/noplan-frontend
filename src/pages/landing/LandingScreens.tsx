import desktopScreen from '../../assets/landing/product-desktop.png';
import mobileScreen from '../../assets/landing/product-mobile.png';
import { t } from '../../i18n/translate';

// Replace these two captures to update product imagery throughout the introduction.
export function LandingScreen({ device, eager = false }: { device: 'desktop' | 'mobile'; eager?: boolean }) {
  return <div className={`landing-device landing-device-${device}`}>
    {device === 'desktop' && <div className="landing-browser-bar" aria-hidden="true"><i /><i /><i /><span>noplan.live</span></div>}
    <img src={device === 'desktop' ? desktopScreen : mobileScreen}
      width={device === 'desktop' ? 1265 : 375} height={device === 'desktop' ? 712 : 812}
      loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'auto'}
      alt={t(device === 'desktop' ? '국내 여행을 준비하는 노플랜 PC 실제 화면' : '주변 코스를 추천받는 노플랜 모바일 실제 화면')} />
  </div>;
}
