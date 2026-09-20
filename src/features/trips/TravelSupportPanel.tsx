import { useEffect, useState } from 'react';
import { getPlaceSupport } from '../../api/travelSupportApi';
import { t } from '../../i18n/translate';
import { evaluateNeeds, facilityLabels, hasTravelNeeds, type TravelNeeds, type TravelSupport } from './travelNeeds';
import './travelNeeds.css';

const labels = { yes: '확인됨', no: '이용 불가', conditional: '조건 확인 필요', unknown: '정보 없음' };
export function TravelSupportPanel({ contentId, needs, eager = false }: { contentId?: string; needs?: TravelNeeds; eager?: boolean }) {
  const [open, setOpen] = useState(eager || hasTravelNeeds(needs));
  const [response, setResponse] = useState<{ id: string; data?: TravelSupport; failed?: boolean }>();
  const data = response?.id === contentId ? response?.data : undefined;
  const failed = response?.id === contentId && response?.failed;
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!contentId || !open) return;
    let active = true;
    getPlaceSupport(contentId).then(data => { if (active) setResponse({ id: contentId, data, failed: !data }); }).catch(() => { if (active) setResponse({ id: contentId, failed: true }); });
    return () => { active = false; };
  }, [contentId, open, retry]);
  return <details className="support-panel" open={open} onToggle={e => setOpen(e.currentTarget.open)}>
    <summary>{t('반려동물·편의시설 확인')}</summary>
    {!contentId ? <p>{t('직접 등록한 장소는 조건을 확인한 뒤 방문해 주세요.')}</p> : failed ? <p role="status">{t('여행 조건 정보를 불러오지 못했어요. 잠시 후 다시 확인해 주세요.')} <button type="button" className="trip-text-link" onClick={() => setRetry(v => v + 1)}>{t('다시 확인')}</button></p> : !data ? <p role="status">{t('공식 정보를 확인하고 있어요…')}</p> : <>
      {(needs?.pet.enabled || Object.values(needs?.facilities || {}).includes('required')) && <p className={!evaluateNeeds(data, needs).eligible ? 'support-warning' : ''}>{t(evaluateNeeds(data, needs).eligible ? '선택한 필수 조건을 확인했어요.' : '필수 조건 중 확인되지 않은 항목이 있어요. 직접 담을 수 있지만 방문 전 확인해 주세요.')}</p>}
      <div className="support-badges"><span>{t('반려동물')} · {t(data.pet.status === 'unavailable' ? '조회 실패' : labels[data.pet.allowed])}</span>{Object.entries(data.access.facilities).map(([key, info]) => <span key={key}>{t(facilityLabels[key as keyof typeof facilityLabels])} · {t(data.access.status === 'unavailable' ? '조회 실패' : labels[info.state])}</span>)}</div>
      {(data.pet.status === 'unavailable' || data.access.status === 'unavailable') && <button className="trip-text-link" type="button" onClick={() => setRetry(v => v + 1)}>{t('다시 확인')}</button>}
      <details><summary>{t('공식 안내 원문 보기')}</summary><dl>{data.pet.facts.map(fact => <div key={fact.label}><dt>{t(fact.label)}</dt><dd>{fact.value}</dd></div>)}{Object.entries(data.access.facilities).filter(([, info]) => info.text).map(([key, info]) => <div key={key}><dt>{t(facilityLabels[key as keyof typeof facilityLabels])}</dt><dd>{info.text}</dd></div>)}</dl></details>
      <small>{t('한국관광공사 제공 · 한국어 원문')} · {data.checkedAt.slice(0, 10)}</small>
      <p>{t('시설 정보는 장소 기준이에요. 장소 사이의 계단·경사와 휠체어 이동 가능 여부는 별도 확인이 필요해요.')}</p>
    </>}
  </details>;
}
