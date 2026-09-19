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
  for (let attempt = 0; attempt < 3; attempt++) {
    signal.throwIfAborted();
    const suggested = suggestCourse(catalog, options, exclusions, rejected, variant);
    let best: { nodes: CourseNode[]; routes: DayRouteResult[]; meters: number } | undefined;
    let unknown = false;
    for (const nodes of courseOrderOptions(suggested, options)) {
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
      if (routes.some(r => r.status !== 'ok' || !Number.isFinite(r.distanceMeters) || !Number.isFinite(r.durationMinutes))) { unknown = true; continue; }
      const over = routes.filter(r => !routeWithinLimit(r, options.transport));
      over.forEach(r => { const index = legs.findIndex(leg => leg.id === r.id); rejected.add(edgeId(nodes[index].place.tourism!.contentId, nodes[index + 1].place.tourism!.contentId)); });
      if (over.length || scheduleCourse(nodes, options.start, options.end, routes, {}, options.date).errors.length) continue;
      const meters = routes.reduce((sum, r) => sum + r.distanceMeters!, 0);
      if (!best || meters < best.meters) best = { nodes, routes, meters };
    }
    if (best) return { ...best, notice: best.nodes.length < targetCourseCount(options) ? `가까운 후보가 부족해 ${best.nodes.length}곳으로 구성했어요. ${courseDistanceLabel(options.transport)} 제한은 그대로 지켰어요.` : '' };
    if (unknown) throw Error('실제 이동거리·시간을 확인하지 못했어요. 기존 코스는 유지했어요. 잠시 후 다시 추천받아 주세요.');
  }
  throw Error(`${courseDistanceLabel(options.transport)} 이내의 실제 경로로 연결하기 어려워요. 거리를 넓히지 않았어요. 다른 권역을 선택하거나 장소를 직접 담아 주세요.`);
}
