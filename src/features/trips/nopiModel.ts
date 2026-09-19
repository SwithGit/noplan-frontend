import type { TourismAttraction } from '../../api/tourismApi';
import type { DayRouteResult } from '../../api/dayRouteApi';
import { clock, minutes, newId, type TripDay, type TripDocument, type TripPlace } from './tripModel';

export type Purpose = '발견' | '데이트' | '친구모임' | '가족여행' | '자연산책' | '문화여행';
export interface PlanningFacts { menu: string; hours: string; closed: string }
export interface NopiAttraction extends TourismAttraction { planning?: PlanningFacts | null }
export interface CourseNode { place: TripPlace; imageUrl?: string; imageLicense?: string; reason?: string; planning?: PlanningFacts | null; notBefore?: number; initialNotBefore?: number; originalNotes?: string }
export interface NopiOptions { date: string; start: string; end: string; transport: 'walk' | 'car'; purpose: Purpose; district: string }

export function tourismNode(place: NopiAttraction, duration = 90): CourseNode {
  return { place: { id: newId(), name: place.name, address: place.address, type: place.type, lat: place.lat, lng: place.lng, durationMinutes: duration, fixed: true, source: 'tourism', sourceUrl: place.sourceUrl, priceNeedsCheck: true, tourism: { contentId: place.contentId, contentTypeId: place.contentTypeId } }, imageUrl: place.imageUrl, imageLicense: place.imageLicense, planning: place.planning };
}
export function dayNodes(day: TripDay): CourseNode[] {
  return [...day.blocks].sort((a, b) => a.startTime.localeCompare(b.startTime)).flatMap(block => block.places.map((place, index) => ({ place: { ...place, travelMinutes: undefined }, initialNotBefore: minutes(block.startTime), originalNotes: index === 0 ? block.notes : undefined })));
}
export function tripExclusions(document: TripDocument, exceptDayId?: string, exceptPlaceId?: string): Record<string, string> {
  const result: Record<string, string> = {};
  document.days.forEach((day, index) => { if (day.id !== exceptDayId) day.blocks.forEach(block => block.places.forEach(place => { if (place.tourism && place.id !== exceptPlaceId) result[place.tourism.contentId] = `DAY ${index + 1}에 담음`; })); });
  return result;
}
export function distance(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const radians = Math.PI / 180, x = (b.lat - a.lat) * radians, y = (b.lng - a.lng) * radians;
  return 6371000 * 2 * Math.asin(Math.min(1, Math.sqrt(Math.sin(x / 2) ** 2 + Math.cos(a.lat * radians) * Math.cos(b.lat * radians) * Math.sin(y / 2) ** 2)));
}
export function foodKind(place: NopiAttraction): 'meal' | 'cafe' | 'unknown' {
  if (place.contentTypeId !== '39') return 'unknown';
  const text = `${place.name} ${place.planning?.menu || ''}`;
  if (/카페|커피|아메리카노|라떼|베이커리|디저트|찻집|다방|cafe|coffee/i.test(text)) return 'cafe';
  return place.planning?.menu ? 'meal' : 'unknown';
}
export function closedOn(place: NopiAttraction, date: string) {
  const weekday = '일월화수목금토'[new Date(`${date}T12:00:00+09:00`).getUTCDay()];
  const text = place.planning?.closed || '';
  // Conditional closures (holidays, alternate weeks) need human confirmation.
  if (/경우|격주|동절기|하절기/.test(text)) return false;
  if (/째/.test(text)) {
    const occurrence = ['첫째', '둘째', '셋째', '넷째', '다섯째'][Math.floor((Number(date.slice(-2)) - 1) / 7)];
    return text.includes(occurrence) && text.includes(`${weekday}요일`);
  }
  return new RegExp(`(?:매주\\s*)?${weekday}요일`).test(text) || (weekday === '토' || weekday === '일') && /매주 주말/.test(text);
}
export function openingWindow(facts?: PlanningFacts | null, date?: string) {
  let text = facts?.hours || '';
  if (/상시|24시간/.test(text)) return { open: 0, close: 1440, breaks: [] as number[][] };
  if (/동절기|하절기|\d+월|계절/.test(text)) return null;
  if (/평일|주말|요일/.test(text)) {
    if (!date) return null;
    const day = new Date(`${date}T12:00:00+09:00`).getUTCDay();
    const lines = text.split('\n');
    const specific = lines.find(line => line.includes(`${'일월화수목금토'[day]}요일`)) || lines.find(line => line.includes(day === 0 || day === 6 ? '주말' : '평일'));
    if (!specific) return null;
    text = specific;
  }
  const ranges = [...text.matchAll(/([0-2]?\d):([0-5]\d)\s*[~〜∼～–-]\s*([0-2]?\d):([0-5]\d)/g)];
  if (!ranges.length || ranges.length > 1 && !/브레이크|휴게/.test(text)) return null;
  const values = ranges.map(m => [Number(m[1]) * 60 + Number(m[2]), Number(m[3]) * 60 + Number(m[4])]);
  if (values.some(pair => pair.some(value => value > 1440))) return null;
  const [open, close] = values[0];
  return { open, close: close <= open ? close + 1440 : close, breaks: values.slice(1) };
}
function visitTime(cursor: number, stay: number, facts?: PlanningFacts | null, date?: string) {
  const hours = openingWindow(facts, date);
  let arrival = Math.max(cursor, hours?.open || 0);
  hours?.breaks.forEach(([start, end]) => { if (arrival < end && arrival + stay > start) arrival = end; });
  return { arrival, fits: !hours || arrival + stay <= hours.close };
}
function preference(place: NopiAttraction, purpose: Purpose) {
  const text = place.name, type = place.contentTypeId;
  if (purpose === '자연산책') return /공원|정원|산책|숲|해변|해수욕장|대왕암|간절곶|강변/.test(text) ? 1 : 0;
  if (purpose === '문화여행') return type === '14' || /유적|읍성|향교|서원/.test(text) ? 1 : 0;
  if (purpose === '데이트') return foodKind(place) === 'cafe' || /정원|공원|전망|미술|해변/.test(text) ? 1 : 0;
  if (purpose === '가족여행') return /박물관|생태|공원|체험|수목원|과학/.test(text) ? 1 : 0;
  if (purpose === '친구모임') return ['28', '39'].includes(type) ? 1 : type === '38' ? .4 : 0;
  return type === '12' ? .5 : 0;
}
export const edgeId = (from: string, to: string) => `${from}:${to}`;

