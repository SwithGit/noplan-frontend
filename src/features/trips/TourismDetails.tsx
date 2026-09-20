import { useLocale } from '../../i18n/locale';
import { t as uiText } from '../../i18n/translate';
import { useEffect, useState } from 'react';
import { getTourismDetail, type TourismAttraction, type TourismDetail } from '../../api/tourismApi';
import { TripIcon } from './TripIcon';

// Mounted with the selected content ID as its key, so late responses never show
// another place's facts or retain expanded text when the selection changes.
export function TourismDetails({ place, wide = false }: { place: TourismAttraction; wide?: boolean }) {
  const locale = useLocale();
  const [attempt, setAttempt] = useState(0);
  const [response, setResponse] = useState<{ attempt: number; locale: string; data?: TourismDetail; error?: string }>();
  const [expanded, setExpanded] = useState(false);
  const data = response?.attempt === attempt && response.locale === locale ? response.data : undefined;
  const error = response?.attempt === attempt && response.locale === locale ? response.error : undefined;
  const loading = response?.attempt !== attempt || response.locale !== locale;
  useEffect(() => {
    const request = new AbortController();
    getTourismDetail(place.contentId, place.contentTypeId, request.signal, locale)
      .then(data => { if (!request.signal.aborted) setResponse({ attempt, locale, data }); })
      .catch(cause => { if (!request.signal.aborted) setResponse({ attempt, locale, error: cause instanceof Error ? cause.message : '상세정보를 불러오지 못했어요.' }); });
    return () => request.abort();
  }, [place.contentId, place.contentTypeId, attempt, locale]);
  const query = `${place.address.split(/\s+/).slice(0, 2).join(' ')} ${place.name}`.trim();
  const noFacts = data && !data.overview && !data.facts.length && !data.extras.length && !data.course?.stops.length && !data.course?.duration && !data.course?.distance;
  return <div className="tourism-place-information">
    <div className="tourism-external-links">
      <a className="tourism-naver-link" href={`https://map.naver.com/p/search/${encodeURIComponent(query)}`} target="_blank" rel="noreferrer">{uiText("네이버지도에서 검색 ")}<TripIcon name="arrow" /></a>
      <a href={`https://map.kakao.com/link/map/${encodeURIComponent(place.name)},${place.lat},${place.lng}`} target="_blank" rel="noreferrer">{uiText(place.contentTypeId === '25' ? '코스 대표 위치 확인' : '카카오맵 위치 확인')} <TripIcon name="arrow" /></a>
      {data?.homepage && <a href={data.homepage} target="_blank" rel="noreferrer">{uiText("공식 홈페이지 ")}<TripIcon name="arrow" /></a>}
    </div>
    <div aria-live="polite" aria-busy={loading}>
      {loading && <div className="tourism-info-loading" role="status"><span />{uiText("장소 정보를 불러오고 있어요…")}</div>}
      {(error || data?.partial) && <div className="tourism-info-message" role="status"><p>{uiText(error || '일부 정보를 불러오지 못했어요. 확인된 정보부터 보여드려요.')}</p><button type="button" className="trip-text-link" onClick={() => setAttempt(value => value + 1)}>{uiText("상세정보 다시 불러오기")}</button></div>}
    </div>
    {data && <>
      {data.translationStatus && data.translationStatus !== 'translated' && <p className="tourism-language-notice" role="status">{uiText(data.translationStatus === 'unavailable' ? '외국어 관광정보에 연결하지 못해 한국어 원문을 표시해요.' : '외국어 관광정보가 없어 한국어 원문을 표시해요.')}</p>}
      {data.translationStatus === 'translated' && <p className="tourism-language-notice">{uiText('한국관광공사 공식 외국어 관광정보')}</p>}
      {data.course && (data.course.duration || data.course.distance) && <section className="tourism-course-summary" aria-label={uiText("전체 여행코스 안내")}><h4>{uiText("전체 코스 기준")}</h4><div>{data.course.duration && <span><TripIcon name="calendar" />{data.course.duration}</span>}{data.course.distance && <span><TripIcon name="map" />{data.course.distance}</span>}</div><p>{uiText("아래에 입력하는 시간은 이번 구간에 배정할 시간이에요.")}</p></section>}
      {data.overview && <section className="tourism-info-section"><h4>{uiText("어떤 곳인가요?")}</h4><p className="tourism-overview">{wide || expanded || data.overview.length <= 240 ? data.overview : `${data.overview.slice(0, 240)}…`}</p>{!wide && data.overview.length > 240 && <button type="button" className="trip-text-link" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{uiText(expanded ? '소개 접기' : '소개 더 보기')}</button>}</section>}
      {data.facts.length > 0 && <section className="tourism-info-section"><h4>{uiText("방문 전에 알아두세요")}</h4><dl className="tourism-facts">{data.facts.map(fact => <div key={fact.label}><dt>{uiText(fact.label)}</dt><dd>{fact.value}</dd></div>)}</dl></section>}
      {data.course && data.course.stops.length > 0 && <section className="tourism-info-section"><h4>{uiText("코스에 포함된 장소 ")}<span>{data.course.stops.length}{uiText("곳")}</span></h4><ol className="tourism-course-stops">{data.course.stops.map((stop, index) => <li key={`${index}:${stop.name}`}><span>{index + 1}</span>{stop.description ? <details><summary>{stop.name}</summary><p>{uiText(stop.description)}</p></details> : <strong>{stop.name}</strong>}</li>)}</ol></section>}
      {data.extras.length > 0 && <section className="tourism-info-section"><h4>{uiText("추가 이용안내")}</h4>{data.extras.map((fact, index) => <details className="tourism-extra-fact" key={`${index}:${fact.label}`}><summary>{uiText(fact.label)}</summary><p>{fact.value}</p></details>)}</section>}
      {noFacts && <p className="tourism-info-message">{uiText("관광공사에 등록된 상세 설명이 없어요. 네이버지도에서 사진과 방문 정보를 확인해 보세요.")}</p>}
      <p className="tourism-detail-note">{uiText("정보 제공: ")}{uiText(data.sourceLabel)}{uiText(". 운영시간·요금은 변경될 수 있으니 방문 전에 확인해 주세요.")}</p>
    </>}
  </div>;
}
