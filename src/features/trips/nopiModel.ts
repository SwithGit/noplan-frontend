import type { TourismAttraction } from '../../api/tourismApi';
import type { DayRouteResult } from '../../api/dayRouteApi';
import { clock, minutes, newId, type TripDay, type TripDocument, type TripPlace } from './tripModel';
import { courseDistanceLabel, courseDistanceLimit } from './coursePolicy';
import { excludedPlace, placeKeys } from './placeIdentity';

export type Purpose = '발견' | '데이트' | '친구모임' | '가족여행' | '자연산책' | '문화여행';
export interface PlanningFacts { menu: string; hours: string; closed: string }
export interface NopiAttraction extends TourismAttraction { planning?: PlanningFacts | null }
export interface CourseNode { place: TripPlace; imageUrl?: string; imageLicense?: string; reason?: string; planning?: PlanningFacts | null; notBefore?: number; initialNotBefore?: number; originalNotes?: string }
export interface NopiOptions { date: string; start: string; end: string; transport: TripDocument['transport']; purpose: Purpose; district: string }

export function tourismNode(place: NopiAttraction, duration = 90): CourseNode {
  return { place: { id: newId(), name: place.name, address: place.address, type: foodKind(place) === 'cafe' ? '카페' : place.type, lat: place.lat, lng: place.lng, durationMinutes: duration, fixed: true, source: 'tourism', sourceUrl: place.sourceUrl, priceNeedsCheck: true, tourism: { contentId: place.contentId, contentTypeId: place.contentTypeId } }, imageUrl: place.imageUrl, imageLicense: place.imageLicense, planning: place.planning };
}
export function dayNodes(day: TripDay): CourseNode[] {
  return [...day.blocks].sort((a, b) => a.startTime.localeCompare(b.startTime)).flatMap(block => block.places.map((place, index) => ({ place: { ...place, travelMinutes: undefined }, initialNotBefore: minutes(block.startTime), originalNotes: index === 0 ? block.notes : undefined })));
}
export function tripExclusions(document: TripDocument, exceptDayId?: string, exceptPlaceId?: string): Record<string, string> {
  const result: Record<string, string> = {};
  document.days.forEach((day, index) => { if (day.id !== exceptDayId) day.blocks.forEach(block => block.places.forEach(place => { if (place.id !== exceptPlaceId) placeKeys(place).forEach(key => { result[key] = `DAY ${index + 1}에 담음`; }); })); });
  return result;
}
export function distance(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const radians = Math.PI / 180, x = (b.lat - a.lat) * radians, y = (b.lng - a.lng) * radians;
  return 6371000 * 2 * Math.asin(Math.min(1, Math.sqrt(Math.sin(x / 2) ** 2 + Math.cos(a.lat * radians) * Math.cos(b.lat * radians) * Math.sin(y / 2) ** 2)));
}
export function foodKind(place: NopiAttraction): 'meal' | 'cafe' | 'unknown' {
  if (place.contentTypeId !== '39') return 'unknown';
  if (place.foodKind === 'meal' || place.foodKind === 'cafe') return place.foodKind;
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

// Search nearby clusters with flexible visit/café order. Meal windows remain fixed.
export function targetCourseCount(options: NopiOptions) {
  const available = minutes(options.end) - minutes(options.start);
  return (available >= 480 ? 5 : available >= 360 ? 4 : 3) + (available >= 660 && minutes(options.end) >= 1140 ? 1 : 0);
}
export function suggestCourse(catalog: NopiAttraction[], options: NopiOptions, excluded: Record<string, string>, rejectedEdges = new Set<string>(), variant = 0): CourseNode[] {
  const available = minutes(options.end) - minutes(options.start), limit = courseDistanceLimit(options.transport);
  if (!limit) throw Error('대중교통 자동 코스는 아직 지원하지 않아요. 이동수단을 도보 또는 차량으로 변경해 주세요.');
  if (available < 180 || available > 840) throw Error('노피 코스는 하루 3~14시간으로 설정해 주세요.');
  // Apply only to automatic suggestions; search and manually added stops stay available.
  const departmentStore = (place: NopiAttraction) => place.contentTypeId === '38'
    && (place.classification === 'SH01' || /백화점|더현대/.test(place.name.replace(/\s/g, '')));
  const pool = catalog.filter(place => !departmentStore(place) && !excludedPlace({ ...place, tourism: { contentId: place.contentId, contentTypeId: place.contentTypeId } }, excluded) && place.contentTypeId !== '25' && (!options.district || place.district === options.district) && !closedOn(place, options.date)
    && !/캠핑|야영|골프|컨트리클럽|스키|썰매|물놀이장|수영장|등산|산$|산\(울산\)/.test(place.name) && Number.isFinite(place.lat) && Number.isFinite(place.lng));
  const maxCount = Math.max(1, ...pool.map(p => p.searchCount || 0)), maxShare = Math.max(1, ...pool.map(p => p.demographicShare || 0));
  const scores = new Map(pool.map(p => [p.contentId, 1.4 * preference(p, options.purpose) + 1.6 * (p.demographicShare || 0) / maxShare + Math.log1p(p.searchCount || 0) / Math.log1p(maxCount)]));
  const score = (p: NopiAttraction) => scores.get(p.contentId)!;
  const pairDistances = new Map<string, number>();
  const metersBetween = (a: NopiAttraction, b: NopiAttraction) => {
    const key = edgeId(a.contentId, b.contentId);
    let meters = pairDistances.get(key);
    if (meters == null) { meters = distance(a, b); pairDistances.set(key, meters); pairDistances.set(edgeId(b.contentId, a.contentId), meters); }
    return meters;
  };
  // A cell is wider than the density radius throughout Korea. Examine only
  // adjacent cells and stop at ten neighbours; avoid an N² distance cache.
  const cellSize = limit / 80000;
  const grid = new Map<string, NopiAttraction[]>();
  const cell = (p: NopiAttraction) => [Math.floor(p.lat / cellSize), Math.floor(p.lng / cellSize)];
  pool.forEach(p => { const key = cell(p).join(':'); const bucket = grid.get(key) || []; bucket.push(p); grid.set(key, bucket); });
  const density = new Map(pool.map(p => {
    const [y, x] = cell(p); let count = 0;
    nearby: for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      for (const other of grid.get(`${y + dy}:${x + dx}`) || []) {
        if (other.contentId !== p.contentId && distance(p, other) <= limit * .7 && ++count >= 10) break nearby;
      }
    }
    return [p.contentId, count / 10];
  }));
  const ranked = pool.toSorted((a, b) => score(b) + density.get(b.contentId)! - score(a) - density.get(a.contentId)! || a.contentId.localeCompare(b.contentId));
  const rankIndex = new Map(ranked.map((p, i) => [p.contentId, i]));
  const neighbours = new Map<string, NopiAttraction[]>();
  const candidatesNear = (p: NopiAttraction) => {
    const cached = neighbours.get(p.contentId); if (cached) return cached;
    const [y, x] = cell(p), found: NopiAttraction[] = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      found.push(...(grid.get(`${y + dy}:${x + dx}`) || []).filter(other => distance(p, other) <= limit));
    }
    found.sort((a, b) => rankIndex.get(a.contentId)! - rankIndex.get(b.contentId)!);
    neighbours.set(p.contentId, found); return found;
  };
  const durationFor = (p: NopiAttraction) => foodKind(p) === 'meal' ? 60 : foodKind(p) === 'cafe' ? 40 : p.contentTypeId === '38' ? 60 : available < 360 ? 45 : 75;
  const roleOf = (p: NopiAttraction) => foodKind(p) === 'meal' ? 'meal' : foodKind(p) === 'cafe' ? 'cafe' : ['12', '14', '28', '38'].includes(p.contentTypeId) ? 'visit' : 'other';
  const lunch = minutes(options.start) <= 780 && minutes(options.end) >= 840;
  const mealTimes = [...(lunch ? [690] : []), ...(available >= 660 && minutes(options.end) >= 1140 ? [1050] : [])];
  // Large regions can have hundreds of highly ranked sights in clusters with
  // no food. Do not spend every starting slot on such infeasible clusters.
  const foodGrid = new Map<string, NopiAttraction[]>();
  pool.forEach(p => {
    const role = roleOf(p); if (role !== 'meal' && role !== 'cafe') return;
    const key = `${role}:${cell(p).join(':')}`, bucket = foodGrid.get(key) || [];
    bucket.push(p); foodGrid.set(key, bucket);
  });
  const canStart = new Map<string, boolean>();
  const hasFoodNearby = (p: NopiAttraction) => {
    const known = canStart.get(p.contentId); if (known !== undefined) return known;
    const [y, x] = cell(p);
    const enough = (role: string, required: number) => {
      if (!required) return true;
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        for (const other of foodGrid.get(`${role}:${y + dy}:${x + dx}`) || []) {
          if (distance(p, other) <= limit && ++count >= required) return true;
        }
      }
      return false;
    };
    const valid = enough('cafe', 1) && enough('meal', mealTimes.length);
    canStart.set(p.contentId, valid); return valid;
  };
  type Path = { items: NopiAttraction[]; mealStarts: number[]; value: number; meters: number; cursor: number; visits: number; meals: number; cafes: number };
  // Prefer fewer close stops over filling the requested count with a remote place.
  for (let target = targetCourseCount(options); target >= 3; target--) {
    const wantedMeals = mealTimes.length, wantedCafes = 1, wantedVisits = target - wantedMeals - wantedCafes;
    if (wantedVisits < 1) continue;
    let beam: Path[] = [{ items: [], mealStarts: [], value: 0, meters: 0, cursor: minutes(options.start), visits: 0, meals: 0, cafes: 0 }];
    for (let index = 0; index < target; index++) {
      const next: Path[] = [];
      for (const path of beam) {
        const last = path.items.at(-1);
        const candidates = (last ? candidatesNear(last) : ranked).filter(p => {
          const role = roleOf(p);
          if (role === 'other' || (!index && role !== 'visit') || role === 'visit' && path.visits >= wantedVisits || role === 'meal' && path.meals >= wantedMeals || role === 'cafe' && path.cafes >= wantedCafes) return false;
          if (!index && !hasFoodNearby(p)) return false;
          if (path.items.some(t => t.contentId === p.contentId) || p.contentTypeId === '38' && path.items.some(t => t.contentTypeId === '38')) return false;
          // Stay in one compact group, avoiding gradual drift toward an isolated node.
          if (path.items.some(t => metersBetween(t, p) > limit)) return false;
          return !last || !rejectedEdges.has(edgeId(last.contentId, p.contentId));
        });
        const scored = candidates.map(p => {
          const meters = last ? metersBetween(last, p) : 0, role = roleOf(p);
          const mealStart = role === 'meal' ? mealTimes[path.meals] : 0;
          const timing = visitTime(Math.max(path.cursor + (last ? Math.ceil(meters / (options.transport === 'walk' ? 65 : 400)) + (options.transport === 'car' ? 5 : 0) : 0), mealStart), durationFor(p), p.planning, options.date);
          return { p, meters, role, mealStart, timing, value: score(p) + density.get(p.contentId)! * .7 - meters / limit * 7 - Math.max(0, timing.arrival - path.cursor - 30) / 90 };
        }).filter(item => item.timing.fits && item.timing.arrival + durationFor(item.p) <= minutes(options.end) && (item.role !== 'meal' || item.timing.arrival <= (item.mealStart < 900 ? 840 : 1200)))
          .sort((a, b) => b.value - a.value);
        const startOffset = Math.min((variant % 3) * 2, Math.max(0, scored.length - 1));
        const selected = !index ? scored.slice(startOffset, startOffset + 60) : scored.slice(0, 16);
        selected.forEach(item => next.push({ items: [...path.items, item.p], mealStarts: [...path.mealStarts, item.mealStart], value: path.value + item.value, meters: path.meters + item.meters, cursor: item.timing.arrival + durationFor(item.p), visits: path.visits + Number(item.role === 'visit'), meals: path.meals + Number(item.role === 'meal'), cafes: path.cafes + Number(item.role === 'cafe') }));
      }
      const perStart = new Map<string, number>();
      beam = next.sort((a, b) => b.value - a.value || a.meters - b.meters).filter(path => {
        const id = path.items[0].contentId, count = perStart.get(id) || 0;
        perStart.set(id, count + 1); return count < 8;
      }).slice(0, 200);
      if (!beam.length) break;
    }
    if (beam.length) return beam[0].items.map((p, index) => ({ ...tourismNode(p, durationFor(p)), reason: preference(p, options.purpose) ? `${options.purpose}에 어울리는 장소` : '가까운 동선으로 연결', ...(beam[0].mealStarts[index] ? { notBefore: beam[0].mealStarts[index] } : {}) }));
  }
  throw Error(`${courseDistanceLabel(options.transport)} 이내에서 연결할 가까운 장소가 부족해요. 거리를 넓히지 않았어요. 다른 권역을 선택하거나 직접 장소를 담아 주세요.`);
}

