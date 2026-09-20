const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript'), crypto = require('node:crypto');
function load(path, deps = {}) { const box = { exports: {}, crypto, Error, require: name => { if (deps[name]) return deps[name]; if(name==='./travelNeeds')return load('src/features/trips/travelNeeds.ts'); if(name==='../../i18n/locale')return {getLocale:()=> 'ko'}; throw Error(name); } }; vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, box); return box.exports; }
const trip = load('src/features/trips/tripModel.ts');
const identity = load('src/features/trips/placeIdentity.ts', { './tripModel': trip });
const policy = load('src/features/trips/coursePolicy.ts');
const model = load('src/features/trips/nopiModel.ts', { './tripModel': trip, './placeIdentity': identity, './coursePolicy': policy });
const routing = load('src/features/trips/nopiRouting.ts', { './nopiModel': model, './coursePolicy': policy });
const draftModel = load('src/features/trips/nopiDraft.ts', { './coursePolicy': policy, './nopiModel': model, './placeIdentity': identity });
const place = (id, type = '12', lat = 35.55) => ({ contentId: id, contentTypeId: type, name: type === '39' ? `식당${id}` : `공원${id}`, type: type === '39' ? '음식점' : '관광지', address: '울산광역시 중구', district: '중구', lat, lng: 129.30, sourceUrl: '', planning: { menu: type === '39' ? '불고기' : '', hours: '', closed: '' }, demographicShare: 10, searchCount: 100 });
const catalog = [place('1'), place('2', '12', 35.552), place('3', '14', 35.554), place('4', '39', 35.553), { ...place('5', '39', 35.551), name: '커피집', planning: { menu: '아메리카노', hours: '', closed: '' } }, place('6', '12', 35.556)];
const options = { date: '2026-09-20', start: '09:00', end: '18:00', transport: 'walk', purpose: '자연산책', district: '중구' };
const make = () => trip.createTrip({ title: '울산 여행', destination: '울산', startDate: '2026-09-20', endDate: '2026-09-21', transport: 'car', outbound: 'local', companion: '친구' }).document;

test('official nationwide food categories work without Ulsan menu facts', () => {
  const national = catalog.map(p => ({ ...p, district: '경주시', planning: null, foodKind: p.contentId === '4' ? 'meal' : p.contentId === '5' ? 'cafe' : 'unknown' }));
  const nodes = model.suggestCourse(national, { ...options, district: '경주시' }, {});
  assert.ok(nodes.some(n => n.place.tourism.contentId === '4'));
  assert.ok(nodes.some(n => n.place.tourism.contentId === '5'));
  const cafe = nodes.find(n => n.place.tourism.contentId === '5');
  assert.equal(cafe.place.type, '카페');
  assert.ok(model.scheduleCourse([{ ...cafe, place: { ...cafe.place, durationMinutes: 20 } }], '09:00', '18:00', []).errors.some(e => e.includes('최소 30분')));
  assert.equal(model.foodKind({ ...national[0], foodKind: 'meal' }), 'unknown');
  assert.equal(model.foodKind({ ...national[3], foodKind: 'unknown', name: '알 수 없는 가게' }), 'unknown');
});

test('large provincial catalogs keep recommendations inside one nearby cluster', () => {
  const remote = Array.from({ length: 5000 }, (_, i) => ({ ...place(String(1000 + i), '12', 36 + i * .0001), lng: 128.1, district: '경주시' }));
  const local = catalog.map(p => ({ ...p, district: '경주시' }));
  const nodes = model.suggestCourse([...remote, ...local], { ...options, district: '경주시' }, {});
  assert.ok(nodes.length >= 3);
  assert.ok(nodes.every(n => Number(n.place.tourism.contentId) < 1000));
});

test('distance policy uses real path lengths with inclusive 1km/7km boundaries', () => {
  const route = meters => ({ id: 'a:b', status: 'ok', durationMinutes: 10, distanceMeters: meters });
  assert.equal(routing.routeWithinLimit(route(1000), 'walk'), true);
  assert.equal(routing.routeWithinLimit(route(1001), 'walk'), false);
  assert.equal(routing.routeWithinLimit(route(1400), 'walk'), false);
  assert.equal(routing.routeWithinLimit(route(7000), 'car'), true);
  assert.equal(routing.routeWithinLimit(route(7001), 'car'), false);
  assert.equal(routing.routeWithinLimit(route(12400), 'car'), false);
  assert.equal(routing.routeWithinLimit({ id: 'a:b', status: 'ok', durationMinutes: 5 }, 'walk'), false);
});

