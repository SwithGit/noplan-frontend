import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchWeeklyEvents, type WeeklyEvents as WeeklyResult } from '../../api/eventsApi';
import { eventRoute } from '../../routes';
import { t } from '../../i18n/translate';
import { PublicText } from '../../i18n/PublicText';
import { FavoriteButton } from '../mobile/MobileUi';
import { EventImage } from './EventImage';
import { eventFavorite } from './eventFavorite';
import { eventDate, eventKinds } from './eventModel';

export function WeeklyEvents() {
  const [result, setResult] = useState<WeeklyResult | null>(null);
  const [failed, setFailed] = useState(false), [revision, setRevision] = useState(0);
  const [active, setActive] = useState(0);
  const rail = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    fetchWeeklyEvents().then(value => { if (!cancelled) setResult(value); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [revision]);
  return <section className="weekly-events" aria-labelledby="weekly-events-title">
    <header><div><h2 id="weekly-events-title">{t('이번 주 추천')}</h2><p>{t('전국에서 골라본 이번 주의 경험')}</p></div>{result && <span>{eventDate(result.from).slice(5)} — {eventDate(result.to).slice(5)}</span>}</header>
    {failed ? <div className="weekly-empty" role="status"><p>{t('이번 주 추천을 불러오지 못했어요.')}</p><button type="button" onClick={() => {setFailed(false);setRevision(value => value + 1);}}>{t('다시 불러오기')}</button></div>
      : !result ? <div className="weekly-skeleton" role="status" aria-label={t('행사 불러오는 중')}/>
      : !result.events.length ? <p className="weekly-empty">{t('이번 주에 진행하는 행사가 아직 없어요. 아래에서 다음 일정을 찾아보세요.')}</p>
      : <>
        <div className="weekly-rail" ref={rail} onScroll={() => {
          const element = rail.current;
          if (!element) return;
          const cards = Array.from(element.children) as HTMLElement[];
          const closest = cards.reduce((best, card, index) => Math.abs(card.offsetLeft - element.offsetLeft - element.scrollLeft) < Math.abs(cards[best].offsetLeft - element.offsetLeft - element.scrollLeft) ? index : best, 0);
          setActive(closest);
        }}>
          {result.events.map((event, index) => <article className="weekly-card" key={event.id} aria-label={`${index + 1} / ${result.events.length}`}>
            <Link to={eventRoute(event.id)}><EventImage event={event}/><div className="weekly-card-copy">
              <p>{t(eventKinds[event.kind])} · {t(event.region || '지역 확인')}</p>
              <h3><PublicText source={{kind:'event',id:event.id}} text={event.title}/></h3>
              <div><span>{eventDate(event.startDate)} — {eventDate(event.endDate)}</span>{event.isFree === true && <b>{t('무료')}</b>}</div>
            </div></Link>
            <FavoriteButton item={eventFavorite(event)} compact/>
          </article>)}
        </div>
        <nav className="weekly-dots" aria-label={t('이번 주 추천')}>
          {result.events.map((event, index) => <button key={event.id} type="button" aria-label={`${t('이번 주 추천')} ${index + 1}`} aria-current={index === active ? 'true' : undefined} onClick={() => {
            const element = rail.current, card = element?.children[index] as HTMLElement | undefined;
            if (element && card) element.scrollTo({left:card.offsetLeft-element.offsetLeft,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
          }}><span/></button>)}
        </nav>
        {result.sources.some(source=>source.stale||!source.available) && <p className="weekly-source-note">{t('일부 제공기관의 최신 정보를 불러오지 못했어요. 현재 확보한 행사 정보를 보여드려요.')}</p>}
      </>}
  </section>;
}
