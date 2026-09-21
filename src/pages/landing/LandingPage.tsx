import { useEffect, useRef } from 'react';
import { useLocale } from '../../i18n/locale';
import { t } from '../../i18n/translate';
import { LandingFooter } from './LandingFooter';
import { LandingHeader } from './LandingHeader';
import { LandingHero } from './LandingHero';
import { LandingSections } from './LandingSections';
import './landing.css';

const landingDescription = 'PC에서는 국내 관광지 중심의 여행과 팀 플래닝을, 모바일에서는 서울의 맛집·카페·놀거리 주변 코스를 추천하는 노플랜입니다.';

export default function LandingPage() {
  const locale = useLocale();
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = t('NoPlan | 내 취향에 맞는 국내 코스 추천');

    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDescription = description?.content;
    const meta = description || document.createElement('meta');
    meta.name = 'description';
    meta.content = t(landingDescription);
    if (!description) document.head.appendChild(meta);

    return () => {
      document.title = previousTitle;
      if (description && previousDescription !== undefined) description.content = previousDescription;
      else meta.remove();
    };
  }, [locale]);

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const revealTargets = Array.from(page.querySelectorAll<HTMLElement>('[data-reveal], [data-reveal-stagger]'));
    page.classList.add('motion-ready');

    let observer: IntersectionObserver | null = null;
    if ('IntersectionObserver' in window && !reducedMotion.matches) {
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          (entry.target as HTMLElement).classList.add('is-revealed');
          observer?.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -14% 0px', threshold: 0.12 });
      revealTargets.forEach((target) => observer?.observe(target));
    } else {
      revealTargets.forEach((target) => target.classList.add('is-revealed'));
    }

    return () => {
      observer?.disconnect();
      page.classList.remove('motion-ready');
    };
  }, []);

  return (
    <div className="landing-page" id="top" ref={pageRef}>
      <LandingHeader />
      <main id="landing-content">
        <div className="landing-hero-stage">
          <LandingHero />
        </div>
        <div className="landing-main">
          <LandingSections />
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