test('isolated high-ranking attraction cannot pull a course away from its nearby cluster', () => {
  for (const transport of ['walk', 'car']) {
    const nodes = model.suggestCourse([...catalog, { ...place('999', '12', 35.7), name: '외딴 소공원', searchCount: 1e9, demographicShare: 90 }], { ...options, transport }, {});
    assert.ok(!nodes.some(n => n.place.tourism.contentId === '999'));
    nodes.forEach(a => nodes.forEach(b => assert.ok(model.distance(a.place, b.place) <= policy.courseDistanceLimit(transport))));
  }
});

test('visit/cafe order is flexible: shop on the way is visited before a more distant cafe', () => {
  const a = { ...place('100'), name: '출발 명소', searchCount: 10000 }, b = { ...place('101', '38', 35.551), name: '동네 편집숍', searchCount: 1 }, c = { ...place('102', '39', 35.57), name: '커피집', planning: { menu: '커피', hours: '', closed: '' }, searchCount: 1 };
  const afternoon = { ...options, start: '16:00', end: '20:00', transport: 'car' };
  const nodes = model.suggestCourse([a, b, c], afternoon, {});
  assert.deepEqual(Array.from(nodes, n => n.place.name), ['출발 명소', '동네 편집숍', '커피집']);
  const oldOrder = [model.tourismNode(a, 45), model.tourismNode(c, 40), model.tourismNode(b, 60)];
  const orders = model.courseOrderOptions(oldOrder, afternoon);
  assert.deepEqual(Array.from(orders[0], n => n.place.name), ['출발 명소', '동네 편집숍', '커피집']);
});

test('fewer close candidates yield fewer stops with a notice, never an expanded radius', async () => {
  const limited = [catalog[0], catalog[3], catalog[4]];
  const query = async (_, legs) => ({ legs: legs.map(leg => ({ id: leg.id, status: 'ok', durationMinutes: 5, distanceMeters: 300 })) });
  const result = await routing.generateNearbyCourse(limited, options, {}, query, new AbortController().signal);
  assert.equal(result.nodes.length, 3); assert.match(result.notice, /3곳/); assert.match(result.notice, /1km/);
});

test('short straight lines cannot pass with long real walking/car routes', async () => {
  for (const [transport, meters] of [['walk', 1400], ['car', 12400]]) {
    let calls = 0;
    const query = async (_, legs) => { calls++; return { legs: legs.map(leg => ({ id: leg.id, status: 'ok', durationMinutes: 10, distanceMeters: meters })) }; };
    await assert.rejects(routing.generateNearbyCourse(catalog, { ...options, transport }, {}, query, new AbortController().signal), /이내|가까운|넓히지/);
    assert.ok(calls <= 9);
  }
});

test('real road comparisons can select a different order from straight-line ranking', async () => {
  const a = { ...place('100'), name: '출발 명소', searchCount: 10000 }, b = { ...place('101', '38', 35.551), name: '동네 편집숍', searchCount: 1 }, c = { ...place('102', '39', 35.57), name: '커피집', planning: { menu: '커피', hours: '', closed: '' }, searchCount: 1 };
  const query = async (_, legs) => ({ legs: legs.map(leg => ({ id: leg.id, status: 'ok', durationMinutes: 5, distanceMeters: leg.from.lat === a.lat && leg.to.lat === c.lat || leg.from.lat === c.lat && leg.to.lat === b.lat ? 300 : 2500 })) });
  const result = await routing.generateNearbyCourse([a, b, c], { ...options, start: '16:00', end: '20:00', transport: 'car' }, {}, query, new AbortController().signal);
  assert.equal(result.meters, 600); assert.deepEqual(Array.from(result.nodes, n => n.place.name), ['출발 명소', '커피집', '동네 편집숍']);
});

