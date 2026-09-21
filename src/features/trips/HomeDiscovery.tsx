import { PublicText } from '../../i18n/PublicText';
import { useLocale } from '../../i18n/locale';
import { t as uiText } from '../../i18n/translate';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchEvents } from '../../api/eventsApi';
import { getTourismDetail, type TourismDetail } from '../../api/tourismApi';
import coast from '../../assets/travel/coastal-escape.webp';
import { eventDate, koreaToday, type TravelEvent } from '../events/eventModel';
import { ROUTES, eventRoute } from '../../routes';
import { TripDialog } from './TripDialog';
import { TripIcon } from './TripIcon';
import { currentFestivalBanners, homeCourses, type HomeCourse } from './homeContent';
import './homeDiscovery.css';

function useHomeFestivals() {
  const [result, setResult] = useState<{ events: TravelEvent[]; state: 'loading' | 'ready' | 'error'; stale: boolean }>({ events: [], state: 'loading', stale: false });
  useEffect(() => {
    let active = true;
    const today = koreaToday();
    fetchEvents(new URLSearchParams({ kind: 'festival', from: today, to: today, sort: 'ending' }))
      .then(data => { if (active) setResult({ events: currentFestivalBanners(data.events, today), state: 'ready', stale: data.sources.some(source => source.stale) }); })
      .catch(() => { if (active) setResult({ events: [], state: 'error', stale: false }); });
    return () => { active = false; };
  }, []);
  return result;
}

function HomePhoto({ src, alt, eager = false }: { src: string; alt: string; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  return failed || !src ? <span className="home-photo-fallback"><TripIcon name="map" /><span>{uiText("여행의 새로운 발견")}</span></span> : <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'auto'} referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
}

export function HomeHero() {
  const { events: festivals, state, stale } = useHomeFestivals();
  const [index, setIndex] = useState(0);
  const slides = [null, ...festivals];
  const selected = index % slides.length;
  const move = (delta: number) => setIndex((selected + delta + slides.length) % slides.length);
  const slide = (event: TravelEvent | null, position: 'current' | 'previous' | 'next') => <div className={`home-hero-slide ${event ? 'festival' : 'welcome'} ${position}`} aria-hidden={position !== 'current' || undefined}>
    <HomePhoto key={event?.id || 'welcome'} src={event?.imageUrl || coast} alt={position === 'current' ? event ? uiText(`${event.title} 공식 홍보 이미지`) : uiText('푸른 바다와 산책길이 있는 해안 풍경') : ''} eager={position === 'current'} />
    <div className="home-hero-shade" />
    <div className="home-hero-copy">
      <span className="home-hero-eyebrow">{uiText(event ? `${event.region || '국내'} · 지금 만나는 축제` : 'YOUR NEXT LITTLE ESCAPE')}</span>
      {position === 'current' ? <h1>{event ? <PublicText source={{kind:'event',id:event.id}} text={event.title}/> : <>{uiText("가고 싶은 곳에서,")}<br />{uiText("우리다운 여행으로.")}</>}</h1> : <strong>{event ? <PublicText source={{kind:'event',id:event.id}} text={event.title}/> : <>{uiText("가고 싶은 곳에서,")}<br />{uiText("우리다운 여행으로.")}</>}</strong>}
      <p>{event ? <>{eventDate(event.startDate)} — {eventDate(event.endDate)}<br /><PublicText source={{kind:'event',id:event.id}} text={event.venue || event.address}/></> : <>{uiText("큰 일정은 가볍게 정하고")}<br />{uiText("그 사이의 좋은 순간은 노피와 채워보세요.")}</>}</p>
      {position === 'current' && (event ? <Link to={eventRoute(event.id)}>{uiText("축제 만나보기 ")}<TripIcon name="arrow" /></Link> : <a href="#trip-create">{uiText("새로운 여행을 시작해요 ")}<TripIcon name="arrow" /></a>)}
    </div>
    {event && position === 'current' && <small className="home-hero-credit">{uiText(event.sourceLabel)}{uiText(" 제공")}{uiText(stale ? ' · 최신 일정 확인 필요' : '')}</small>}
    {!event && position === 'current' && <span className="home-hero-sign">Less planning.<br /><b>More memories.</b></span>}
  </div>;
  return <section className="home-hero-carousel" aria-label={uiText("여행과 진행 중인 축제 배너")} aria-roledescription="캐러셀" onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); move(event.key === 'ArrowLeft' ? -1 : 1); } }}>
    {slides.length > 1 && slide(slides[(selected + slides.length - 1) % slides.length], 'previous')}
    <div className="home-hero-center">
      {slide(slides[selected], 'current')}
      <button className="home-hero-arrow previous" type="button" aria-label={uiText("이전 배너")} disabled={slides.length === 1} onClick={() => move(-1)}><TripIcon name="arrow" /></button>
      <button className="home-hero-arrow next" type="button" aria-label={uiText("다음 배너")} disabled={slides.length === 1} onClick={() => move(1)}><TripIcon name="arrow" /></button>
      <div className="home-hero-pagination">{slides.map((item, at) => <button type="button" key={item?.id || 'welcome'} aria-label={uiText(`${at + 1}번 배너: ${item?.title || '새로운 여행'}`)} aria-pressed={selected === at} onClick={() => setIndex(at)} />)}</div>
      <span className="home-hero-counter" aria-live="polite">{String(selected + 1).padStart(2, '0')} <span>/ {String(slides.length).padStart(2, '0')}</span></span>
    </div>
    {slides.length > 1 && slide(slides[(selected + 1) % slides.length], 'next')}
    {state === 'error' && <span className="home-hero-feed-note">{uiText("축제 소식을 잠시 불러오지 못했어요. ")}<Link to={ROUTES.events}>{uiText("축제·전시 둘러보기 →")}</Link></span>}
  </section>;
}

