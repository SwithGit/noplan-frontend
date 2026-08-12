const problems = [
  ['01', '흩어진 정보', '장소 정보가 여러 검색과 SNS에 흩어져 있습니다.'],
  ['02', '목적과 다른 추천', '인기순 추천은 지금의 목적과 취향을 충분히 반영하지 못합니다.'],
  ['03', '직접 짜는 동선', '여러 장소를 직접 조합해 이동 동선을 짜야 합니다.'],
];

const steps = [
  { title: '발견', description: '홍대의 장소와 공개 코스를 탐색합니다.', icon: '⌕', image: serviceDetailImage, width: 424, height: 855, alt: '추천 장소의 사진과 정보를 확인하는 실제 NoPlan 장소 상세 화면' },
  { title: '선택', description: '상황, 취향, 인원과 원하는 분위기를 반영합니다.', icon: '✓', image: heroHomeImage, width: 756, height: 1369, alt: '상황을 입력하거나 빠른 추천을 선택하는 실제 NoPlan 홈 화면' },
  { title: '연결', description: '선택한 장소를 실제로 이동할 수 있는 코스로 확인합니다.', icon: '↗', image: serviceResultImage, width: 423, height: 863, alt: '여러 장소가 하나의 코스로 연결된 실제 NoPlan 추천 결과 화면' },
];

function LandingHowItWorks() {
  const [activeStep, setActiveStep] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectWithKeyboard = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let nextIndex = currentIndex;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % steps.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + steps.length) % steps.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = steps.length - 1;
    else return;

    event.preventDefault();
    setActiveStep(nextIndex);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <section className="landing-section landing-how" id="how-it-works">
      <div className="landing-container">
        <div className="landing-section-heading landing-section-heading-center" data-reveal>
          <span className="landing-kicker">HOW IT WORKS</span>
          <h2>장소를 찾고, 이해하고, 연결합니다.</h2>
        </div>
        <div className="landing-how-layout">
          <div className="landing-step-tabs" data-reveal-stagger role="tablist" aria-label="NoPlan 서비스 작동 방식">
            {steps.map((step, index) => (
              <button
                aria-controls={`landing-step-panel-${index}`}
                aria-selected={activeStep === index}
                className={activeStep === index ? 'is-selected' : ''}
                id={`landing-step-tab-${index}`}
                key={step.title}
                onClick={() => setActiveStep(index)}
                onKeyDown={(event) => selectWithKeyboard(event, index)}
                ref={(element) => { tabRefs.current[index] = element; }}
                role="tab"
                tabIndex={activeStep === index ? 0 : -1}
                type="button"
              >
                <span aria-hidden="true">{step.icon}</span>
                <div><strong>{String(index + 1).padStart(2, '0')} · {step.title}</strong><small>{step.description}</small></div>
              </button>
            ))}
          </div>

          <div className="landing-service-stage" data-reveal aria-live="polite">
            <div className="landing-service-phone">
              {steps.map((step, index) => (
                <div
                  aria-hidden={activeStep !== index}
                  aria-labelledby={`landing-step-tab-${index}`}
                  className={`landing-service-layer ${activeStep === index ? 'is-active' : ''}`}
                  id={`landing-step-panel-${index}`}
                  key={step.title}
                  role="tabpanel"
                >
                  <img alt={activeStep === index ? step.alt : ''} height={step.height} loading={index === 0 ? 'eager' : 'lazy'} src={step.image} width={step.width} />
                </div>
              ))}
            </div>
            <p><strong>{steps[activeStep].title}</strong>{steps[activeStep].description}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingSections() {
  return (
    <>
      <section className="landing-problem">
        <div className="landing-container landing-problem-grid">
          <div className="landing-section-heading" data-reveal>
            <span className="landing-kicker">THE PROBLEM</span>
            <h2>저장한 장소는 많은데,<br /><em>막상 어디 갈지는 어렵습니다.</em></h2>
          </div>
          <div className="landing-problem-list" data-reveal-stagger>
            {problems.map(([number, title, description]) => (
              <article key={number}>
                <span>{number}</span>
                <div><strong>{title}</strong><p>{description}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <LandingHowItWorks />

      <section className="landing-section landing-compare">
        <div className="landing-container">
          <div className="landing-section-heading landing-section-heading-center" data-reveal>
            <span className="landing-kicker">WHY NOPLAN</span>
            <h2>인기순이 아니라,<br />나와 장소의 <em>적합도</em>를 봅니다.</h2>
          </div>
          <div className="landing-compare-grid">
            <article className="landing-compare-card landing-compare-old" data-reveal>
              <span>기존 검색</span>
              <h3>장소를 하나씩 찾고 조합하기</h3>
              <ul><li>검색어와 평점 중심</li><li>장소를 하나씩 확인</li><li>이동 순서를 직접 구성</li></ul>
            </article>
            <span className="landing-versus" aria-hidden="true" data-reveal-fade>VS</span>
            <article className="landing-compare-card landing-compare-noplan landing-reveal-delay-1" data-reveal>
              <span>NoPlan</span>
              <h3>지금의 조건을 하나의 코스로</h3>
              <ul><li>상황과 취향을 함께 반영</li><li>홍대의 장소와 공개 코스를 탐색</li><li>여러 장소를 하나의 코스로 연결</li></ul>
            </article>
          </div>
        </div>
      </section>

      <section className="landing-section landing-local" id="local-content">
        <div className="landing-container landing-local-grid">
          <div className="landing-section-heading" data-reveal>
            <span className="landing-kicker">LOCAL CONTENT</span>
            <h2>추천하기 전에,<br /><em>먼저 지역을 들여다봅니다.</em></h2>
            <p>홍대에서 직접 확인하고 등록한 장소와 코스를 바탕으로 사용자의 상황에 맞는 선택지를 연결합니다.</p>
          </div>
          <div className="landing-local-visual" aria-label="홍대 지역의 장소를 코스로 연결하는 과정" data-reveal>
            <div className="landing-map-line" aria-hidden="true" />
            <article><span>1</span><strong>장소 탐색</strong><small>맛집 · 놀거리 · 카페</small></article>
            <article><span>2</span><strong>조건 확인</strong><small>동행 · 목적 · 분위기</small></article>
            <article><span>3</span><strong>코스 연결</strong><small>이동 순서와 장소 정보</small></article>
          </div>
        </div>
      </section>

      <section className="landing-partnership" id="partnership">
        <div className="landing-container landing-partnership-card" data-reveal>
          <div>
            <span className="landing-kicker">PARTNERSHIP</span>
            <h2>지역의 좋은 공간이<br />더 잘 발견되는 방법을 함께 만듭니다.</h2>
            <p>공간, 상권, 지역 콘텐츠와 데이터 분야의 파트너를 기다립니다.</p>
          </div>
          <span className="landing-coming-soon" aria-label="파트너십 문의 채널 준비 중">문의 준비 중</span>
        </div>
      </section>
    </>
  );
}
import { useRef, useState, type KeyboardEvent } from 'react';
import heroHomeImage from '../../assets/landing/hero-home.webp';
import serviceDetailImage from '../../assets/landing/service-detail.webp';
import serviceResultImage from '../../assets/landing/service-result.webp';