test('PC automatic courses exclude department stores even at high rank; manual additions still work', () => {
  const stores = [
    { name: '현대백화점 울산점' },
    { name: '롯데 백화점 부산본점' },
    { name: '더현대 서울' },
    { name: '신세계 강남점', classification: 'SH01' },
    { name: '나이키 롯데백화점 본점', classification: 'SH04' },
  ].map((fields, index) => ({ ...place(String(900 + index), '38', 35.551), searchCount: 1e9, demographicShare: 100, ...fields }));
  for (const transport of ['walk', 'car']) {
    const nodes = model.suggestCourse([...catalog, ...stores], { ...options, transport }, {});
    assert.ok(nodes.length >= 3);
    assert.ok(nodes.every(node => Number(node.place.tourism.contentId) < 900));
  }
  const manual = model.tourismNode(stores[0], 60);
  const day = model.courseDay(make().days[0], [manual], '09:00', '18:00', [], {});
  assert.equal(day.blocks[0].places[0].name, stores[0].name);
  const restaurant = { ...catalog[3], name: '강릉한우백화점', searchCount: 1e9 };
  assert.ok(model.suggestCourse([...catalog.filter(p => p.contentId !== restaurant.contentId), restaurant], options, {}).some(node => node.place.name === restaurant.name));
});

test('one unroutable place is replaced and all remaining legs still pass real distance checks', async () => {
  for (const transport of ['walk', 'car']) {
    const opts = { ...options, transport };
    const blocked = model.suggestCourse(catalog, opts, {})[0].place.lat;
    let calls = 0;
    const query = async (_, legs) => {
      calls++;
      return { legs: legs.map(leg => leg.from.lat === blocked || leg.to.lat === blocked
        ? { id: leg.id, status: 'unavailable', reason: 'no_route', providerResultCode: leg.from.lat === blocked ? 102 : 103 }
        : { id: leg.id, status: 'ok', durationMinutes: 5, distanceMeters: 300 }) };
    };
    const result = await routing.generateNearbyCourse(catalog, opts, {}, query, new AbortController().signal);
    assert.ok(result.nodes.every(node => node.place.lat !== blocked));
    assert.equal(result.routes.length, result.nodes.length - 1);
    assert.ok(result.routes.every(route => routing.routeWithinLimit(route, transport)));
    assert.match(result.notice, /경로.*제외/);
    assert.ok(calls > 1 && calls <= 9);
  }
});

test('a missing directed route is not retried when trying another order or nearby candidates', async () => {
  let blocked;
  const seen = new Set();
  const query = async (_, legs) => ({ legs: legs.map(leg => {
    const key = JSON.stringify([leg.from, leg.to]);
    blocked ||= key;
    assert.ok(!seen.has(key), 'cached routes should not make duplicate provider requests');
    seen.add(key);
    return key === blocked ? { id: leg.id, status: 'unavailable', reason: 'no_route', providerResultCode: 104 }
      : { id: leg.id, status: 'ok', durationMinutes: 5, distanceMeters: 300 };
  }) });
  const result = await routing.generateNearbyCourse(catalog, options, {}, query, new AbortController().signal);
  assert.ok(result.routes.every(route => route.status === 'ok'));
  assert.ok(model.courseLegs(result.nodes).every(leg => JSON.stringify([leg.from, leg.to]) !== blocked));
});

test('provider outages, quota errors, missing legs and malformed results do not trigger place replacement', async () => {
  for (const failure of [{ status: 'unavailable', reason: 'rate_limited' }, { status: 'unavailable', reason: 'service_unavailable' }, { status: 'unavailable', reason: 'provider_unavailable' }, { status: 'unavailable', reason: 'route_unavailable' }, { status: 'ok', durationMinutes: 5 }, null]) {
    let calls = 0;
    const query = async (_, legs) => { calls++; return { legs: failure ? legs.map(leg => ({ id: leg.id, ...failure })) : [] }; };
    await assert.rejects(routing.generateNearbyCourse(catalog, options, {}, query, new AbortController().signal), /확인|한도/);
    assert.equal(calls, 1);
  }
});

