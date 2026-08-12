import { useEffect, useRef } from 'react';
import { LandingFooter } from './LandingFooter';
import { LandingHeader } from './LandingHeader';
import { LandingHero } from './LandingHero';
import { LandingSections } from './LandingSections';
import './landing.css';

const landingDescription = '상황과 취향에 맞는 홍대의 장소를 탐색하고 이동하기 좋은 코스로 연결하는 NoPlan 서비스입니다.';

export default function LandingPage() {
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'NoPlan | 내 취향에 맞는 홍대 코스 추천';

    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDescription = description?.content;
    const meta = description || document.createElement('meta');
    meta.name = 'description';
    meta.content = landingDescription;
    if (!description) document.head.appendChild(meta);

    return () => {
      document.title = previousTitle;
      if (description && previousDescription !== undefined) description.content = previousDescription;
      else meta.remove();
    };
  }, []);

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const revealTargets = Array.from(page.querySelectorAll<HTMLElement>('[data-reveal], [data-reveal-stagger], [data-reveal-fade]'));
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

    const heroStage = page.querySelector<HTMLElement>('.landing-hero-stage');
    let animationFrame = 0;
    const updateScrollMotion = () => {
      animationFrame = 0;
      if (!heroStage) return;
      const mobile = window.matchMedia('(max-width: 680px)').matches;
      const limit = mobile ? 32 : 60;
      const offset = reducedMotion.matches ? 0 : Math.min(window.scrollY * 0.12, limit);
      heroStage.style.setProperty('--landing-hero-offset', `${offset}px`);
      page.classList.toggle('is-past-hero', window.scrollY > window.innerHeight * 0.52);
    };
    const requestScrollMotion = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(updateScrollMotion);
    };

    window.addEventListener('scroll', requestScrollMotion, { passive: true });
    window.addEventListener('resize', requestScrollMotion);
    const mountFrame = window.requestAnimationFrame(() => page.classList.add('is-mounted'));
    updateScrollMotion();

    return () => {
      window.cancelAnimationFrame(mountFrame);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('scroll', requestScrollMotion);
      window.removeEventListener('resize', requestScrollMotion);
      observer?.disconnect();
    };
  }, []);

  return (
    <div className="landing-page" id="top" ref={pageRef}>
      <LandingHeader />
      <main>
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
