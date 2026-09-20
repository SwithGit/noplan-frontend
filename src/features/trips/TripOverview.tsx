import { useEffect, useMemo, useRef, useState } from 'react';
import { TourismText } from '../../i18n/TourismText';
import { t as uiText } from '../../i18n/translate';
import { TripPlacePhoto, type TripPhotos } from './TripPlacePhoto';
import { TripDialog } from './TripDialog';
import { TripIcon } from './TripIcon';
import { DayRouteMap } from './DayRouteMap';
import { routePoint } from './dayRouteModel';
import { overviewDays, overviewPlaceUrl } from './tripOverviewModel';
import { shortDate, transportLabels, type TripDocument } from './tripModel';
import './dayRoute.css';
import './tripOverview.css';

export function TripOverview({ document, photos, initialDayId, onClose, onEdit, onDayRoute }: {
  document: TripDocument; photos: TripPhotos; initialDayId?: string;
  onClose: () => void; onEdit: (dayId: string) => void; onDayRoute: (dayId: string) => void;
}) {
  const days = useMemo(() => overviewDays(document), [document]);
  const [selection, setSelection] = useState({ dayId: initialDayId || document.days[0]?.id, placeId: '' });
  const [fitRequest, setFitRequest] = useState(0);
  const activeDay = days.find(item => item.day.id === selection.dayId) || days[0];
  const selectedIndex = Math.max(0, activeDay?.stops.findIndex(stop => stop.id === selection.placeId) ?? -1);
  const selected = activeDay?.stops[selectedIndex];
  const list = useRef<HTMLDivElement>(null);
  const sections = useRef(new Map<string, HTMLElement>());
  const cards = useRef(new Map<string, HTMLButtonElement>());
  const filled = days.filter(item => item.stops.length).length;

  const scrollTo = (element?: HTMLElement, smooth = true) => {
    const container = list.current;
    if (!element || !container) return;
    container.scrollTo({
      top: container.scrollTop + element.getBoundingClientRect().top - container.getBoundingClientRect().top - 12,
      behavior: smooth && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto',
    });
  };
  useEffect(() => { scrollTo(sections.current.get(initialDayId || ''), false); }, [initialDayId]);

  const selectDay = (dayId: string) => {
    setSelection({ dayId, placeId: '' });
    setFitRequest(value => value + 1);
    scrollTo(sections.current.get(dayId));
  };
  const selectPlace = (dayId: string, placeId: string) => {
    setSelection({ dayId, placeId });
    scrollTo(cards.current.get(placeId));
  };

  return <TripDialog title={uiText('전체 일정 보기')} className="trip-overview-dialog" onClose={onClose}>
    <div className="overview-layout">
      <aside className="overview-sidebar" aria-label={uiText('날짜별 일정')}>
        <div className="overview-intro">
          <span className="trip-eyebrow">{uiText(document.destination)}</span>
          <h3>{uiText(document.title)}</h3>
          <span>{document.startDate} — {document.endDate}</span>
          <p>{document.days.length}{uiText('일 중 ')}{filled}{uiText('일에 장소를 담았어요. 날짜별 코스를 이어서 살펴보세요.')}</p>
        </div>
        <div className="overview-days" ref={list}>
          {days.map(item => <section className={`overview-day${item.day.id === activeDay?.day.id ? ' is-active' : ''}`} key={item.day.id}
            ref={element => { if (element) sections.current.set(item.day.id, element); else sections.current.delete(item.day.id); }}>
            <button type="button" className="overview-day-heading" aria-pressed={item.day.id === activeDay?.day.id} onClick={() => selectDay(item.day.id)}>
              <span>DAY {String(item.number).padStart(2, '0')}<strong>{shortDate(item.day.date)}</strong></span>
              <small>{uiText(`${item.stops.length}곳`)} · {uiText(transportLabels[item.day.transport || document.transport])}</small>
            </button>
            {item.stops.length ? <ol className="overview-stops">{item.stops.map(stop => <li key={stop.id}>
              <button type="button" className={`overview-stop${selected?.id === stop.id ? ' is-active' : ''}`} aria-pressed={selected?.id === stop.id}
                ref={element => { if (element) cards.current.set(stop.id, element); else cards.current.delete(stop.id); }}
                onClick={() => selectPlace(item.day.id, stop.id)}>
                <b className="overview-stop-number">{stop.number}</b>
                <span className="overview-stop-content">
                  <small>{stop.time || uiText('같은 구간')} · {uiText(stop.blockTitle)}</small>
                  <strong><TourismText place={stop.place} /></strong>
                  <span>{uiText(stop.place.type)} · {uiText(`${stop.place.durationMinutes}분`)}</span>
                  <span className="overview-address"><TourismText place={stop.place} field="address" /></span>
                  {!routePoint(stop.place) && <small className="overview-coordinate-note">{uiText('지도 위치 확인 필요')}</small>}
                </span>
              </button>
            </li>)}</ol> : <div className="overview-empty-day"><p>{uiText('아직 비어 있는 하루예요. 노피와 다음 코스를 만들어 보세요.')}</p><button className="trip-text-link" type="button" onClick={() => onEdit(item.day.id)}>{uiText('코스 만들기')}</button></div>}
          </section>)}
        </div>
      </aside>
      {activeDay && <section className="overview-main" aria-label={uiText('선택한 날짜의 지도')}>
        <div className="overview-map-heading">
          <div aria-live="polite"><span className="trip-eyebrow">DAY {String(activeDay.number).padStart(2, '0')}</span><strong>{shortDate(activeDay.day.date)}</strong><span>{uiText(transportLabels[activeDay.day.transport || document.transport])} · {uiText(`${activeDay.stops.length}곳`)}</span></div>
          <div className="overview-actions"><button className="trip-button" type="button" onClick={() => onDayRoute(activeDay.day.id)}>{uiText('하루 동선 보기')}</button><button className="trip-button primary" type="button" onClick={() => onEdit(activeDay.day.id)}><TripIcon name="spark" />{uiText(activeDay.stops.length ? '코스 수정' : '코스 만들기')}</button></div>
        </div>
        <div className="overview-map">
          <DayRouteMap points={activeDay.points} activeId={selected?.id || ''} focusActive={Boolean(selection.placeId)} fitRequest={fitRequest}
            showPath={!activeDay.hasMissingCoordinates} onSelect={id => selectPlace(activeDay.day.id, id)}
            emptyHint={uiText(activeDay.stops.length ? '위치가 확인된 장소가 없어 지도에 표시할 수 없어요. 장소의 지도 링크에서 확인해 주세요.' : '이날에 장소를 담으면 지도와 동선이 보여요.')} />
          {activeDay.points.length > 0 && <button type="button" className="trip-button overview-fit" onClick={() => { setSelection({ dayId: activeDay.day.id, placeId: '' }); setFitRequest(value => value + 1); }}><TripIcon name="map" />{uiText('이날 지도 전체 보기')}</button>}
        </div>
        <div className="overview-detail">
          <nav className="overview-day-tabs" aria-label={uiText('지도에 표시할 날짜')}>{days.map(item => <button key={item.day.id} type="button" aria-pressed={item.day.id === activeDay.day.id} onClick={() => selectDay(item.day.id)}>DAY {String(item.number).padStart(2, '0')}</button>)}</nav>
          {selected ? <div className="overview-selected-place">
            <TripPlacePhoto name={selected.place.name} photo={photos[selected.place.tourism?.contentId || '']} />
            <div className="overview-selected-copy"><strong><span>{selected.number}</span><TourismText place={selected.place} /></strong><p>{uiText(selected.place.type)} · {uiText(`${selected.place.durationMinutes}분`)}</p><p><TourismText place={selected.place} field="address" /></p><a href={overviewPlaceUrl(selected.place)} target="_blank" rel="noreferrer">{uiText('지도에서 보기 ↗')}</a></div>
            <div className="overview-place-paging"><button className="trip-icon-button" type="button" disabled={selectedIndex === 0} aria-label={uiText('이전 장소')} onClick={() => selectPlace(activeDay.day.id, activeDay.stops[selectedIndex - 1].id)}>‹</button><span>{selectedIndex + 1} / {activeDay.stops.length}</span><button className="trip-icon-button" type="button" disabled={selectedIndex === activeDay.stops.length - 1} aria-label={uiText('다음 장소')} onClick={() => selectPlace(activeDay.day.id, activeDay.stops[selectedIndex + 1].id)}>›</button></div>
          </div> : <p className="overview-detail-empty">{uiText('이날에 장소를 담으면 지도와 동선이 보여요.')}</p>}
          <p className="overview-map-note">{uiText(activeDay.hasMissingCoordinates ? '위치가 확인된 장소만 표시해요. 위치가 없는 장소는 목록에서 확인해 주세요.' : '점선은 방문 순서예요. 도로 모양과 다를 수 있어요.')}</p>
        </div>
      </section>}
    </div>
  </TripDialog>;
}