test('route replacement is bounded even when every candidate has no route', async () => {
  let calls = 0;
  const query = async (_, legs) => { calls++; return { legs: legs.map(leg => ({ id: leg.id, status: 'unavailable', reason: 'no_route', providerResultCode: 1 })) }; };
  await assert.rejects(routing.generateNearbyCourse(catalog, options, {}, query, new AbortController().signal), error => /경로를 확인할 수 없는 구간/.test(error.message) && !/7km|1km/.test(error.message));
  assert.ok(calls <= 9);
});

test('automatic courses avoid repeated entrance coordinates and nearby tenants while manual stops remain usable', () => {
  const cafe = catalog[4];
  const tenants = [
    { ...place('801', '28', cafe.lat), name: '실내 체험장', searchCount: 1e9 },
    { ...place('802', '14', cafe.lat + .00008), name: '공연장', searchCount: 1e9 },
    { ...place('803', '39', cafe.lat + .00008), name: '같은 건물 식당', searchCount: 1e9 },
  ];
  for (const transport of ['car', 'walk']) {
    const nodes = model.suggestCourse([...catalog, ...tenants], { ...options, transport }, {});
    assert.ok(nodes.length >= 3);
    nodes.forEach((node, i) => nodes.slice(i + 1).forEach(other => assert.ok(model.distance(node.place, other.place) >= 20)));
  }
  const manual = [model.tourismNode(tenants[0], 60), model.tourismNode(cafe, 40)];
  const routes = model.courseLegs(manual).map(leg => ({ id: leg.id, status: 'ok', distanceMeters: 0, durationMinutes: 0 }));
  assert.equal(model.courseDay(make().days[0], manual, '09:00', '18:00', routes, {}).blocks.length, 2);
});

test('day two recovers from Kakao 104 while excluding the five stops already drafted on day one', async () => {
  const bothClusters = [...catalog, ...catalog.map(place => ({ ...place, contentId: String(Number(place.contentId) + 100), lat: place.lat + .15 }))];
  const opts = { ...options, transport: 'car' };
  const ok = leg => ({ id: leg.id, status: 'ok', durationMinutes: 5, distanceMeters: 300 });
  const dayOne = await routing.generateNearbyCourse(bothClusters, opts, {}, async (_, legs) => ({ legs: legs.map(ok) }), new AbortController().signal);
  assert.equal(dayOne.nodes.length, 5);
  const doc = make(), drafts = draftModel.createNopiDrafts(doc);
  drafts[doc.days[0].id].nodes = dayOne.nodes;
  const exclusions = draftModel.nopiDraftExclusions(doc, drafts, doc.days[1].id);
  const before = JSON.stringify(drafts);
  let blocked, calls = 0;
  const query = async (_, legs) => {
    calls++;
    blocked ||= JSON.stringify([legs.at(-1).from, legs.at(-1).to]);
    return { legs: legs.map(leg => JSON.stringify([leg.from, leg.to]) === blocked
      ? { id: leg.id, status: 'unavailable', reason: 'no_route', providerResultCode: 104 } : ok(leg)) };
  };
  const dayTwo = await routing.generateNearbyCourse(bothClusters, { ...opts, date: '2026-09-21' }, exclusions, query, new AbortController().signal);
  assert.ok(dayTwo.nodes.every(node => !exclusions[node.place.tourism.contentId]));
  assert.ok(dayTwo.routes.every(route => routing.routeWithinLimit(route, 'car')));
  assert.match(dayTwo.notice, /경로.*제외/);
  assert.ok(calls > 1 && calls <= 9);
  assert.equal(JSON.stringify(drafts), before, 'generation must preserve the first day and existing drafts');
});

test('saved transport is inherited, explicit per-day changes persist, transit is not silently converted', () => {
  const doc = make(); doc.transport = 'walk';
  assert.equal(policy.effectiveTransport(doc, doc.days[0]), 'walk');
  const drivingDay = policy.withDayTransport(doc.days[0], 'car', doc.transport);
  assert.equal(policy.effectiveTransport(doc, JSON.parse(JSON.stringify(drivingDay))), 'car');
  const inherit = policy.withDayTransport(drivingDay, 'walk', doc.transport);
  assert.equal(inherit.transport, undefined);
  doc.transport = 'transit'; assert.equal(policy.effectiveTransport(doc, inherit), 'transit');
  assert.throws(() => model.suggestCourse(catalog, { ...options, transport: 'transit' }, {}), /대중교통/);
});

