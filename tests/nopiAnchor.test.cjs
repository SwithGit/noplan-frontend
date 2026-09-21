const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript'), crypto = require('node:crypto');
function load(path, deps = {}) { const box = { exports: {}, crypto, Error, require: name => { if (deps[name]) return deps[name]; if (name === './travelNeeds') return load('src/features/trips/travelNeeds.ts'); if (name === '../../i18n/locale') return { getLocale: () => 'ko' }; throw Error(name); } }; vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, box); return box.exports; }
const trip = load('src/features/trips/tripModel.ts');
const identity = load('src/features/trips/placeIdentity.ts', { './tripModel': trip });
const policy = load('src/features/trips/coursePolicy.ts');
const model = load('src/features/trips/nopiModel.ts', { './tripModel': trip, './placeIdentity': identity, './coursePolicy': policy });
const routing = load('src/features/trips/nopiRouting.ts', { './nopiModel': model, './coursePolicy': policy });
const tourism = load('src/features/trips/tourismModel.ts', { './tripModel': trip });
const draft = load('src/features/trips/nopiDraft.ts', { './coursePolicy': policy, './nopiModel': model, './placeIdentity': identity });
const place = (id, lat, kind = 'visit') => ({ contentId: id, contentTypeId: kind === 'visit' ? '12' : '39', name: kind === 'cafe' ? '카페' + id : kind === 'meal' ? '식당' + id : '공원' + id, type: kind === 'visit' ? '관광지' : '음식점', foodKind: kind, address: '서울 종로구', district: '종로구', lat, lng: 126.98, sourceUrl: '', planning: { menu: '', hours: '', closed: '' } });
const catalog = [place('1', 37.58), place('2', 37.581), place('3', 37.582), place('4', 37.583, 'meal'), place('5', 37.579, 'cafe'), { ...place('99', 37.7), searchCount: 1e12 }];
const base = { date: '2026-09-22', start: '09:00', end: '21:00', transport: 'walk', purpose: '문화여행', district: '' };
const query = async (_, legs) => ({ legs: legs.map(leg => ({ id: leg.id, status: 'ok', distanceMeters: 400, durationMinutes: 10 })) });
function anchor(start = '13:00', end = '17:00') { const node = model.tourismNode(catalog[0], 90); node.place.requiredVisit = { start, end }; return node; }

test('morning, afternoon and evening required visits survive generation and repeat generation', async () => {
 for (const [start, end] of [['09:00','12:00'], ['13:00','17:00'], ['18:00','21:00']]) {
  const required = anchor(start, end), options = { ...base, anchor: required };
  for (let variant = 0; variant < 3; variant++) {
   const result = await routing.generateNearbyCourse(catalog, options, {}, query, new AbortController().signal, variant);
   assert.ok(result.nodes.length >= 3);
   assert.equal(result.nodes.filter(n => n.place.id === required.place.id).length, 1);
   assert.ok(!result.nodes.some(n => n.place.tourism.contentId === '99'));
   const schedule = model.scheduleCourse(result.nodes, base.start, base.end, result.routes, {}, base.date);
   assert.equal(schedule.errors.length, 0);
   const stop = schedule.stops.find(s => s.node.place.id === required.place.id);
   assert.ok(stop.arrival >= trip.minutes(start)); assert.ok(stop.departure <= trip.minutes(end));
   assert.equal(stop.node.place.durationMinutes, 90);
   if (start === '13:00') { assert.ok(schedule.stops.indexOf(stop) > 0); assert.ok(schedule.stops.indexOf(stop) < schedule.stops.length - 1); }
  }
 }
});

test('isolated anchor stays as the only stop and makes no routing requests', async () => {
 let calls = 0;
 const result = await routing.generateNearbyCourse([catalog[0], catalog[5]], { ...base, anchor: anchor() }, {}, async () => { calls++; throw Error('unexpected request'); }, new AbortController().signal);
 assert.equal(result.nodes.length, 1); assert.equal(result.nodes[0].place.tourism.contentId, '1'); assert.match(result.notice, /부족/); assert.equal(calls, 0);
});