// Keep the starting place; compare up to three short, time-feasible orders.
// Only the selected set (at most six places) is permuted, bounding route API use.
export function courseOrderOptions(nodes: CourseNode[], options: NopiOptions): CourseNode[][] {
  if (nodes.length < 3 || nodes.length > 6) return [nodes];
  const choices: { nodes: CourseNode[]; meters: number }[] = [];
  const visit = (ordered: CourseNode[], remaining: CourseNode[]) => {
    if (!remaining.length) {
      const legs = courseLegs(ordered);
      const estimated = legs.map(leg => { const meters = distance(leg.from, leg.to); return { id: leg.id, status: 'ok' as const, distanceMeters: meters, durationMinutes: Math.ceil(meters / (options.transport === 'walk' ? 65 : 400)) + (options.transport === 'car' ? 5 : 0) }; });
      if (estimated.some(leg => leg.distanceMeters > courseDistanceLimit(options.transport)) || scheduleCourse(ordered, options.start, options.end, estimated, {}, options.date).errors.length) return;
      choices.push({ nodes: ordered, meters: estimated.reduce((sum, leg) => sum + leg.distanceMeters, 0) }); return;
    }
    remaining.forEach((node, i) => visit([...ordered, node], remaining.filter((_, j) => i !== j)));
  };
  visit([nodes[0]], nodes.slice(1));
  const ordered = choices.sort((a, b) => a.meters - b.meters).slice(0, 2).map(c => c.nodes);
  if (!ordered.some(order => order.every((node, i) => node.place.id === nodes[i].place.id))) ordered.push(nodes);
  return ordered.length ? ordered : [nodes];
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
    if (node.place.type === '카페' && node.place.durationMinutes < 30) errors.push('카페는 최소 30분으로 잡아 주세요.');
    cursor += node.place.durationMinutes;
    return { node, arrival, departure: cursor, wait, travel, route, manual: index > 0 && !route && travel != null };
  });
  if (cursor > minutes(end) || cursor > 1439) errors.push('종료 시간을 넘어요. 장소나 체류시간을 줄이거나 종료 시간을 늘려 주세요.');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end) || minutes(start) >= minutes(end)) errors.push('시작·종료 시간을 확인해 주세요.');
  return { stops, errors, finish: cursor };
}
export function courseDay(day: TripDay, nodes: CourseNode[], start: string, end: string, routes: DayRouteResult[], exclusions: Record<string, string>, manualTravel: Record<string, number> = {}): TripDay {
  if (!nodes.length || nodes.length > 12) throw Error('하루에 1~12개 장소를 담아 주세요.');
  const used = { ...exclusions };
  for (const node of nodes) {
    if (excludedPlace(node.place, used)) throw Error('여행에 이미 담은 장소가 있어요. 중복 장소를 바꿔 주세요.');
    placeKeys(node.place).forEach(key => { used[key] = '이날 담음'; });
  }
  const schedule = scheduleCourse(nodes, start, end, routes, manualTravel, day.date);
  if (schedule.errors.length) throw Error(schedule.errors[0]);
  return { ...day, blocks: schedule.stops.map(({ node, arrival, departure, route, travel, manual }, index) => ({ id: newId(), title: arrival < 720 ? '오전의 여행' : arrival < 1080 ? '오후의 발견' : '저녁의 여유', area: node.place.address.slice(0, 160), startTime: clock(arrival), endTime: clock(departure), notes: [node.originalNotes?.split('\n').filter(line => !/^(조회한 이동|직접 입력한 이동|운영 안내:|휴무 안내:|운영시간 확인 필요|방문일 운영 여부)/.test(line)).join('\n'), index ? `${manual ? '직접 입력한' : '조회한'} 이동 ${travel}분${route?.parkingMinutes ? ` (주차 여유 ${route.parkingMinutes}분 포함)` : ''}` : '', node.reason, node.planning?.hours ? `운영 안내: ${node.planning.hours}` : '운영시간 확인 필요', node.planning?.closed ? `휴무 안내: ${node.planning.closed}` : '', '방문일 운영 여부와 예약을 확인해 주세요.'].filter(Boolean).join('\n').slice(0, 1000), places: [{ ...node.place, travelMinutes: undefined }] })) };
}