test('direct search stops survive scheduling/reopening and require new travel after replacement', () => {
  const doc = make(), original = model.tourismNode(catalog[0], 60);
  const direct = { place: { id: crypto.randomUUID(), name: '새 카페', address: '울산 중구', lat: 35.553, lng: 129.31, type: '카페', durationMinutes: 40, fixed: false, source: 'manual', candidateSource: 'live', priceNeedsCheck: true, sourceUrl: 'https://place.map.kakao.com/12345' } };
  const nodes = [original, direct], routes = model.courseLegs(nodes).map(leg => ({ id: leg.id, status: 'ok', durationMinutes: 15 }));
  const day = model.courseDay(doc.days[0], nodes, '09:00', '18:00', routes, {});
  const restored = model.dayNodes(JSON.parse(JSON.stringify(day)))[1].place;
  assert.equal(restored.sourceUrl, direct.place.sourceUrl); assert.equal(restored.source, 'manual'); assert.equal(restored.tourism, undefined); assert.equal(restored.lat, 35.553);
  assert.equal(model.scheduleCourse([original, { place: { ...direct.place, id: crypto.randomUUID() } }], '09:00', '18:00', routes).errors.length, 1);
  assert.ok(model.scheduleCourse([{ place: { ...direct.place, durationMinutes: 20 } }], '09:00', '18:00', []).errors.length);
});

test('duplicate detection spans providers and dates without excluding distant namesakes', () => {
  const doc = make(), official = model.tourismNode(catalog[0], 60).place;
  doc.days[0].blocks[0].places = [official];
  const excluded = model.tripExclusions(doc, doc.days[1].id);
  const direct = { ...official, tourism: undefined, source: 'manual', sourceUrl: 'https://place.map.kakao.com/987', name: ` ${official.name} `, lat: official.lat + 0.0002 };
  assert.equal(identity.excludedPlace(direct, excluded), 'DAY 1에 담음');
  assert.equal(identity.excludedPlace({ ...direct, lat: official.lat + 0.01 }, excluded), undefined);
  assert.throws(() => model.courseDay(doc.days[1], [{ place: direct }], '09:00', '18:00', [], excluded), /이미/);
  const idExclusion = Object.fromEntries(identity.placeKeys(direct).map(key => [key, 'DAY 1']));
  assert.equal(identity.excludedPlace({ ...direct, name: '이름 변경', lat: 36 }, idExclusion), 'DAY 1');
});

test('replacing an official anchor with direct place preserves neighbors and user notes, clears stale facts', () => {
  const doc = make(), day = doc.days[0], block = day.blocks[0];
  const official = model.tourismNode(catalog[0], 60).place;
  const neighbor = { ...model.tourismNode(catalog[1], 30).place, tourism: undefined, source: 'manual', fixed: false };
  block.places = [official, neighbor]; block.notes = '예약 확인하기\n운영 안내: 09:00~18:00\n조회한 이동 15분';
  const picked = { ...official, tourism: undefined, source: 'manual', fixed: false, sourceUrl: 'https://place.map.kakao.com/111', name: '직접 고른 공원', lat: 35.58 };
  const next = identity.putTripPlace(doc, day.id, block.id, picked, official.id);
  assert.equal(next.days[0].blocks[0].places.length, 2); assert.equal(next.days[0].blocks[0].places[1].id, neighbor.id);
  assert.equal(next.days[0].blocks[0].notes, '예약 확인하기'); assert.equal(next.days[1], doc.days[1]);
  assert.equal(doc.days[0].blocks[0].places[0].name, official.name);
  assert.throws(() => identity.putTripPlace(doc, day.id, block.id, { ...picked, durationMinutes: 600 }, official.id), /시간/);
});