// Beam search balances statistical relevance with distance, instead of routing
// the first names in the API response. Actual travel is checked separately.
export function suggestCourse(catalog: NopiAttraction[], options: NopiOptions, excluded: Record<string, string>, rejectedEdges = new Set<string>(), variant = 0): CourseNode[] {
  const available = minutes(options.end) - minutes(options.start);
  if (available < 180 || available > 840) throw Error('노피 코스는 하루 3~14시간으로 설정해 주세요.');
  const pool = catalog.filter(place => !excluded[place.contentId] && place.contentTypeId !== '25' && (!options.district || place.district === options.district) && !closedOn(place, options.date)
    && !/캠핑|야영|골프|컨트리클럽|스키|썰매|물놀이장|수영장|등산|산$|산\(울산\)/.test(place.name) && Number.isFinite(place.lat) && Number.isFinite(place.lng));
  const mealInWindow = minutes(options.start) <= 13 * 60 && minutes(options.end) >= 14 * 60;
  const roles: ('visit' | 'meal' | 'cafe')[] = available >= 480 ? ['visit', mealInWindow ? 'meal' : 'cafe', 'visit', 'cafe', 'visit'] : available >= 360 ? ['visit', mealInWindow ? 'meal' : 'cafe', 'visit', 'cafe'] : ['visit', 'cafe', 'visit'];
  if (available >= 660 && minutes(options.end) >= 19 * 60) roles.push('meal');
  const maxCount = Math.max(1, ...pool.map(p => p.searchCount || 0)), maxShare = Math.max(1, ...pool.map(p => p.demographicShare || 0));
  const score = (p: NopiAttraction) => 1.4 * preference(p, options.purpose) + 1.6 * (p.demographicShare || 0) / maxShare + Math.log1p(p.searchCount || 0) / Math.log1p(maxCount);
  const ranked = pool.toSorted((a, b) => score(b) - score(a) || a.contentId.localeCompare(b.contentId));
  const durationFor = (p: NopiAttraction) => foodKind(p) === 'meal' ? 60 : foodKind(p) === 'cafe' ? 40 : p.contentTypeId === '38' ? 60 : available < 360 ? 45 : 75;
  const notBefore = (index: number) => roles[index] === 'meal' ? index === roles.length - 1 ? 17 * 60 + 30 : 11 * 60 + 30 : 0;
  type Path = { items: NopiAttraction[]; value: number; meters: number; cursor: number };
  let beam: Path[] = [{ items: [], value: 0, meters: 0, cursor: minutes(options.start) }];
  const radius = options.transport === 'walk' ? 1600 : 16000;
  for (let index = 0; index < roles.length; index++) {
    const role = roles[index];
    const matching = ranked.filter(p => role === 'visit' ? ['12', '14', '28', '38'].includes(p.contentTypeId) : foodKind(p) === role);
    // Missing cafés may be replaced by another visit; meals are never invented.
    const choices = matching.length ? matching : role === 'cafe' ? ranked.filter(p => ['12', '14', '38'].includes(p.contentTypeId)) : [];
    const next: Path[] = [];
    for (const path of beam) {
      const last = path.items.at(-1);
      const candidates = choices.filter(p => !path.items.some(t => t.contentId === p.contentId) && (p.contentTypeId !== '38' || index > 0 && !path.items.some(t => t.contentTypeId === '38')) && (!last || !rejectedEdges.has(edgeId(last.contentId, p.contentId))));
      const scored = candidates.map(p => ({ p, meters: last ? distance(last, p) : 0 })).filter(p => p.meters <= radius)
        .map(item => ({ ...item, timing: visitTime(Math.max(path.cursor + (last ? Math.ceil(item.meters / (options.transport === 'walk' ? 65 : 400)) + (options.transport === 'car' ? 5 : 0) : 0), notBefore(index)), durationFor(item.p), item.p.planning, options.date) }))
        .filter(item => item.timing.fits && item.timing.arrival + durationFor(item.p) <= minutes(options.end) && (role !== 'meal' || item.timing.arrival <= (index === roles.length - 1 ? 20 * 60 : 14 * 60)))
        .map(item => ({ ...item, value: score(item.p) - item.meters / radius * 3 - Math.max(0, item.timing.arrival - path.cursor - 60) / 120 } )).sort((a, b) => b.value - a.value);
      const selected = !index ? scored.slice((variant % 3) * 3, (variant % 3) * 3 + 60) : scored.slice(0, 12);
      selected.forEach(item => next.push({ items: [...path.items, item.p], value: path.value + item.value, meters: path.meters + item.meters, cursor: item.timing.arrival + durationFor(item.p) }));
    }
    // Keep several starting areas alive. Otherwise a popular but disconnected
    // cluster can crowd out feasible routes elsewhere in the city.
    const perStart = new Map<string, number>();
    beam = next.sort((a, b) => b.value - a.value || a.meters - b.meters).filter(path => {
      const id = path.items[0].contentId, count = perStart.get(id) || 0;
      perStart.set(id, count + 1); return count < 5;
    }).slice(0, 160);
    if (!beam.length) throw Error('이 조건으로 가까운 장소와 음식점을 연결하기 어려워요. 다른 권역이나 차량을 선택하거나 직접 장소를 담아 주세요.');
  }
  return beam[0].items.map((p, index) => {
    const node = tourismNode(p, durationFor(p));
    const reasons = [preference(p, options.purpose) ? `${options.purpose}에 어울리는 장소` : '가까운 동선으로 연결'];
    return { ...node, reason: reasons.join(' · '), ...(notBefore(index) ? { notBefore: notBefore(index) } : {}) };
  });
}
export function courseLegs(nodes: CourseNode[]) {
  return nodes.slice(1).flatMap((node, index) => {
    const from = nodes[index].place, to = node.place;
    return from.lat != null && from.lng != null && to.lat != null && to.lng != null ? [{ id: edgeId(from.id, to.id), from: { lat: from.lat, lng: from.lng }, to: { lat: to.lat, lng: to.lng } }] : [];
  });
}
export function scheduleCourse(nodes: CourseNode[], start: string, end: string, routes: DayRouteResult[], manualTravel: Record<string, number> = {}, date?: string) {
  let cursor = minutes(start);
  const errors: string[] = [];
  const stops = nodes.map((node, index) => {
    const id = index ? edgeId(nodes[index - 1].place.id, node.place.id) : '';
    const route = routes.find(route => route.id === id && route.status === 'ok');
    const travel = index ? route?.durationMinutes ?? manualTravel[id] : 0;
    if (travel == null) errors.push(`${index + 1}번째 장소까지 이동시간을 확인해 주세요.`);
    cursor += travel ?? 0;
    const timing = visitTime(Math.max(cursor, node.notBefore || 0, node.initialNotBefore || 0), node.place.durationMinutes, node.planning, date);
    const wait = timing.arrival - cursor;
    cursor = timing.arrival;
    if (!timing.fits) errors.push(`${node.place.name}의 안내된 운영시간을 넘어요. 시간이나 장소를 바꿔 주세요.`);
    if (node.notBefore && cursor > (node.notBefore < 900 ? 14 * 60 : 20 * 60)) errors.push('식사 시간이 너무 늦어요. 앞의 장소나 체류시간을 조정해 주세요.');
    const arrival = cursor;
    if (!Number.isInteger(node.place.durationMinutes) || node.place.durationMinutes < 10 || node.place.durationMinutes > 600) errors.push('머무는 시간은 10~600분으로 입력해 주세요.');
    cursor += node.place.durationMinutes;
    return { node, arrival, departure: cursor, wait, travel, route, manual: index > 0 && !route && travel != null };
  });
  if (cursor > minutes(end) || cursor > 1439) errors.push('종료 시간을 넘어요. 장소나 체류시간을 줄이거나 종료 시간을 늘려 주세요.');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end) || minutes(start) >= minutes(end)) errors.push('시작·종료 시간을 확인해 주세요.');
  return { stops, errors, finish: cursor };
}
export function courseDay(day: TripDay, nodes: CourseNode[], start: string, end: string, routes: DayRouteResult[], exclusions: Record<string, string>, manualTravel: Record<string, number> = {}): TripDay {
  if (!nodes.length || nodes.length > 12) throw Error('하루에 1~12개 장소를 담아 주세요.');
  const ids = nodes.flatMap(n => n.place.tourism ? [n.place.tourism.contentId] : []);
  if (new Set(ids).size !== ids.length || ids.some(id => exclusions[id])) throw Error('여행에 이미 담은 장소가 있어요. 중복 장소를 바꿔 주세요.');
  const schedule = scheduleCourse(nodes, start, end, routes, manualTravel, day.date);
  if (schedule.errors.length) throw Error(schedule.errors[0]);
  return { ...day, blocks: schedule.stops.map(({ node, arrival, departure, route, travel, manual }, index) => ({ id: newId(), title: arrival < 720 ? '오전의 여행' : arrival < 1080 ? '오후의 발견' : '저녁의 여유', area: node.place.address.slice(0, 160), startTime: clock(arrival), endTime: clock(departure), notes: [node.originalNotes?.split('\n').filter(line => !/^(조회한 이동|직접 입력한 이동|운영 안내:|휴무 안내:|운영시간 확인 필요|방문일 운영 여부)/.test(line)).join('\n'), index ? `${manual ? '직접 입력한' : '조회한'} 이동 ${travel}분${route?.parkingMinutes ? ` (주차 여유 ${route.parkingMinutes}분 포함)` : ''}` : '', node.reason, node.planning?.hours ? `운영 안내: ${node.planning.hours}` : '운영시간 확인 필요', node.planning?.closed ? `휴무 안내: ${node.planning.closed}` : '', '방문일 운영 여부와 예약을 확인해 주세요.'].filter(Boolean).join('\n').slice(0, 1000), places: [{ ...node.place, travelMinutes: undefined }] })) };
}