export function HomeExhibitionBanner() {
  return <Link className="home-exhibition-banner" to={`${ROUTES.events}?kind=exhibition`}>
    <div className="home-exhibition-art" aria-hidden="true"><span className="home-art-ticket">EXHIBITION<span>ADMIT ONE</span></span><span className="home-art-frame"><svg viewBox="0 0 80 92" fill="none"><circle cx="54" cy="25" r="9" fill="#c5a5fa" /><path d="M5 83 28 40 45 65 57 49 76 83Z" fill="#9b77df" /></svg></span></div>
    <div className="home-exhibition-copy"><span>ART & A LITTLE INSPIRATION</span><h2>{uiText("여행지에서 만나는 전시, 한눈에")}</h2><p>{uiText("여행에 새로운 취향을 더해줄 전시를 둘러보세요.")}</p></div>
    <div className="home-exhibition-posters" aria-hidden="true"><span className="home-art-poster type">A LITTLE<br /><b>ART</b><br />IN YOUR<br />JOURNEY.</span><span className="home-art-poster shapes"><i /><i /><i /></span></div>
    <span className="home-exhibition-cta">{uiText("전시회 모아보기 ")}<TripIcon name="arrow" /></span>
  </Link>;
}

export function HomeCourseDetail({ course, onClose }: { course: HomeCourse; onClose: () => void }) {
  const locale = useLocale();
  const [result, setResult] = useState<{ key?: string; detail?: TourismDetail; error?: string }>({});
  const [retry, setRetry] = useState(0);
  const requestKey = `${course.id}:${retry}`;
  useEffect(() => {
    const controller = new AbortController();
    getTourismDetail(course.id, '25', controller.signal, 'ko').then(detail => { if (!controller.signal.aborted) setResult({ key: requestKey, detail }); }).catch(() => { if (!controller.signal.aborted) setResult({ key: requestKey, error: '코스 상세를 불러오지 못했어요. 다시 시도해 주세요.' }); });
    return () => controller.abort();
  }, [course.id, requestKey]);
  const detail = result.key === requestKey ? result.detail : undefined;
  const error = result.key === requestKey ? result.error : undefined;
  return <TripDialog title={uiText("추천 여행코스")} onClose={onClose} className="home-course-dialog">
    <div className="home-course-detail-cover"><HomePhoto src={course.image} alt="" /><small>{uiText("© 한국관광공사")}{course.license && ` · ${uiText("공공누리")} ${uiText(course.license)}`}{(detail || locale === 'ko') && ` · ${detail?.localizedImagePlace || uiText(course.imagePlace)}`}</small></div>
    <div className="home-course-detail-body"><span className="trip-eyebrow">{uiText(course.region)}{uiText(" · 한국관광공사 추천코스")}</span><h2>{detail?.localizedName || uiText(locale !== 'ko' && !detail ? '추천 여행코스' : course.title)}</h2>
      {!detail && !error && <p role="status">{uiText("여행 코스를 불러오고 있어요…")}</p>}
      {error && <div className="trip-alert" role="alert">{uiText(error)}<button type="button" onClick={() => setRetry(value => value + 1)}>{uiText("다시 불러오기")}</button></div>}
      {locale !== 'ko' && <p className="trip-muted">{uiText('코스 정보는 한국어 원문으로 제공해요.')}</p>}
      {detail && <><p className="home-course-overview">{detail.overview.replaceAll('\\n', '\n')}</p><div className="home-course-facts">{detail.course?.duration && <span><TripIcon name="clock" />{detail.course.duration}</span>}{detail.course?.distance && <span><TripIcon name="map" />{detail.course.distance}</span>}</div>
        <h3>{uiText("이렇게 둘러보세요")}</h3><ol className="home-course-stops">{detail.course?.stops.map((stop, at) => <li key={`${at}-${stop.name}`}><span>{String(at + 1).padStart(2, '0')}</span><div><h4>{stop.name}</h4><p>{stop.description.replaceAll('\\n', '\n')}</p><a href={`https://map.naver.com/p/search/${encodeURIComponent(`${course.region} ${stop.originalName || stop.name}`)}`} target="_blank" rel="noreferrer">{uiText("네이버지도에서 보기 ↗")}</a></div></li>)}</ol>
        {detail.partial && <p className="trip-muted">{uiText("일부 상세정보를 불러오지 못했어요.")}</p>}
      </>}
      <p className="trip-footnote">{uiText("한국관광공사 제공 코스로, 실제 이용자의 여행 후기는 아니에요. 운영시간과 이동 방법은 방문 전에 확인해 주세요.")}</p>
    </div>
  </TripDialog>;
}