test('manual pin needs valid domestic coordinates and rejects an existing trip place', () => {
  const doc = make(), place = { ...model.tourismNode(catalog[0], 60).place, tourism: undefined, source: 'manual', fixed: false };
  assert.throws(() => identity.validatePickedPlace({ ...place, lat: null }), /위치/);
  assert.throws(() => identity.validatePickedPlace({ ...place, lat: 0 }), /위치/);
  const next = identity.putTripPlace(doc, doc.days[0].id, doc.days[0].blocks[0].id, place);
  assert.throws(() => identity.putTripPlace(next, doc.days[1].id, doc.days[1].blocks[0].id, place), /이미/);
});

test('automatic course mixes real meals/cafes and excludes used places, course bundles, closed and distant POIs', () => {
  const result = model.suggestCourse([...catalog, { ...place('7'), contentTypeId: '25', searchCount: 1e8 }, { ...place('8', '12', 35.9), searchCount: 1e8 }, { ...place('9'), planning: { closed: '매주 일요일' }, searchCount: 1e8 }], options, { '6': 'DAY 1' });
  const ids = result.map(n => n.place.tourism.contentId);
  assert.equal(ids.length, 5); assert.equal(new Set(ids).size, 5);
  ['6', '7', '8', '9'].forEach(id => assert.ok(!ids.includes(id)));
  assert.ok(ids.includes('4')); assert.ok(ids.includes('5'));
  assert.equal(result.find(n => n.place.tourism.contentId === '4').notBefore, 690);
  assert.equal(model.foodKind({ ...place('30', '39'), planning: null }), 'unknown');
});
test('manual and automatic scheduling require real routes or explicit user times, account for all stays, and reject overflow', () => {
  const nodes = catalog.slice(0, 2).map(p => model.tourismNode(p, 60));
  const leg = model.courseLegs(nodes)[0];
  assert.equal(model.scheduleCourse(nodes, '09:00', '12:00', []).errors.length, 1);
  const routes = [{ id: leg.id, status: 'ok', durationMinutes: 25, distanceMeters: 1200 }];
  const result = model.scheduleCourse(nodes, '09:00', '12:00', routes);
  assert.equal(result.stops[1].arrival, 625); assert.equal(result.finish, 685); assert.equal(result.errors.length, 0);
  assert.equal(model.scheduleCourse(nodes, '09:00', '11:00', routes).errors.length, 1);
  assert.equal(model.scheduleCourse(nodes, '09:00', '12:00', [], { [leg.id]: 30 }).stops[1].manual, true);
  assert.throws(() => model.courseDay(make().days[0], nodes, '09:00', '12:00', [], {}));
});
test('applying generates independent time slots, preserves source metadata, and blocks duplicates across every day', () => {
  const doc = make(), nodes = [model.tourismNode(catalog[0], 60), model.tourismNode(catalog[1], 60)];
  const routes = [{ id: model.courseLegs(nodes)[0].id, status: 'ok', durationMinutes: 15, distanceMeters: 800 }];
  const day = model.courseDay(doc.days[0], nodes, '09:00', '18:00', routes, {});
  assert.equal(day.blocks[0].startTime, '09:00'); assert.equal(day.blocks[1].startTime, '10:15');
  assert.equal(day.blocks[1].places[0].tourism.contentId, '2'); assert.equal(day.blocks[1].places[0].travelMinutes, undefined);
  const updated = { ...doc, days: [day, doc.days[1]] };
  assert.equal(model.tripExclusions(updated, doc.days[1].id)['1'], 'DAY 1에 담음');
  assert.throws(() => model.courseDay(doc.days[1], nodes, '09:00', '18:00', routes, model.tripExclusions(updated, doc.days[1].id)));
  assert.throws(() => model.courseDay(day, [nodes[0], nodes[0]], '09:00', '18:00', routes, {}));
  assert.equal(doc.days[0].blocks[0].places.length, 0);
});
test('a replaced or reordered node never reuses another edge travel result', () => {
  const nodes = catalog.slice(0, 3).map(p => model.tourismNode(p, 60));
  const routes = model.courseLegs(nodes).map(leg => ({ id: leg.id, status: 'ok', durationMinutes: 10, distanceMeters: 500 }));
  assert.equal(model.scheduleCourse([nodes[2], nodes[1], nodes[0]], '09:00', '18:00', routes).errors.length, 2);
});
test('insufficient candidates produce actionable failure instead of duplicate or distant fillers', () => {
  assert.throws(() => model.suggestCourse(catalog.filter(p => p.contentTypeId !== '39'), options, {}));
  assert.throws(() => model.suggestCourse(catalog, { ...options, end: '10:00' }, {}));
});
test('opening times, break times, monthly closures, and weekday hours constrain arrival', () => {
  assert.equal(model.closedOn({ ...place('90'), planning: { closed: '매월 첫째 / 셋째 일요일' } }, '2026-09-20'), true);
  assert.equal(model.closedOn({ ...place('90'), planning: { closed: '매월 첫째 / 셋째 일요일' } }, '2026-09-27'), false);
  const node = model.tourismNode({ ...place('91', '39'), planning: { hours: '매일 11:30 - 21:00 (브레이크타임 15:00~16:30)', menu: '불고기', closed: '' } }, 60);
  assert.equal(model.scheduleCourse([node], '09:00', '18:00', [], {}, '2026-09-20').stops[0].arrival, 690);
  assert.equal(model.scheduleCourse([node], '14:30', '18:00', [], {}, '2026-09-20').stops[0].arrival, 990);
  assert.equal(model.scheduleCourse([node], '20:30', '22:00', [], {}, '2026-09-20').errors.length, 1);
  const hours = model.openingWindow({ hours: '평일 08:00~22:00\n주말 10:00~22:00' }, '2026-09-20');
  assert.equal(hours.open, 600);
  const withNightFood = [...catalog, { ...place('99', '39'), searchCount: 10000000, planning: { hours: '17:30~01:00', menu: '닭발', closed: '' } }];
  assert.ok(!model.suggestCourse(withNightFood, options, {}).some(node => node.place.tourism.contentId === '99'));
});
test('reopening a saved day retains its appointment times and user notes before any edit', () => {
  const doc = make();
  const day = doc.days[0];
  day.blocks = [{ id: 'b1', title: '예약', startTime: '11:30', endTime: '12:30', area: '', notes: '친구 생일 케이크 챙기기', places: [model.tourismNode(catalog[3], 60).place] }];
  const nodes = model.dayNodes(day);
  const result = model.courseDay(day, nodes, '09:00', '18:00', [], {});
  assert.equal(result.blocks[0].startTime, '11:30'); assert.match(result.blocks[0].notes, /친구 생일 케이크 챙기기/);
});


