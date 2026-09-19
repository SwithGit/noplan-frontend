const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript'), crypto = require('node:crypto');
function load(path, deps = {}) { const box = { exports: {}, crypto, require: name => { if (deps[name]) return deps[name]; throw Error(name); } }; vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, box); return box.exports; }
const trip = load('src/features/trips/tripModel.ts');
const model = load('src/features/trips/nopiModel.ts', { './tripModel': trip });
const place = (id, type = '12', lat = 35.55) => ({ contentId: id, contentTypeId: type, name: type === '39' ? `식당${id}` : `공원${id}`, type: type === '39' ? '음식점' : '관광지', address: '울산광역시 중구', district: '중구', lat, lng: 129.30, sourceUrl: '', planning: { menu: type === '39' ? '불고기' : '', hours: '', closed: '' }, demographicShare: 10, searchCount: 100 });
const catalog = [place('1'), place('2', '12', 35.552), place('3', '14', 35.554), place('4', '39', 35.553), { ...place('5', '39', 35.551), name: '커피집', planning: { menu: '아메리카노', hours: '', closed: '' } }, place('6', '12', 35.556)];
const options = { date: '2026-09-20', start: '09:00', end: '18:00', transport: 'walk', purpose: '자연산책', district: '중구' };
const make = () => trip.createTrip({ title: '울산 여행', destination: '울산', startDate: '2026-09-20', endDate: '2026-09-21', transport: 'car', outbound: 'local', companion: '친구' }).document;

test('automatic course mixes real meals/cafes and excludes used places, course bundles, closed and distant POIs', () => {
  const result = model.suggestCourse([...catalog, { ...place('7'), contentTypeId: '25', searchCount: 1e8 }, { ...place('8', '12', 35.9), searchCount: 1e8 }, { ...place('9'), planning: { closed: '매주 일요일' }, searchCount: 1e8 }], options, { '6': 'DAY 1' });
  const ids = result.map(n => n.place.tourism.contentId);
  assert.equal(ids.length, 5); assert.equal(new Set(ids).size, 5);
  ['6', '7', '8', '9'].forEach(id => assert.ok(!ids.includes(id)));
  assert.equal(result[1].place.tourism.contentId, '4'); assert.equal(result[3].place.tourism.contentId, '5');
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