test('long actual paths return a partial course retaining the chosen place within bounded route calls', async () => {
 let calls = 0;
 const result = await routing.generateNearbyCourse(catalog, { ...base, anchor: anchor() }, {}, async (_, legs) => { calls++; return { legs: legs.map(leg => ({ id: leg.id, status: 'ok', distanceMeters: 8000, durationMinutes: 30 })) }; }, new AbortController().signal);
 assert.equal(result.nodes.length, 1); assert.equal(result.nodes[0].place.tourism.contentId, '1'); assert.ok(result.notice); assert.ok(calls <= 9);
});

test('confirmed no-road anchors are never silently replaced; outages fail without a replacement', async () => {
 const options = { ...base, anchor: anchor() };
 const result = await routing.generateNearbyCourse(catalog, options, {}, async (_, legs) => ({ legs: legs.map(leg => ({ id: leg.id, status: 'unavailable', reason: 'no_route', providerResultCode: 102 })) }), new AbortController().signal);
 assert.ok(result.nodes.some(n => n.place.tourism.contentId === '1'));
 await assert.rejects(routing.generateNearbyCourse(catalog, options, {}, async (_, legs) => ({ legs: legs.map(leg => ({ id: leg.id, status: 'unavailable', reason: 'rate_limited' })) }), new AbortController().signal), /한도/);
});

test('closed days, incompatible opening hours, duplicates, required facilities and trip time conflict fail explicitly', () => {
 const options = { ...base, anchor: anchor() };
 const closed = catalog.map((p, i) => i ? p : { ...p, planning: { ...p.planning, closed: '매주 화요일' } });
 assert.throws(() => model.suggestCourse(closed, options, {}), /휴무/);
 const tooLate = { ...anchor(), planning: { hours: '18:00~22:00', menu: '', closed: '' } };
 assert.throws(() => model.suggestCourse(catalog.map((p, i) => i ? p : { ...p, planning: tooLate.planning }), { ...options, anchor: tooLate }, {}), /시간대/);
 assert.throws(() => model.suggestCourse(catalog, { ...options, end: '12:00' }, {}), /종료/);
 const excluded = Object.fromEntries(identity.placeKeys(options.anchor.place).map(k => [k, 'other day']));
 assert.throws(() => model.suggestCourse(catalog, options, excluded), /다른 날짜/);
 assert.throws(() => model.suggestCourse(catalog, { ...options, needs: { facilities: { restroom: 'required' } } }, {}), /필수/);
});

test('selection -> persistence -> draft -> generation -> saved day -> reopen retains the original visit window', async () => {
 let doc = trip.createTrip({ title: '서울', destination: '서울', startDate: base.date, endDate: base.date, transport: 'walk', outbound: 'local', companion: '친구' }).document;
 doc = tourism.setTourismAnchor(doc, doc.days[0].id, doc.days[0].blocks[1].id, catalog[0], 90, true);
 const original = doc.days[0].blocks[1].places[0];
 assert.equal(original.requiredVisit.start, '13:00');
 const drafts = draft.createNopiDrafts(JSON.parse(JSON.stringify(doc))), current = drafts[doc.days[0].id];
 const result = await routing.generateNearbyCourse(catalog, { ...base, anchor: current.nodes[0] }, {}, query, new AbortController().signal);
 const day = model.courseDay(doc.days[0], result.nodes, base.start, base.end, result.routes, {});
 const reopened = model.dayNodes(JSON.parse(JSON.stringify(day)));
 const kept = reopened.find(n => n.place.id === original.id);
 assert.equal(kept.place.requiredVisit.start, '13:00'); assert.equal(kept.place.requiredVisit.end, '17:00');
 const again = await routing.generateNearbyCourse(catalog, { ...base, anchor: kept }, {}, query, new AbortController().signal);
 assert.ok(again.nodes.some(n => n.place.id === original.id));
});