test('multi-day planner keeps separate times, transport and nodes for every date', () => {
  const doc = make(), drafts = draftModel.createNopiDrafts(doc), [first, second] = doc.days;
  drafts[first.id].start = '10:00'; drafts[first.id].transport = 'walk';
  drafts[first.id].nodes = [model.tourismNode(catalog[0], 60)];
  assert.equal(drafts[second.id].start, '09:00'); assert.equal(drafts[second.id].transport, 'car');
  assert.equal(drafts[second.id].nodes.length, 0); assert.equal(doc.days[0].blocks[0].places.length, 0);
  drafts[second.id].end = '20:00'; assert.equal(drafts[first.id].end, '18:00');
});

test('unapplied day drafts exclude places across days, including replacements and removals', () => {
  const doc = make(), drafts = draftModel.createNopiDrafts(doc), [first, second] = doc.days;
  drafts[first.id].nodes = [model.tourismNode(catalog[0], 60)];
  assert.equal(draftModel.nopiDraftExclusions(doc, drafts, second.id)['1'], 'DAY 1에 담음');
  assert.equal(draftModel.nopiDraftExclusions(doc, drafts, first.id)['1'], undefined);
  drafts[first.id].nodes = [model.tourismNode(catalog[1], 60)];
  const excluded = draftModel.nopiDraftExclusions(doc, drafts, second.id);
  assert.equal(excluded['1'], undefined); assert.equal(excluded['2'], 'DAY 1에 담음');
});

