import { useEffect, useRef, useState } from 'react';
import { getDayRoutes, type DayRouteResult } from '../../api/dayRouteApi';
import { ApiError } from '../../api/client';
import type { TripDay, TripDocument } from './tripModel';
import { workspaceLegs } from './dayWorkspaceModel';
import type { RoutePoint } from './dayRouteModel';

export function useWorkspaceRoutes(day: TripDay, transport: TripDocument['transport']) {
  const cache = useRef(new Map<string, DayRouteResult[]>());
  const [response, setResponse] = useState<{ key: string; routes: DayRouteResult[]; error?: string }>();
  const [attempt, setAttempt] = useState(0);
  const request = JSON.stringify({ transport, legs: workspaceLegs(day).filter(leg => leg.from && leg.to).map(leg => ({ id: leg.id, from: leg.from, to: leg.to })) });
  const key = `${attempt}:${request}`;
  useEffect(() => {
    const payload = JSON.parse(request) as { transport: TripDocument['transport']; legs: { id: string; from: RoutePoint; to: RoutePoint }[] };
    if (transport === 'transit' || !payload.legs.length) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        let routes = cache.current.get(key);
        if (!routes) {
          routes = [];
          // The existing endpoint accepts at most 11 legs per request.
          for (let index = 0; index < payload.legs.length; index += 11) {
            const result = await getDayRoutes(transport, payload.legs.slice(index, index + 11), controller.signal);
            routes.push(...result.legs);
          }
          if (controller.signal.aborted) return;
          if (cache.current.size >= 12) cache.current.clear();
          cache.current.set(key, routes);
        }
        if (!controller.signal.aborted) setResponse({ key, routes });
      } catch (cause) {
        if (!controller.signal.aborted) setResponse({ key, routes: [], error: cause instanceof ApiError && cause.status === 429 ? cause.message : '이동 정보를 불러오지 못했어요. 장소 편집은 계속할 수 있어요.' });
      }
    }, 450);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [request, key, transport]);
  const current = response?.key === key ? response : undefined;
  return { routes: current?.routes || [], error: current?.error, loading: transport !== 'transit' && workspaceLegs(day).some(leg => leg.from && leg.to) && !current, retry: () => setAttempt(value => value + 1) };
}
