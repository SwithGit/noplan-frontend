import { t as uiText } from '../../i18n/translate';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { UserSession } from '../../types/noplan';
import { ROUTES } from '../../routes';
import { TripCreateForm } from './TripCreateForm';
import './trips.css';

export function TripCreatePage({ user }: { user: UserSession | null }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    heading.current?.focus({ preventScroll: true });
  }, []);
  return <div className="trip-home trip-create-page">
    <header className="trip-create-page-heading">
      <nav aria-label={uiText("현재 위치")}><Link to={ROUTES.appHome}>{uiText("홈")}</Link><span>/</span><span>{uiText("새 여행 만들기")}</span></nav>
      <span className="trip-eyebrow">YOUR NEXT JOURNEY</span>
      <h1 ref={heading} tabIndex={-1}>{uiText("어떤 여행을 떠날까요?")}</h1>
      <p>{uiText("목적지와 날짜를 정하고, 우리에게 맞는 여행을 시작해요.")}</p>
      <ol aria-label={uiText("여행 만들기 단계")}><li aria-current="step"><b>1</b>{uiText("여행 조건 입력")}</li><li><b>2</b>{uiText("일정 구성하기")}</li></ol>
    </header>
    <TripCreateForm key={user?.userId || 'guest'} user={user} />
    <p className="trip-create-page-note">{uiText("일정을 시작한 뒤 노피에게 코스를 추천받거나, 원하는 장소를 직접 담을 수 있어요.")}</p>
  </div>;
}
