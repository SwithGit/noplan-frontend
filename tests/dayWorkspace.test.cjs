const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript'), crypto = require('node:crypto');
function load(path, deps = {}) { const box = { exports: {}, crypto, require: name => { if (deps[name]) return deps[name]; throw Error(name); } }; vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, box); return box.exports; }
const trip = load('src/features/trips/tripModel.ts');
const route = load('src/features/trips/dayRouteModel.ts', { './tripModel': trip });
const model = load('src/features/trips/dayWorkspaceModel.ts', { './tripModel': trip, './dayRouteModel': route });
const place = id => ({ id, name: id, address: '울산', durationMinutes: 60, lat: 35.55, lng: 129.3 });
const day = () => ({ id: 'day', date: '2026-09-20', blocks: [
  { id: 'pm', startTime: '13:00', endTime: '16:00', places: [place('shop')] },
  { id: 'am', startTime: '09:00', endTime: '12:00', notes: '개인 예약 메모', places: [place('park'), { ...place('cafe'), durationMinutes: 30 }] },
  { id: 'night', startTime: '18:00', endTime: '21:00', places: [] },
] });
test('cards and map share chronological numbering across blocks, including nearby stops', () => {
  const input = day(), original = JSON.stringify(input), stops = model.workspaceStops(input);
  assert.deepEqual(Array.from(stops, s => [s.number, s.place.id, s.arrival]), [[1, 'park', 540], [2, 'cafe', 615], [3, 'shop', 780]]);
  assert.equal(stops[1].provisional, true);
  assert.equal(JSON.stringify(input), original);
  assert.deepEqual(Array.from(model.workspaceLegs(input), leg => leg.id), ['park:cafe', 'cafe:shop']);
});
test('known travel time replaces the provisional time and missing coordinates remain unverified', () => {
  const input = day(); input.blocks[1].places[1].travelMinutes = 7; delete input.blocks[0].places[0].lat;
  const stops = model.workspaceStops(input);
  assert.equal(stops[1].arrival, 607); assert.equal(stops[1].provisional, false);
  assert.equal(model.workspaceLegs(input)[1].to, null);
  assert.equal(model.workspaceTime(1455), '다음 날 00:15');
});
test('an estimated earlier leg keeps later arrival times marked provisional', () => {
  const input = day(); input.blocks[1].places.push({ ...place('museum'), travelMinutes: 5 });
  assert.equal(model.workspaceStops(input)[2].provisional, true);
});
test('removing a stop preserves slots, user notes and unrelated blocks, and invalidates dependent travel', () => {
  const input = day(), original = JSON.stringify(input);
  const next = model.removeWorkspacePlace(input, input.blocks[1].places[0]);
  assert.equal(JSON.stringify(input), original);
  assert.equal(next.blocks[0], input.blocks[0]);
  assert.equal(next.blocks[1].notes, '개인 예약 메모');
  assert.equal(next.blocks[1].places[0].id, 'cafe');
  assert.equal(next.blocks[1].places[0].travelMinutes, undefined);
  const empty = model.removeWorkspacePlace(next, next.blocks[1].places[0]);
  assert.equal(empty.blocks[1].places.length, 0); assert.equal(empty.blocks[1].startTime, '09:00');
});
test('reordered outings update map legs without altering time slots or losing stops', () => {
  const input = day(), moved = route.moveDayOuting(input, 'am', 1);
  assert.deepEqual(Array.from(model.workspaceStops(moved), s => s.place.id), ['shop', 'park', 'cafe']);
  assert.deepEqual(Array.from(model.workspaceLegs(moved), s => s.id), ['shop:park', 'park:cafe']);
});
