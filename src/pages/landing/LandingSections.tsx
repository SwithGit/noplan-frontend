import { t } from '../../i18n/translate';
import { ROUTES } from '../../routes';
import { TripIcon, type TripIconName } from '../../features/trips/TripIcon';
import coast from '../../assets/travel/coastal-escape.webp';
import nopi from '../../assets/nopi/nopi-home.png';
import { LandingScreen } from './LandingScreens';

const discoveries: { icon: TripIconName; title: string; description: string; href: string }[] = [
  { icon: 'map', title: '다른 여행에서 얻는 힌트', description: '공개된 코스를 둘러보며 다음 여행의 시작점을 찾아보세요.', href: ROUTES.explore },
  { icon: 'calendar', title: '그날의 전시, 그곳의 축제', description: '여행에 새로운 취향을 더해줄 문화·행사를 만나보세요.', href: ROUTES.events },
  { icon: 'heart', title: '마음에 든 곳은 오래도록', description: '좋아하는 장소와 코스를 찜하고, 가고 싶은 순간에 다시 꺼내보세요.', href: ROUTES.favorites },
];

export function LandingSections() {
  return <>
    <section className="landing-intro landing-container" id="how-it-works" data-reveal>
      <span className="landing-kicker">LESS PLANNING, MORE MEMORIES</span>
      <h2>{t('여행을 준비하는 날도,')}<br />{t('문득 나서고 싶은 날도.')}<br /><em>{t('노플랜과, 우리답게.')}</em></h2>
      <p>{t('멀리 떠나는 설렘과 가까이에서 발견하는 즐거움.')}<br />{t('서로 다른 여행의 시작을, 노플랜이 함께해요.')}</p>
      <div className="landing-mode-links"><a href="#desktop-travel">PC · {t('국내 여행')} <span aria-hidden="true">→</span></a><a href="#mobile-course">MOBILE · {t('서울 주변 코스')} <span aria-hidden="true">→</span></a></div>
    </section>
    <section className="landing-section landing-desktop-section" id="desktop-travel">
      <div className="landing-container">
        <div className="landing-feature-heading" data-reveal>
          <div><span className="landing-kicker">01 / PC · TRAVEL PLANNING</span><h2>{t('가고 싶은 곳 하나에서,')}<br /><em>{t('우리 여행이 시작돼요.')}</em></h2></div>
          <p>{t('여행할 지역과 날짜, 함께할 사람을 정해보세요.')}<br />{t('꼭 가고 싶은 국내 관광지를 중심으로 일정을 만들고,')}<br />{t('빈 시간에는 노피와 주변 코스를 더해요.')}</p>
        </div>
        <div className="landing-desktop-showcase" data-reveal>
          <div className="landing-showcase-caption"><span>OUR NEXT TRIP</span><span>{t('국내 관광지 · 날짜별 일정 · 지도')}</span></div>
          <LandingScreen device="desktop" />
        </div>
        <div className="landing-detail-row" data-reveal-stagger>
          <article><span>01</span><h3>{t('마음이 향하는 지역으로')}</h3><p>{t('국내 관광지를 살펴보고 여행의 중심이 될 곳을 골라요.')}</p></article>
          <article><span>02</span><h3>{t('하루의 흐름을 한눈에')}</h3><p>{t('날짜별 일정과 지도를 보며 우리에게 맞는 순서를 정해요.')}</p></article>
          <article><span>03</span><h3>{t('빈 시간도 취향에 맞게')}</h3><p>{t('정해둔 일정 사이에 노피가 추천하는 주변 코스를 담아요.')}</p></article>
        </div>
      </div>
    </section>
    <section className="landing-section landing-team-section">
      <div className="landing-container landing-feature-grid">
        <div className="landing-team-visual" data-reveal>
          <div className="landing-team-top"><div className="landing-team-avatars" aria-hidden="true"><span>나</span><span>너</span><span>우리</span></div><span>{t('함께 만드는 여행')}</span></div>
          <h3>{t('서로의 취향이 모이면,')}<br />{t('더 우리다운 여행.')}</h3>
          <div className="landing-team-notes"><div><TripIcon name="pin" /><span>{t('꼭 가고 싶었던 곳')}</span></div><div><TripIcon name="calendar" /><span>{t('함께 고른 시간')}</span></div><div><TripIcon name="heart" /><span>{t('같이 남길 추억')}</span></div></div>
          <div className="landing-team-bottom"><TripIcon name="people" /><span>{t('초대하고 · 함께 편집하고 · 공유해요')}</span></div>
        </div>
        <div className="landing-feature-copy" data-reveal>
          <span className="landing-kicker">TOGETHER IS BETTER</span><h2>{t('계획은 함께,')}<br /><em>{t('기대는 두 배로.')}</em></h2>
          <p>{t('친구, 연인, 가족을 여행에 초대하세요.')}<br />{t('같은 일정에 장소와 메모를 더하며')}<br />{t('모두의 취향이 담긴 여행을 완성해요.')}</p>
          <span className="landing-feature-note">{t('팀 플래닝은 PC에서, 일정 확인은 모바일에서도.')}</span>
        </div>
      </div>
    </section>
    <section className="landing-section landing-mobile-section" id="mobile-course">
      <div className="landing-container landing-feature-grid">
        <div className="landing-feature-copy" data-reveal>
          <span className="landing-kicker">02 / MOBILE · RIGHT HERE, RIGHT NOW</span><h2>{t('“우리 이제 뭐 하지?”')}<br /><em>{t('그 한마디면 충분해요.')}</em></h2>
          <p>{t('지금 있는 곳, 함께하는 사람, 하고 싶은 것.')}<br />{t('시간과 예산, 걷고 싶은 거리까지 알려주면')}<br />{t('서울의 가까운 맛집과 카페, 놀거리를 코스로 이어드려요.')}</p>
          <div className="landing-preference-tags">{['맛집', '카페', '놀거리', '술·야간'].map(label => <span key={label}>{t(label)}</span>)}</div>
          <span className="landing-feature-note">{t('모바일 주변 코스는 현재 서울에서 제공해요.')}</span>
          <a className="landing-text-link" href={ROUTES.appHome}>{t('지금 갈 곳 찾아보기')} <span aria-hidden="true">↗</span></a>
        </div>
        <div className="landing-mobile-showcase" data-reveal><span className="landing-mobile-halo" aria-hidden="true" /><LandingScreen device="mobile" /><span className="landing-floating-tag landing-tag-time"><TripIcon name="clock" />{t('지금부터 저녁까지')}</span><span className="landing-floating-tag landing-tag-people"><TripIcon name="people" />{t('친구랑, 우리 취향대로')}</span></div>
      </div>
    </section>
    <section className="landing-section landing-discover" id="local-content">
      <div className="landing-container">
        <div className="landing-section-heading" data-reveal><span className="landing-kicker">A LITTLE MORE TO DISCOVER</span><h2>{t('다음에 가고 싶은 곳이,')}<br /><em>{t('하나 더 생기는 순간.')}</em></h2></div>
        <div className="landing-discovery-grid" data-reveal-stagger>{discoveries.map(item => <a className="landing-discovery-card" href={item.href} key={item.title}><span className="landing-discovery-icon"><TripIcon name={item.icon} /></span><h3>{t(item.title)}</h3><p>{t(item.description)}</p><span className="landing-card-arrow" aria-hidden="true">↗</span></a>)}</div>
      </div>
    </section>
    <section className="landing-finale">
      <img className="landing-finale-coast" src={coast} alt="" loading="lazy" />
      <div className="landing-container landing-finale-copy" data-reveal><span className="landing-kicker">MAKE ROOM FOR A GOOD DAY</span><h2>{t('계획 없어도,')}<br />{t('좋은 하루는 시작되니까.')}</h2><p>{t('다음 여행도, 오늘의 작은 외출도 노플랜과 함께.')}</p><a className="landing-button" href={ROUTES.appHome}>{t('나의 다음 코스 만나기')}<span aria-hidden="true">↗</span></a></div>
    </section>
    <section className="landing-partnership landing-container" id="partnership" data-reveal><img src={nopi} alt="" loading="lazy" width="150" height="150" /><div><span className="landing-kicker">WITH NOPLAN</span><h2>{t('지역의 좋은 곳이, 더 많은 만남으로.')}</h2><p>{t('공간과 지역 콘텐츠를 함께 소개할 파트너를 기다려요.')}</p></div><span className="landing-coming-soon">{t('문의 준비 중')}</span></section>
  </>;
}