test('multi-day apply validates all drafts before returning, rejects stale routes and leaves unedited days intact', () => {
  const doc = make(), drafts = draftModel.createNopiDrafts(doc), [first, second] = doc.days;
  Object.assign(drafts[first.id], { edited: true, transport: 'walk', start: '10:00', nodes: [model.tourismNode(catalog[0], 60)] });
  Object.assign(drafts[second.id], { edited: true, nodes: [model.tourismNode(catalog[1], 60), model.tourismNode(catalog[2], 60)] });
  assert.throws(() => draftModel.buildNopiDays(doc, drafts), /DAY 2/);
  drafts[second.id].routesResponse = { key: draftModel.nopiRouteKey(drafts[second.id]), routes: model.courseLegs(drafts[second.id].nodes).map(leg => ({ id: leg.id, status: 'ok', durationMinutes: 10 })) };
  const days = draftModel.buildNopiDays(doc, drafts);
  assert.equal(days.length, 2); assert.equal(days[0].blocks[0].startTime, '10:00'); assert.equal(days[0].transport, 'walk'); assert.equal(days[1].transport, undefined);
  assert.equal(doc.days[0].blocks[0].places.length, 0);
  drafts[second.id].transport = 'walk'; assert.throws(() => draftModel.buildNopiDays(doc, drafts), /이동시간/);
  drafts[second.id].edited = false; assert.equal(draftModel.buildNopiDays(doc, drafts).length, 1);
  drafts[second.id].nodes = [model.tourismNode(catalog[0], 60)]; drafts[second.id].edited = true;
  assert.throws(() => draftModel.buildNopiDays(doc, drafts), /이미/);
});

const travelNeeds=load('src/features/trips/travelNeeds.ts');
const support=()=>({contentId:'1',checkedAt:'2026-09-20',pet:{status:'ok',allowed:'conditional',species:['dog'],maxKg:10,exclusiveMax:true,weightRestricted:true,indoor:'unknown',facts:[]},access:{status:'ok',facilities:{entrance:{state:'yes',text:'휠체어 접근 가능'}}}});
test('required unknown facilities never enter auto routes; preference remains optional',()=>{
  const needs=travelNeeds.emptyNeeds();needs.facilities.entrance='required';
  assert.equal(travelNeeds.evaluateNeeds(undefined,needs).eligible,false);
  assert.equal(travelNeeds.evaluateNeeds(support(),needs).eligible,true);
  needs.facilities.entrance='prefer';assert.equal(travelNeeds.evaluateNeeds(undefined,needs).eligible,true);
});
test('pet weight boundary, species and indoor unknown conditions cannot be silently relaxed',()=>{
  const needs=travelNeeds.emptyNeeds();needs.pet={enabled:true,species:'dog',weightKg:9,indoor:false};
  assert.equal(travelNeeds.evaluateNeeds(support(),needs).eligible,true);
  for(const patch of [{weightKg:10},{weightKg:null},{species:'cat'},{indoor:true}])assert.equal(travelNeeds.evaluateNeeds(support(),{...needs,pet:{...needs.pet,...patch}}).eligible,false);
});
test('strict facility routes can be shorter but still pass real distance checks and exclude unknown stops',async()=>{
  const needs=travelNeeds.emptyNeeds();needs.facilities.entrance='required';
  const sparse=catalog.map((p,i)=>({...p,...(i<2?{support:support()}:{})}));
  const query=async(_transport,legs)=>({legs:legs.map(leg=>({id:leg.id,status:'ok',distanceMeters:500,durationMinutes:8}))});
  const result=await routing.generateNearbyCourse(sparse,{...options,needs},{},query,new AbortController().signal);
  assert.equal(result.nodes.length,2);assert.ok(result.nodes.every(n=>['1','2'].includes(n.place.tourism.contentId)));
  await assert.rejects(()=>routing.generateNearbyCourse(sparse,{...options,needs},{},async(_t,legs)=>({legs:legs.map(l=>({id:l.id,status:'ok',distanceMeters:1200,durationMinutes:20}))}),new AbortController().signal));
  assert.throws(()=>model.suggestCourse(catalog,{...options,needs},{}),/필수 조건/);
});
test('central and related ranks cannot pull an isolated stop outside the distance limit',()=>{
 const nodes=model.suggestCourse([...catalog,{...place('900','12',36),centralRank:1,relatedRank:1}],options,{});
 assert.ok(nodes.every(n=>n.place.tourism.contentId!=='900'));
});
