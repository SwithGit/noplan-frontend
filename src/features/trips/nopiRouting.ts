import type { DayRouteResult } from '../../api/dayRouteApi';
import { courseDistanceLabel, courseDistanceLimit } from './coursePolicy';
import { courseLegs, courseOrderOptions, edgeId, scheduleCourse, suggestCourse, targetCourseCount, type CourseNode, type NopiAttraction, type NopiOptions } from './nopiModel';

type QueryRoutes = (transport: NopiOptions['transport'], legs: ReturnType<typeof courseLegs>, signal: AbortSignal) => Promise<{ legs: DayRouteResult[] }>;
export function routeWithinLimit(route: DayRouteResult, transport: NopiOptions['transport']) {
  return route.status === 'ok' && Number.isFinite(route.distanceMeters) && route.distanceMeters! >= 0 && route.distanceMeters! <= courseDistanceLimit(transport)
    && Number.isFinite(route.durationMinutes) && route.durationMinutes! >= 0 && route.durationMinutes! <= (transport === 'walk' ? 40 : 60);
}
export async function generateNearbyCourse(catalog: NopiAttraction[], options: NopiOptions, exclusions: Record<string, string>, query: QueryRoutes, signal: AbortSignal, variant = 0) {
  const rejected = new Set<string>(), cache = new Map<string, DayRouteResult>();
  const unroutable = new Set<string>();
  let replacedUnavailable = false;
  let distanceRejected = false, timeRejected = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    signal.throwIfAborted();
    const suggested = suggestCourse(catalog.filter(place => !unroutable.has(place.contentId)), options, exclusions, rejected, variant);
    let best: { nodes: CourseNode[]; routes: DayRouteResult[]; meters: number } | undefined;
    let serviceFailure: string | undefined;
    for (const nodes of courseOrderOptions(suggested, options)) {
      if (nodes.some(node => unroutable.has(node.place.tourism!.contentId))) continue;
      if (nodes.slice(1).some((node, i) => rejected.has(edgeId(nodes[i].place.tourism!.contentId, node.place.tourism!.contentId)))) continue;
      signal.throwIfAborted();
      const legs = courseLegs(nodes), cacheKey = (leg: typeof legs[number]) => JSON.stringify([leg.from, leg.to]);
      const missing = legs.filter(leg => !cache.has(cacheKey(leg)));
      if (missing.length) {
        const result = await query(options.transport, missing, signal);
        signal.throwIfAborted();
        missing.forEach(leg => cache.set(cacheKey(leg), result.legs.find(r => r.id === leg.id) || { id: leg.id, status: 'unavailable' }));
      }
      const routes = legs.map(leg => ({ ...cache.get(cacheKey(leg))!, id: leg.id }));
      const failures = routes.filter(r => r.status !== 'ok' || !Number.isFinite(r.distanceMeters) || !Number.isFinite(r.durationMinutes));
      // Only a provider-confirmed missing route is safe to replace. An outage,
      // quota error or malformed response must not masquerade as a bad place.
      const unavailable = failures.find(r => r.status !== 'unavailable' || r.reason !== 'no_route');
      if (unavailable) {
        serviceFailure = unavailable.reason === 'rate_limited'
          ? '경로 조회 한도에 도달했어요. 잠시 후 다시 추천받아 주세요.'
          : unavailable.reason === 'service_unavailable'
            ? '경로 서비스 연결 설정을 확인해야 해요. 실제 이동거리·시간을 확인하지 못했어요.'
            : '실제 이동거리·시간을 확인하지 못했어요. 잠시 후 다시 추천받아 주세요.';
        break;
      }
      failures.forEach(route => {
        const index = legs.findIndex(leg => leg.id === route.id);
        const from = nodes[index].place.tourism!.contentId, to = nodes[index + 1].place.tourism!.contentId;
        rejected.add(edgeId(from, to));
        // Near-identical endpoints cannot be fixed by reversing their order.
        if (route.providerResultCode === 104) rejected.add(edgeId(to, from));
        // Kakao 102/103 explicitly identify an origin/destination with no road.
        if (route.providerResultCode === 102) unroutable.add(from);
        if (route.providerResultCode === 103) unroutable.add(to);
        replacedUnavailable = true;
      });
      if (failures.length) continue;
      const over = routes.filter(r => !routeWithinLimit(r, options.transport));
      if (over.some(route => route.distanceMeters! > courseDistanceLimit(options.transport))) distanceRejected = true;
      if (over.some(route => route.durationMinutes! > (options.transport === 'walk' ? 40 : 60))) timeRejected = true;
      over.forEach(r => { const index = legs.findIndex(leg => leg.id === r.id); rejected.add(edgeId(nodes[index].place.tourism!.contentId, nodes[index + 1].place.tourism!.contentId)); });
      if (over.length) continue;
      if (scheduleCourse(nodes, options.start, options.end, routes, {}, options.date).errors.length) { timeRejected = true; continue; }
      const meters = routes.reduce((sum, r) => sum + r.distanceMeters!, 0);
      if (!best || meters < best.meters) best = { nodes, routes, meters };
    }
    if (best) return { ...best, notice: [replacedUnavailable ? '경로를 확인할 수 없는 구간을 제외하고 이동 가능한 코스로 구성했어요.' : '', best.nodes.length < targetCourseCount(options) ? `가까운 후보가 부족해 ${best.nodes.length}곳으로 구성했어요. ${courseDistanceLabel(options.transport)} 제한은 그대로 지켰어요.` : ''].filter(Boolean).join(' ') };
    if (serviceFailure) throw Error(serviceFailure);
  }
  if (replacedUnavailable) throw Error('경로를 확인할 수 없는 구간이 반복돼 코스를 완성하지 못했어요. 다른 권역을 선택하거나 장소를 직접 담아 주세요.');
  if (timeRejected && !distanceRejected) throw Error('이동·방문 시간을 합치면 설정한 시간 안에 코스를 구성하기 어려워요. 여행 시간을 늘리거나 장소를 직접 담아 주세요.');
  throw Error(`${courseDistanceLabel(options.transport)} 이내의 실제 경로로 연결하기 어려워요. 거리를 넓히지 않았어요. 다른 권역을 선택하거나 장소를 직접 담아 주세요.`);
}
