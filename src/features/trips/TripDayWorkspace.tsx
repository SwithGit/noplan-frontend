import { TourismText } from '../../i18n/TourismText';
import { t as uiText } from '../../i18n/translate';
import { useMemo, useRef, useState } from 'react';
import { TripIcon } from './TripIcon';
import { TripDetailSelect } from './TripDetailSelect';
import { TripPlacePhoto, type TripPhotos } from './TripPlacePhoto';
import { DayRouteMap } from './DayRouteMap';
import { orderedBlocks, routePoint, moveDayOuting } from './dayRouteModel';
import { workspaceStops, workspaceLegs, workspaceTime, removeWorkspacePlace } from './dayWorkspaceModel';
import { useWorkspaceRoutes } from './useWorkspaceRoutes';
import { courseDistanceLimit, courseDistanceLabel, withDayTransport } from './coursePolicy';
import { courseDisplayText } from './courseText';
import { minutes, shortDate, transportLabels, usedMinutes, type TripBlock, type TripDay, type TripDocument, type TripPlace } from './tripModel';
import nopi from '../../assets/nopi/nopi-icon.png';
import './dayRoute.css';
import './tripDayWorkspace.css';

export function TripDayWorkspace({ document, day, photos, disabled, onChange, onDay, onPlanner, onSettings, onOverview, onRoute, onAdd, onEdit, onBlock, onAddBlock }: {
  document: TripDocument; day: TripDay; photos: TripPhotos; disabled: boolean;
  onChange: (document: TripDocument) => void; onDay: (id: string) => void;
  onAddBlock: () => void; onPlanner: () => void; onSettings: () => void; onOverview: () => void; onRoute: () => void;
  onAdd: (block?: TripBlock) => void; onEdit: (block: TripBlock, place: TripPlace) => void; onBlock: (block: TripBlock) => void;
}) {
  const [active, setActive] = useState('');
  const [openCondition, setOpenCondition] = useState<string | null>(null);
  const [showReason, setShowReason] = useState(false);
  const cards = useRef(new Map<string, HTMLElement>());
  const blocks = orderedBlocks(day), stops = workspaceStops(day), legs = workspaceLegs(day);
  const transport = day.transport || document.transport;
  const { routes, error, loading, retry } = useWorkspaceRoutes(day, transport);
  const points = useMemo(() => workspaceStops(day).flatMap(stop => {
    const point = routePoint(stop.place);
    return point ? [{ ...point, id: stop.place.id, number: stop.number, name: stop.place.name }] : [];
  }), [day]);
  const activeId = stops.some(stop => stop.place.id === active) ? active : stops[0]?.place.id || '';
  const dayIndex = document.days.findIndex(item => item.id === day.id);
  const selected = stops.find(stop => stop.place.id === activeId);
  const limit = courseDistanceLimit(transport);
  const beyond = routes.filter(route => route.status === 'ok' && limit > 0 && (route.distanceMeters || 0) > limit).length;
  const known = routes.filter(route => route.status === 'ok' && route.durationMinutes != null);
  const purpose = document.companion === '연인' ? '데이트' : document.companion === '가족' ? '가족여행' : document.companion === '친구' ? '친구모임' : '발견';
  const changeDay = (next: TripDay) => { if (!disabled) onChange({ ...document, days: document.days.map(item => item.id === day.id ? next : item) }); };
  const select = (id: string, scroll = false) => { setActive(id); if (scroll) cards.current.get(id)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
  const move = (block: TripBlock, offset: -1 | 1) => changeDay(moveDayOuting(day, block.id, offset));
  const moveInside = (block: TripBlock, index: number, offset: -1 | 1) => {
    const other = block.places[index + offset];
    if (!other || other.fixed || block.places[index].fixed) return;
    const places = [...block.places]; [places[index], places[index + offset]] = [places[index + offset], places[index]];
    changeDay({ ...day, blocks: day.blocks.map(item => item.id === block.id ? { ...item, places } : item) });
  };
  return <div className="journey-day-layout">
    <section className="journey-day-editor" aria-label={uiText("하루 일정 편집")}>
      <header className="journey-day-heading"><span className="trip-eyebrow">MY TRAVEL NOTE</span><div><h1>{uiText(document.title)}</h1><button type="button" className="trip-icon-button" aria-label={uiText("여행 제목과 조건 수정")} disabled={disabled} onClick={onSettings}><TripIcon name="menu" /></button></div><p><span><TripIcon name="calendar" />{shortDate(day.date)}</span><span><TripIcon name="clock" />{blocks[0]?.startTime || '09:00'}–{blocks.at(-1)?.endTime || '18:00'}</span><span><TripIcon name={transport === 'walk' ? 'walk' : 'transport'} />{uiText(transportLabels[transport])}</span><span><TripIcon name="people" />{uiText(document.companion === '혼자' ? '혼자 떠나는 여행' : `${document.companion}와 함께`)}</span></p></header>
      <nav className="journey-day-tabs" aria-label={uiText("여행 날짜")}>{document.days.map((item, index) => <button key={item.id} type="button" aria-pressed={day.id === item.id} onClick={() => { onDay(item.id); setActive(''); }}><b>DAY {String(index + 1).padStart(2, '0')}</b><span>{shortDate(item.date)}</span><small>{item.blocks.reduce((sum, block) => sum + block.places.length, 0)}{uiText("곳")}</small></button>)}</nav>
      <div className="journey-condition-row">
        <div className={disabled ? 'journey-conditions-disabled' : ''} inert={disabled}>
          <TripDetailSelect label={uiText("함께하는 사람")} icon="people" value={document.companion} options={['혼자','친구','연인','가족','동료'].map(value => ({ value, label: value, icon: 'people' as const }))} open={openCondition === 'companion'} onOpenChange={open => setOpenCondition(open ? 'companion' : null)} onChange={companion => onChange({ ...document, companion })} />
          <button className="journey-condition" type="button" onClick={onSettings}><TripIcon name="pin" />{document.destination}<TripIcon name="down" /></button>
          <TripDetailSelect<TripDocument['transport']> label={uiText("이날 이동 방식")} icon={transport === 'walk' ? 'walk' : 'transport'} value={transport} open={openCondition === 'transport'} onOpenChange={open => setOpenCondition(open ? 'transport' : null)} onChange={value => changeDay(withDayTransport(day, value, document.transport))} options={[
            { value: 'walk', label: '도보', icon: 'walk', description: '장소 사이 이동 최대 1km' },
            { value: 'car', label: '자가용·렌터카', icon: 'transport', description: '장소 사이 이동 최대 7km' },
            { value: 'transit', label: '대중교통', icon: 'bus', description: '자동 추천 준비 중 · 직접 편집' },
          ]} />
          <button className="journey-condition" type="button" onClick={onPlanner}><TripIcon name="spark" />{purpose}<TripIcon name="down" /></button>
        </div><button className="trip-text-link" type="button" disabled={disabled} onClick={onSettings}>{uiText("조건 수정")}</button>
      </div>
      <div className="journey-main-actions"><button className="trip-button primary" type="button" disabled={disabled} onClick={onPlanner}><img src={nopi} alt="" />{uiText("노피의 코스플래닝")}</button><button className="trip-button" type="button" disabled={disabled} onClick={() => onAdd()}><TripIcon name="plus" />{uiText("직접 장소 추가")}</button></div>
      <div className="journey-nopi-note"><img src={nopi} alt="" /><span>{uiText(!stops.length ? '가고 싶은 곳부터, 우리만의 하루를 채워볼까요?' : beyond ? `이동 범위를 넘는 ${beyond}개 구간이 있어요. 가까운 장소로 바꿔보세요.` : `담아둔 ${stops.length}곳을 한눈에 보고, 우리에게 맞게 바꿔보세요.`)}</span><button type="button" onClick={() => setShowReason(value => !value)} aria-expanded={showReason}>{uiText("코스 안내 ")}<TripIcon name="down" /></button></div>
      {showReason && <div className="journey-reason"><p>{uiText("노피는 선택한 여행 목적과 성·연령 추천 기준, 장소 사이 이동거리를 함께 고려해 코스를 만들어요. 추천 조건은 노피의 코스플래닝에서 변경할 수 있어요.")}</p><p>{uiText(transport === 'transit' ? '대중교통 자동 추천은 준비 중이에요.' : `자동 추천은 실제 경로 ${courseDistanceLabel(transport)} 이내로 연결해요.`)}{uiText(" 직접 추가한 장소는 거리 제한을 넘으면 안내해요.")}</p><p>{uiText("지도의 점선은 방문 순서예요. 이동시간은 현재 조회 기준이며, 장소를 옮겨도 예약한 시간대는 유지돼요.")}</p></div>}
      {error && <div className="trip-alert" role="status">{uiText(error)}<button type="button" onClick={retry}>{uiText("다시 조회")}</button></div>}
      <div className="journey-stop-list">
        {blocks.map((block, blockIndex) => !block.places.length ? <article className="journey-empty-slot" key={block.id}><div><TripIcon name="clock" /><span>{block.startTime}–{block.endTime}</span><strong>{uiText(block.title)}</strong></div><button className="trip-text-link" type="button" disabled={disabled} onClick={() => onAdd(block)}><TripIcon name="plus" />{uiText("가고 싶은 장소 담기")}</button><button className="trip-icon-button" type="button" disabled={disabled} aria-label={uiText(`${block.title} 시간 수정`)} onClick={() => onBlock(block)}><TripIcon name="menu" /></button><button className="trip-icon-button" type="button" disabled={disabled} aria-label={uiText(`${block.title} 빈 구간 삭제`)} onClick={() => changeDay({ ...day, blocks: day.blocks.filter(item => item.id !== block.id) })}><TripIcon name="close" /></button></article> : stops.filter(stop => stop.block.id === block.id).map(stop => {
          const { place, index } = stop;
          const leg = legs.find(item => item.next.place.id === place.id), route = routes.find(item => item.id === leg?.id);
          const available = route?.status === 'ok' && route.durationMinutes != null;
          const tooFar = available && limit > 0 && (route.distanceMeters || 0) > limit;
          const late = available && leg ? Math.max(0, leg.previous.departure + route.durationMinutes! - stop.arrival) : 0;
          const notes = courseDisplayText(block.notes);
          return <div key={place.id}>
            {leg && <div className={`journey-transfer ${tooFar || late ? 'needs-check' : ''}`}><TripIcon name={transport === 'walk' ? 'walk' : 'transport'} /><span>{uiText(loading && leg.from && leg.to ? '이동시간 확인 중…' : available ? `${transportLabels[transport]} 약 ${route.durationMinutes}분 · ${route.distanceMeters != null ? route.distanceMeters < 1000 ? `${Math.round(route.distanceMeters)}m` : `${(route.distanceMeters / 1000).toFixed(1)}km` : '거리 확인 필요'}` : transport === 'transit' ? '대중교통 이동시간 확인 필요' : '이동시간 확인 필요')}{tooFar && <small>{uiText("권장 이동 범위 초과 · 가까운 장소로 변경해 보세요.")}</small>}{late > 0 && <small>{uiText("예정된 도착 시간보다 약 ")}{late}{uiText("분 늦어져요. 시간을 조정해 주세요.")}</small>}</span>{leg.from && leg.to && <a href={`https://map.kakao.com/link/from/${encodeURIComponent(leg.previous.place.name)},${leg.from.lat},${leg.from.lng}/to/${encodeURIComponent(place.name)},${leg.to.lat},${leg.to.lng}`} target="_blank" rel="noreferrer">{uiText("길찾기 ↗")}</a>}</div>}
            <article ref={element => { if (element) cards.current.set(place.id, element); else cards.current.delete(place.id); }} className={`journey-stop ${activeId === place.id ? 'selected' : ''}`}>
              <div className="journey-stop-time"><b>{stop.number}</b><span>{workspaceTime(stop.arrival)}</span>{stop.provisional && <small>{uiText("임시 시간")}</small>}</div>
              <div className="journey-stop-card">
                <button className="journey-stop-select" type="button" aria-label={uiText(`$<TourismText place={place} /> 지도에서 보기`)} aria-pressed={activeId === place.id} onClick={() => select(place.id)}>
                  <TripPlacePhoto name={place.name} photo={photos[place.tourism?.contentId || '']} />
                  <span className="journey-stop-copy"><span className="journey-stop-category">{uiText(place.type || '여행 장소')}</span><strong><TourismText place={place} /></strong><span className="journey-stop-address"><TripIcon name="pin" />{uiText(place.address || '주소 정보 없음')}</span><span className="journey-stop-meta"><span><TripIcon name="clock" />{place.durationMinutes}{uiText("분")}</span>{place.tourism ? <span>{uiText("한국관광공사")}</span> : <span>{uiText(place.candidateSource === 'live' ? '직접 검색' : '직접 담은 장소')}</span>}{place.fixed && <span><TripIcon name="lock" />{uiText("고정")}</span>}</span></span>
                </button>
                <div className="journey-stop-actions"><button type="button" className="trip-text-link" disabled={disabled} onClick={() => onEdit(block, place)}>{uiText("상세·장소 변경")}</button><button type="button" className="trip-text-link" disabled={disabled} onClick={() => onBlock(block)}>{uiText("시간·메모 수정")}</button><div>
                  {!place.tourism && <button type="button" className="trip-icon-button" disabled={disabled} aria-label={uiText(`$<TourismText place={place} /> ${place.fixed ? '고정 해제' : '고정'}`)} onClick={() => changeDay({ ...day, blocks: day.blocks.map(item => item.id === block.id ? { ...item, places: item.places.map(p => p.id === place.id ? { ...p, fixed: !p.fixed } : p) } : item) })}><TripIcon name={place.fixed ? 'lock' : 'unlock'} /></button>}
                  <button type="button" className="trip-icon-button" aria-label={uiText(`$<TourismText place={place} /> 위로`)} disabled={disabled || (index === 0 ? blockIndex === 0 : place.fixed || block.places[index - 1]?.fixed)} onClick={() => index === 0 ? move(block, -1) : moveInside(block, index, -1)}><TripIcon name="up" /></button>
                  <button type="button" className="trip-icon-button" aria-label={uiText(`$<TourismText place={place} /> 아래로`)} disabled={disabled || (index === 0 ? blockIndex === blocks.length - 1 : place.fixed || index === block.places.length - 1 || block.places[index + 1]?.fixed)} onClick={() => index === 0 ? move(block, 1) : moveInside(block, index, 1)}><TripIcon name="down" /></button>
                  <button type="button" className="trip-icon-button" aria-label={uiText(`$<TourismText place={place} /> 삭제`)} disabled={disabled} onClick={() => { if (window.confirm(`$<TourismText place={place} />을 일정에서 뺄까요? 되돌리기로 복구할 수 있어요.`)) changeDay(removeWorkspacePlace(day, place)); }}><TripIcon name="close" /></button>
                </div></div>
                {index === 0 && notes && <details className="journey-stop-notes"><summary>{uiText("방문 정보·메모")}</summary><p>{notes}</p></details>}
                {index === 0 && usedMinutes(block) > minutes(block.endTime) - minutes(block.startTime) && <p className="trip-alert">{uiText("체류·이동 시간이 구간을 넘어요. 시간을 조정해 주세요.")}</p>}
              </div>
            </article>
          </div>;
        }))}
        {!blocks.length && <div className="journey-blank-day"><img src={nopi} alt="" /><h2>{uiText("우리의 하루는 어디서 시작할까요?")}</h2><p>{uiText("노피에게 추천받거나, 가고 싶은 장소를 직접 담아보세요.")}</p><button className="trip-button" type="button" disabled={disabled} onClick={() => onAdd()}>{uiText("첫 장소 담기")}</button></div>}
      </div>
      <footer className="journey-day-footer"><button className="trip-button" type="button" disabled={disabled || day.blocks.length >= 12} onClick={onAddBlock}><TripIcon name="plus" />{uiText("구간 추가")}</button><button className="trip-button" type="button" onClick={onOverview}>{uiText("전체 일정 보기 ")}<TripIcon name="arrow" /></button>{dayIndex + 1 < document.days.length && <button className="trip-button primary" type="button" onClick={() => onDay(document.days[dayIndex + 1].id)}>DAY {String(dayIndex + 2).padStart(2, '0')}{uiText(" 일정 만들기 ")}<TripIcon name="arrow" /></button>}</footer>
    </section>
    <aside className="journey-day-map" aria-label={uiText("선택한 날짜의 전체 동선 지도")}><div className="journey-map-toolbar"><div><span className="trip-eyebrow">DAY {String(dayIndex + 1).padStart(2, '0')} · OUR ROUTE</span><strong>{stops.length}{uiText("곳으로 이어지는 하루")}</strong></div><button className="trip-button" type="button" onClick={onRoute}><TripIcon name="map" />{uiText("동선 크게 보기")}</button></div><div className="journey-map-canvas"><DayRouteMap points={points} activeId={activeId} onSelect={id => select(id, true)} focusActive emptyHint="왼쪽에서 장소를 담거나 노피에게 코스를 추천받아 보세요." /><div className="journey-map-caption">{uiText("점선은 방문 순서이며 실제 도로 경로가 아니에요.")}</div></div><div className="journey-map-bottom"><div><strong>{uiText(selected?.place.name || '가고 싶은 곳을 담아보세요')}</strong><span>{uiText(loading ? '장소 사이 이동을 확인하고 있어요…' : legs.length && known.length === legs.length ? `장소 사이 이동 약 ${known.reduce((sum, route) => sum + route.durationMinutes!, 0)}분 · 현재 조회 기준` : points.length ? `${points.length}곳의 위치를 지도에 표시했어요.` : '여행 장소와 동선을 여기서 함께 볼 수 있어요.')}</span></div>{selected && <a className="trip-text-link" href={`https://map.kakao.com/link/search/${encodeURIComponent(`${selected.place.name} ${selected.place.address}`)}`} target="_blank" rel="noreferrer">{uiText("장소 지도 ↗")}</a>}</div></aside>
  </div>;
}
