import type { CrowdingSnapshot } from '../../types/noplan';
import { getCrowdingDetail, getCrowdingTitle } from './crowdingFormat';

export function CrowdingStatus({ compact = false, snapshot }: { compact?: boolean; snapshot?: CrowdingSnapshot }) {
  if (!snapshot || snapshot.level === 'unknown') return null;
  const title = getCrowdingTitle(snapshot);
  const detail = getCrowdingDetail(snapshot);
  return (
    <div aria-label={`${title}. ${detail}`} className={`crowding-status crowding-${snapshot.level} ${compact ? 'compact' : ''}`}>
      <span aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <small>{detail}</small>
        {!compact && snapshot.scope === 'area' && <p>통신 기반 권역 추정치이며 실제 매장 내부 혼잡도와 다를 수 있어요.</p>}
      </div>
    </div>
  );
}
