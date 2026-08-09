import type { CrowdingSnapshot } from '../../types/noplan';

const sourceLabels: Record<CrowdingSnapshot['source'], string> = {
  seoul: '서울시 실시간 인구데이터 기반',
  skt: 'SKT 장소 혼잡도 기반',
  merchant: '매장 제공 정보',
  unknown: '출처 확인 중',
};

export function formatCrowdingTime(snapshot: CrowdingSnapshot) {
  const date = new Date(snapshot.observedAt || snapshot.fetchedAt);
  if (Number.isNaN(date.getTime())) return snapshot.stale ? '최근 확인' : '방금 확인';
  const time = date.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Seoul' });
  return snapshot.stale ? `${time} 최근 확인` : `${time} 기준`;
}

export function getCrowdingTitle(snapshot: CrowdingSnapshot) {
  return snapshot.scope === 'place'
    ? `매장 혼잡도 · ${snapshot.label}`
    : `${snapshot.areaName || '장소'} 주변 혼잡도 · ${snapshot.label}`;
}

export function getCrowdingDetail(snapshot: CrowdingSnapshot) {
  return `${formatCrowdingTime(snapshot)} · ${sourceLabels[snapshot.source]}`;
}