export function HomeCourseCard({ course, onSelect }: { course: HomeCourse; onSelect: (course: HomeCourse) => void }) {
  useLocale();
  return <button type="button" className="home-course-card" onClick={() => onSelect(course)}>
    <div className="home-course-cover"><HomePhoto src={course.image} alt={uiText(course.imagePlace)} /><span className="home-course-badge">{uiText("추천코스")}</span><small>{uiText("© 한국관광공사")}{course.license && ` · ${uiText("공공누리")} ${uiText(course.license)}`}</small></div>
    <div className="home-course-copy"><span className="home-course-meta"><TripIcon name="pin" />{uiText(course.region)}{course.duration && ` · ${uiText(course.duration)}`}</span><h3>{uiText(course.title)}</h3><p>{uiText(course.description)}</p><div className="home-course-footer"><span>{course.stops.slice(0, 3).map(name=>uiText(name)).join(' → ')}</span><b>{uiText("코스 보기 ")}<TripIcon name="arrow" /></b></div></div>
  </button>;
}

export function HomeTravelCourses() {
  const [selected, setSelected] = useState<HomeCourse>();
  return <section className="home-travel-courses"><header><div><h2>{uiText("국내 여행 추천코스")}</h2><p>{uiText("다음 여행의 힌트, 한국관광공사가 소개하는 지역별 코스를 만나보세요.")}</p></div><Link className="trip-text-link" to={ROUTES.explore}>{uiText("전체 보기 ")}<TripIcon name="arrow" /></Link></header><div className="home-courses-grid">{homeCourses.map(course => <HomeCourseCard key={course.id} course={course} onSelect={setSelected} />)}</div>
    {selected && <HomeCourseDetail key={selected.id} course={selected} onClose={() => setSelected(undefined)} />}
  </section>;
}
