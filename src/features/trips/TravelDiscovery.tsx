import { useEffect, useState } from 'react';
import type { TourismAttraction } from '../../api/tourismApi';
import { getDiscovery, type Discovery } from '../../api/travelSupportApi';
import { t } from '../../i18n/translate';
import { TourismText } from '../../i18n/TourismText';
import './travelNeeds.css';

export function TravelDiscovery({ destination, anchorId, onSelect }: { destination: string; anchorId?: string; onSelect: (place: TourismAttraction) => void }) {
  const key = `${destination}:${anchorId || ''}`;
  const [response, setResponse] = useState<{ key: string; data?: Discovery }>();
  const [expanded, setExpanded] = useState(false);
  const [retry, setRetry] = useState(0);
  const data = response?.key === key ? response.data : undefined;
  useEffect(() => {
    if (!expanded) return;
    const controller = new AbortController();
    getDiscovery(destination, anchorId, controller.signal).then(data => { if (!controller.signal.aborted) setResponse({ key, data }); }).catch(() => { if (!controller.signal.aborted) setResponse({ key, data: { items: [], status: 'unavailable' } }); });
    return () => controller.abort();
  }, [destination, anchorId, key, expanded, retry]);
  return <details className="support-discovery" open={expanded} onToggle={e => setExpanded(e.currentTarget.open)}><summary>{t(anchorId ? '함께 둘러볼 관광지' : '이 지역의 중심 관광지에서 시작하기')}</summary>
    {!data ? <p role="status">{t('공식 정보를 확인하고 있어요…')}</p> : data.status === 'unavailable' ? <p>{t('관광지 연결 정보를 불러오지 못했어요.')} <button type="button" className="trip-text-link" onClick={() => setRetry(v => v + 1)}>{t('다시 확인')}</button></p> : <>
      <p><small>{t('한국관광공사 관광지 연결 데이터')} · {data.baseYm?.replace(/^(\d{4})(\d{2})$/, '$1.$2')}{t(' 기준')}</small></p>
      <div className="support-discovery-list">{data.items.map(place => <button className="trip-button" type="button" key={place.contentId} onClick={() => onSelect(place)}><span><TourismText place={place} /><small>{t(place.district || '')}</small></span></button>)}</div>
      {!data.items.length && <p>{t('이 지역에서 일치하는 관광지 연결 정보를 찾지 못했어요. 검색으로 장소를 골라 주세요.')}</p>}
      {data.partial && <p>{t('일부 지역의 연결 정보를 먼저 보여드려요.')}</p>}
      {anchorId && <small>{t('연관 관광지는 이동거리나 동반 조건 충족을 뜻하지 않아요. 담기 전에 확인해 주세요.')}</small>}
    </>}
  </details>;
}
