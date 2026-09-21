import { t as uiText } from '../../i18n/translate';
import { useEffect, useState } from 'react';
import { CustomOverlayMap, Map, Polyline, ZoomControl } from 'react-kakao-maps-sdk';
import type { RoutePoint } from './dayRouteModel';
import { jellyRouteLayers, nopiMapImages } from '../../components/nopiMapTheme';
import '../../components/nopiMap.css';

export interface DayMapPoint extends RoutePoint { id: string; name: string; number: number }
function mapsReady() { return typeof window !== 'undefined' && typeof kakao !== 'undefined' && Boolean(kakao.maps?.Map); }

export function DayRouteMap({ points, activeId, onSelect, focusActive = false, fitRequest = 0, showPath = true, emptyHint = '오른쪽에서 가고 싶은 장소를 선택해 주세요.' }: { points: DayMapPoint[]; activeId: string; onSelect: (id: string) => void; focusActive?: boolean; fitRequest?: number; showPath?: boolean; emptyHint?: string }) {
  const [ready, setReady] = useState(mapsReady);
  const [failed, setFailed] = useState(false);
  const [map, setMap] = useState<kakao.maps.Map | null>(null);
  useEffect(() => {
    if (ready) return;
    const timer = window.setInterval(() => { if (mapsReady()) { setReady(true); clearInterval(timer); } }, 300);
    const stop = window.setTimeout(() => { clearInterval(timer); if (!mapsReady()) setFailed(true); }, 10000);
    return () => { clearInterval(timer); clearTimeout(stop); };
  }, [ready]);
  useEffect(() => {
    if (!map || !points.length) return;
    const fit = () => {
      map.relayout();
      if (points.length === 1) { map.setCenter(new kakao.maps.LatLng(points[0].lat, points[0].lng)); map.setLevel(5); }
      else {
        const bounds = new kakao.maps.LatLngBounds();
        points.forEach(p => bounds.extend(new kakao.maps.LatLng(p.lat, p.lng)));
        map.setBounds(bounds, 100, 155, 65, 65);
      }
    };
    fit();
    const resize = new ResizeObserver(fit);
    resize.observe(map.getNode());
    return () => resize.disconnect();
  }, [map, points, fitRequest]);

  useEffect(() => {
    if (!map || !focusActive) return;
    const point = points.find(item => item.id === activeId);
    if (point) map.panTo(new kakao.maps.LatLng(point.lat, point.lng));
  }, [map, activeId, focusActive, points]);
  if (!points.length || !ready) return <div className="day-route-map-empty"><span>DAY ROUTE</span><h3>{uiText(!points.length ? '장소를 담으면 동선이 보여요' : failed ? '지도를 불러오지 못했어요' : '지도를 연결하고 있어요')}</h3><p>{uiText(!points.length ? emptyHint : '각 장소의 카카오맵 링크로 위치를 확인할 수 있어요. 일정 순서 변경은 계속 사용할 수 있어요.')}</p>{points.map(point => <a key={point.id} href={`https://map.kakao.com/link/map/${encodeURIComponent(point.name)},${point.lat},${point.lng}`} target="_blank" rel="noreferrer">{point.number}. {point.name} ↗</a>)}</div>;
  return <Map center={points[0]} style={{ width: '100%', height: '100%' }} onCreate={setMap}>
    <ZoomControl position="RIGHT" />
    {showPath && points.length > 1 && jellyRouteLayers.map(layer => <Polyline key={layer.strokeWeight} path={points} {...layer} strokeStyle="solid" />)}
    {points.map((point, index) => <CustomOverlayMap key={point.id} position={point} yAnchor={1} zIndex={activeId === point.id ? 5 : 3} clickable>
      <button type="button" className={`nopi-map-pin ${index === points.length - 1 ? 'is-arrival' : ''} ${activeId === point.id ? 'active' : ''}`} onClick={() => onSelect(point.id)} aria-pressed={activeId === point.id} aria-label={uiText(`${point.number}. ${point.name} 일정 보기`)}>
        <span className="nopi-map-avatar" aria-hidden="true"><img src={index === points.length - 1 ? nopiMapImages.arrival : nopiMapImages.stop} alt="" draggable={false} /></span>
        <span className="nopi-map-label"><b>{point.number}</b><span>{point.name}</span></span>
      </button>
    </CustomOverlayMap>)}
  </Map>;
}
