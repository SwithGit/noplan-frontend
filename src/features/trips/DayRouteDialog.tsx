import { TourismText } from '../../i18n/TourismText';
import { t as uiText } from '../../i18n/translate';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getDayRoutes, type DayRouteResult } from '../../api/dayRouteApi';
import { DayRouteMap } from './DayRouteMap';
import { dayRouteLegs, moveDayOuting, orderedBlocks, routePoint, type RoutePoint } from './dayRouteModel';
import { tripExclusions } from './nopiModel';
import { PlacePicker } from './PlacePicker';
import { putTripPlace } from './placeIdentity';
import { TripDialog } from './TripDialog';
import { TripIcon } from './TripIcon';
import { minutes, shortDate, transportLabels, usedMinutes, type TripDay, type TripDocument } from './tripModel';
import './dayRoute.css';

const durationText = (value: number) => value >= 60 ? `${Math.floor(value / 60)}시간${value % 60 ? ` ${value % 60}분` : ''}` : `${value}분`;

export function DayRouteDialog({ document, dayId, disabled, onClose, onApply }: {
  document: TripDocument; dayId: string; disabled: boolean; onClose: () => void;
  onApply: (day: TripDay, transport: TripDocument['transport'], baseline: string) => void;
}) {
  const [draft, setDraft] = useState(() => document.days.find(day => day.id === dayId)!);
  const [transport, setTransport] = useState(draft.transport || document.transport);
  const [baseline] = useState(() => JSON.stringify(document));
  const [activeId, setActiveId] = useState(draft.blocks[0]?.id || '');
  const [pickerId, setPickerId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [applyError, setApplyError] = useState('');
  const [response, setResponse] = useState<{ key: string; routes?: DayRouteResult[]; error?: string }>();
  const cards = useRef(new Map<string, HTMLElement>());
  const blocks = orderedBlocks(draft);
  const legs = dayRouteLegs(draft);
  const request = JSON.stringify({ transport, legs: legs.filter(leg => leg.origin && leg.destination).map(leg => ({ id: leg.id, from: leg.origin!, to: leg.destination! })) });
  const requestKey = `${attempt}:${request}`;
  const currentResponse = response?.key === requestKey ? response : undefined;
  const loading = transport !== 'transit' && legs.some(leg => leg.origin && leg.destination) && !currentResponse;
  const points = useMemo(() => orderedBlocks(draft).flatMap((block, index) => {
    const anchor = block.places.find(place => place.tourism) || block.places[0], point = routePoint(anchor);
    return point ? [{ ...point, id: block.id, number: index + 1, name: anchor.name }] : [];
  }), [draft]);
  const pickerBlock = draft.blocks.find(block => block.id === pickerId);
  const pickerAnchor = pickerBlock?.places.find(place => place.tourism) || pickerBlock?.places[0];
  const changed = transport !== (document.days.find(day => day.id === dayId)?.transport || document.transport) || baseline !== JSON.stringify({ ...document, days: document.days.map(day => day.id === dayId ? draft : day) });

  useEffect(() => {
    const payload = JSON.parse(request) as { transport: TripDocument['transport']; legs: { id: string; from: RoutePoint; to: RoutePoint }[] };
    if (payload.transport === 'transit' || !payload.legs.length) return;
    const controller = new AbortController();
    // Reordering can happen in quick succession; only query the final positions.
    const timer = window.setTimeout(() => {
      getDayRoutes(payload.transport, payload.legs, controller.signal)
        .then(result => { if (!controller.signal.aborted) setResponse({ key: requestKey, routes: result.legs }); })
        .catch(() => { if (!controller.signal.aborted) setResponse({ key: requestKey, error: '이동시간을 불러오지 못했어요. 다시 조회하거나 카카오맵에서 확인해 주세요.' }); });
    }, 450);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [request, requestKey]);

  const select = (id: string) => { setActiveId(id); cards.current.get(id)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
  const close = () => { if (!changed || window.confirm('동선에서 바꾼 내용을 반영하지 않고 닫을까요?')) onClose(); };
  const move = (id: string, offset: -1 | 1) => {
    const target = blocks[blocks.findIndex(block => block.id === id) + offset];
    setDraft(moveDayOuting(draft, id, offset));
    if (target) setActiveId(target.id);
  };
  const successful = currentResponse?.routes?.filter(route => route.status === 'ok') || [];
  const allKnown = legs.length > 0 && successful.length === legs.length && !loading && transport !== 'transit';
  const tightCount = legs.filter(leg => {
    const result = currentResponse?.routes?.find(route => route.id === leg.id);
    return result?.status === 'ok' && result.durationMinutes != null && result.durationMinutes > leg.availableMinutes;
  }).length;

  return <>
    <TripDialog title={uiText("하루 동선 보기")} className="day-route-dialog" onClose={close}>
      <div className="day-route-toolbar"><div><span className="trip-eyebrow">DAY {String(document.days.findIndex(day => day.id === dayId) + 1).padStart(2, '0')} · {document.destination}</span><strong>{shortDate(draft.date)}{uiText("의 여정")}</strong><span>{uiText("장소 사이의 이동을 살펴보고 하루 순서를 정해 보세요.")}</span></div><label>{uiText("여행 중 이동")}<select aria-label={uiText("동선 이동수단")} value={transport} onChange={event => setTransport(event.target.value as TripDocument['transport'])}>{Object.entries(transportLabels).map(([value, label]) => <option key={value} value={value}>{uiText(label)}</option>)}</select></label></div>
      <div className="day-route-layout">
        <section className="day-route-map-section" aria-label={uiText("하루 중심 장소 지도")}>
          <DayRouteMap points={points} activeId={activeId} onSelect={select} />
          <div className="day-route-map-summary"><span className="trip-eyebrow">{uiText("오늘의 동선")}</span><strong>{points.length}{uiText("개 중심 장소 ")}<span>· {uiText(transportLabels[transport])}</span></strong><p>{uiText(loading ? '구간 사이 이동시간을 확인하고 있어요…' : allKnown ? `구간 사이 이동 약 ${durationText(successful.reduce((sum, route) => sum + route.durationMinutes!, 0))}${tightCount ? ` · 빠듯한 구간 ${tightCount}개` : ''}` : !legs.length ? '두 구간 이상 장소를 담으면 이동시간도 확인할 수 있어요.' : '이동시간이 확인되지 않은 구간을 살펴봐 주세요.')}</p></div>
          <div className="day-route-map-caption">{uiText("점선은 방문 순서를 연결한 선이며 실제 도로 경로가 아니에요.")}</div>
        </section>
        <section className="day-route-list" aria-label={uiText("하루 방문 순서")}>
          <div className="day-route-list-heading"><h3>{uiText("하루의 순서")}</h3><p>{uiText("시간대는 유지하고, 주변 장소도 함께 옮겨요.")}</p></div>
          {currentResponse?.error && <div className="trip-alert" role="alert">{uiText(currentResponse.error)}<button type="button" onClick={() => setAttempt(value => value + 1)}>{uiText("이동시간 다시 조회")}</button></div>}
          {transport === 'transit' && <p className="trip-alert">{uiText("대중교통 소요시간은 아직 연동되지 않았어요. 각 구간의 길찾기에서 확인해 주세요.")}</p>}
          {!blocks.length && <p className="trip-muted">{uiText("일정 화면에서 구간을 먼저 추가해 주세요.")}</p>}
          {blocks.map((block, index) => {
            const anchor = block.places.find(place => place.tourism) || block.places[0];
            const leg = legs.find(item => item.nextId === block.id);
            const route = leg && currentResponse?.routes?.find(item => item.id === leg.id);
            const known = route?.status === 'ok' && route.durationMinutes != null;
            const shortage = known && leg ? Math.max(0, route.durationMinutes! - leg.availableMinutes) : 0;
            const overrun = usedMinutes(block) - (minutes(block.endTime) - minutes(block.startTime));
            const routeUrl = leg?.origin && leg.destination ? `https://map.kakao.com/link/from/${encodeURIComponent(leg.from.name)},${leg.origin.lat},${leg.origin.lng}/to/${encodeURIComponent(leg.to.name)},${leg.destination.lat},${leg.destination.lng}` : null;
            return <div key={block.id}>
              {leg && <div className={`day-route-transfer ${shortage ? 'tight' : ''}`} role="status"><TripIcon name="arrow" /><div><strong>{uiText(loading && leg.origin && leg.destination ? '이동시간 확인 중…' : known ? `${transportLabels[transport]} 약 ${durationText(route.durationMinutes!)}` : '이동시간 확인 필요')}{known && <span> · {(route.distanceMeters! / 1000).toFixed(1)}km</span>}</strong><p>{leg.from.name} → {leg.to.name}</p>{known ? <><small>{uiText(route.parkingMinutes ? `주차 여유 ${route.parkingMinutes}분 포함 · ` : '')}{uiText(shortage ? `다음 구간 시작까지 ${durationText(shortage)} 부족해요.` : `이동 후 ${durationText(leg.availableMinutes - route.durationMinutes!)} 여유가 있어요.`)}</small><small>{uiText(route.source === 'same_location' ? '같은 위치' : route.source === 'kakao_driving' ? '카카오 자동차 경로' : route.source === 'tmap_pedestrian' ? 'TMAP 도보 경로' : 'Google 도보 경로')}{uiText(" · 현재 조회 기준")}</small></> : <small>{uiText(loading && leg.origin && leg.destination ? '경로를 조회하고 있어요.' : !leg.origin || !leg.destination ? '출발 또는 도착 장소에 좌표가 없어요.' : transport === 'transit' ? '대중교통 길찾기에서 확인해 주세요.' : '경로 정보를 확인하지 못했어요.')}</small>}{routeUrl && <a href={routeUrl} target="_blank" rel="noreferrer">{uiText("카카오맵 길찾기 ↗")}</a>}{!loading && !known && transport !== 'transit' && leg.origin && leg.destination && !currentResponse?.error && <button className="trip-text-link" type="button" onClick={() => setAttempt(value => value + 1)}>{uiText("다시 조회")}</button>}</div></div>}
              <article ref={element => { if (element) cards.current.set(block.id, element); else cards.current.delete(block.id); }} className={`day-route-card ${activeId === block.id ? 'active' : ''}`}>
                <div className="day-route-card-top"><span>{String(index + 1).padStart(2, '0')}</span><strong>{block.startTime} — {block.endTime}</strong><div><button className="trip-icon-button" type="button" aria-label={uiText(`${anchor?.name || block.title} 이전 시간대로`)} disabled={disabled || index === 0} onClick={() => move(block.id, -1)}><TripIcon name="up" /></button><button className="trip-icon-button" type="button" aria-label={uiText(`${anchor?.name || block.title} 다음 시간대로`)} disabled={disabled || index === blocks.length - 1} onClick={() => move(block.id, 1)}><TripIcon name="down" /></button></div></div>
                <button className="day-route-place-title" type="button" onClick={() => setActiveId(block.id)}><small>{uiText(block.title)}</small><h3>{uiText(anchor?.name || '가고 싶은 장소를 담아보세요')}</h3></button>
                {anchor && <><p className="day-route-address">{uiText(anchor.address || '주소 정보 없음')}</p><div className="day-route-stops">{block.places.map(place => <span key={place.id}><TourismText place={place} /><small>{place.durationMinutes}{uiText("분")}</small></span>)}</div></>}
                {overrun > 0 && <p className="trip-alert">{uiText("체류·구간 내 이동이 시간대를 ")}{durationText(overrun)}{uiText(" 넘어요. 일정 화면에서 시간을 조정해 주세요.")}</p>}
                <div className="day-route-card-footer"><button type="button" className="trip-text-link" disabled={disabled} onClick={() => setPickerId(block.id)}><TripIcon name="pin" />{uiText(anchor ? '장소 교체' : '중심 장소 담기')}</button>{anchor && <a className="trip-text-link" href={`https://map.kakao.com/link/search/${encodeURIComponent(`$<TourismText place={anchor} /> ${anchor.address}`)}`} target="_blank" rel="noreferrer">{uiText("장소 지도 ↗")}</a>}</div>
              </article>
            </div>;
          })}
          <p className="day-route-list-note">{uiText("이동 여유는 앞 구간 종료부터 다음 구간 시작까지 계산해요. 구간 내 미확인 이동은 기존 일정의 임시 시간(15분)을 사용하며, 영업시간과 방문일 교통 상황은 별도 확인이 필요해요.")}</p>
        </section>
      </div>
      <footer className="day-route-footer">{applyError && <p className="trip-alert" role="alert">{applyError}</p>}<div><strong>{uiText(changed ? '바꾼 동선을 일정에 반영할까요?' : '하루 동선을 확인했어요')}</strong><span>{uiText(transport !== (draft.transport || document.transport) ? '이동수단 변경은 이날 일정에 적용돼요.' : '장소 순서와 교체 내용은 반영 버튼을 눌러야 저장돼요.')}</span></div><button className="trip-button" type="button" onClick={close}>{uiText("닫기")}</button><button className="trip-button primary" type="button" disabled={disabled} onClick={() => { try { onApply(draft, transport, baseline); } catch (cause) { setApplyError(cause instanceof Error ? cause.message : '일정을 반영하지 못했어요. 다시 시도해 주세요.'); } }}>{uiText(changed ? '변경한 동선 반영' : '확인하고 돌아가기')}<TripIcon name="check" /></button></footer>
    </TripDialog>
    {pickerBlock && <PlacePicker destination={document.destination} initial={pickerAnchor} excluded={tripExclusions({ ...document, days: document.days.map(day => day.id === draft.id ? draft : day) }, undefined, pickerAnchor?.id)} context={uiText(`${shortDate(draft.date)} · ${pickerBlock.title}`)} onClose={() => setPickerId(null)} onSelect={place => {
      const next = putTripPlace({ ...document, days: document.days.map(day => day.id === draft.id ? draft : day) }, draft.id, pickerBlock.id, place, pickerAnchor?.id);
      const changedDay = next.days.find(day => day.id === draft.id)!;
      setDraft({ ...changedDay, blocks: changedDay.blocks.map(block => block.id === pickerBlock.id ? { ...block, places: block.places.map(item => ({ ...item, travelMinutes: undefined })) } : block) });
      setActiveId(pickerBlock.id); setPickerId(null);
    }} />}
  </>;
}
