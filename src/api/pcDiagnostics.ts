export type PcAction = 'course_generate' | 'place_search' | 'address_search' | 'api_failure';
type PcStatus = 'started' | 'success' | 'empty' | 'error' | 'cancelled' | 'timeout';
type PcFields = { keyword?: string; category?: string; page?: number; transport?: string; district?: string; purpose?: string; startTime?: string; endTime?: string; placeIds?: string[]; catalogCount?: number; excludedCount?: number; resultCount?: number; distanceMeters?: number; limitMeters?: number; variant?: number; partial?: boolean; reason?: string; endpoint?: string; httpStatus?: number; requestId?: string };

// Diagnostics must never delay a search or make a successful search fail.
// No user ID, date of birth, credentials, addresses, coordinates or raw errors.
export function diagnosticReason(cause: unknown) {
  const error = cause instanceof Error ? cause : undefined;
  if (error?.name === 'TimeoutError') return 'timeout';
  if (error?.name === 'AbortError') return 'cancelled';
  const message = error?.message || '';
  if (/가까운 장소가 부족/.test(message)) return 'insufficient_nearby_places';
  if (/실제 경로로 연결/.test(message)) return 'distance_limit';
  if (/실제 이동거리·시간|경로를 확인할 수 없는 구간/.test(message)) return 'route_unavailable';
  if (/3~14시간|설정한 시간 안에 코스/.test(message)) return 'invalid_time_window';
  if (/대중교통/.test(message)) return 'unsupported_transport';
  if (error?.name === 'ApiError') return 'http_error';
  return 'unexpected_error';
}

function send(event: Record<string, unknown>) {
  try {
    if (typeof event.keyword === 'string') {
      const keyword = Array.from(event.keyword.slice(0, 160), char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127 ? ' ' : char).join('').trim();
      event = { ...event, keyword: /@|https?:|www\.|bearer|token|password|servicekey|api[_-]?key|\d[\d\s.-]{6,}\d/i.test(keyword) ? '[redacted]' : keyword.slice(0, 80) };
    }
    const base = (import.meta.env.VITE_APP_API_URL || 'http://localhost:3000').replace(/\/+$/, '');
    void fetch(`${base}/api/pc-diagnostics`, {
      method: 'POST', credentials: 'include', keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event), signal: AbortSignal.timeout(4000),
    }).catch(() => undefined);
  } catch { /* Logging is best effort, including when offline or closing a tab. */ }
}

export function beginPcOperation(action: PcAction, fields: PcFields = {}) {
  const operationId = crypto.randomUUID(), start = performance.now();
  let finished = false;
  const emit = (status: PcStatus, extra: PcFields = {}) => send({ ...fields, ...extra, action, status, operationId, elapsedMs: Math.round(performance.now() - start) });
  emit('started');
  return { operationId, finish(status: Exclude<PcStatus, 'started'>, extra: PcFields = {}) { if (!finished) { finished = true; emit(status, extra); } } };
}

export function pcApiEndpoint(path: string) {
  const route = path.split('?')[0];
  if (/^\/api\/tourism\/(search|nopi-catalog|day-route)$/.test(route)) return route;
  if (/^\/api\/tourism\/[^/]+$/.test(route)) return '/api/tourism/:id';
  if (/^\/api\/events(?:\/|$)/.test(route)) return '/api/events';
  if (/^\/api\/trips(?:\/|$)/.test(route)) return '/api/trips';
  return undefined;
}

export function reportPcApiFailure(endpoint: string, requestId: string, cause: unknown, httpStatus?: number) {
  send({ action: 'api_failure', status: 'error', operationId: requestId, requestId, endpoint, reason: diagnosticReason(cause), httpStatus });
}
