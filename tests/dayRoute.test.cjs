const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript'), crypto = require('node:crypto');
function load(path, deps = {}) { const sandbox = { exports: {}, crypto, require: name => { if (deps[name]) return deps[name]; if(name==='../../i18n/locale')return {getLocale:()=> 'ko'}; throw new Error(name); } }; vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, sandbox); return sandbox.exports; }
const model = load('src/features/trips/tripModel.ts');
const { dayRouteLegs, moveDayOuting, routePoint } = load('src/features/trips/dayRouteModel.ts', { './tripModel': model });
const place = (id, lat = 35.5) => ({ id, name: id, lat, lng: 129.3, durationMinutes: 60, fixed: true, travelMinutes: 5 });
const day = () => ({ id: 'day', date: '2026-09-20', blocks: [
  { id: 'am', title: '오전', area: '북구', notes: '예약', startTime: '09:00', endTime: '12:00', places: [place('park'), { ...place('cafe'), durationMinutes: 30 }] },
  { id: 'pm', title: '오후', area: '울주군', notes: '', startTime: '13:00', endTime: '17:00', places: [place('cape')] },
  { id: 'night', title: '저녁', area: '', notes: '', startTime: '18:00', endTime: '21:00', places: [] },
] });
test('Moving an outing retains slot IDs and hours and moves every nearby place, fixed flag and note without losing data', () => {
  const before = day(), original = JSON.stringify(before), next = moveDayOuting(before, 'am', 1);
  assert.equal(JSON.stringify(before), original);
  assert.equal(next.blocks[0].id, 'am'); assert.equal(next.blocks[0].title, '오전'); assert.equal(next.blocks[0].startTime, '09:00');
  assert.equal(next.blocks[0].places[0].name, 'cape');
  assert.deepEqual(Array.from(next.blocks[1].places, p => p.name), ['park', 'cafe']);
  assert.equal(next.blocks[1].notes, '예약'); assert.equal(next.blocks[1].places[0].fixed, true);
  assert.ok(next.blocks.slice(0, 2).every(b => b.places.every(p => p.travelMinutes === undefined)));
  assert.equal(next.blocks[2], before.blocks[2]);
});
test('Moving into an empty slot and back preserves all places; boundaries are no-ops', () => {
  const before = day(); assert.equal(moveDayOuting(before, 'am', -1), before); assert.equal(moveDayOuting(before, 'absent', 1), before);
  const moved = moveDayOuting(before, 'pm', 1); assert.equal(moved.blocks[1].places.length, 0); assert.equal(moved.blocks[2].places[0].id, 'cape');
  const back = moveDayOuting(moved, 'night', -1); assert.equal(back.blocks[1].places[0].id, 'cape'); assert.equal(back.blocks[2].places.length, 0);
});
test('Travel legs use the last nearby place and next first place and reserve full slot duration', () => {
  const legs = dayRouteLegs(day()); assert.equal(legs.length, 1); assert.equal(legs[0].from.id, 'cafe'); assert.equal(legs[0].to.id, 'cape'); assert.equal(legs[0].availableMinutes, 60);
  const overrun = day(); overrun.blocks[0].places[0].durationMinutes = 250;
  assert.equal(dayRouteLegs(overrun)[0].availableMinutes, -50);
});
test('Unknown coordinates are not silently replaced with the anchor; invalid and missing points stay unknown', () => {
  const sample = day(); sample.blocks[0].places[1].lat = null;
  assert.equal(dayRouteLegs(sample)[0].origin, null);
  for (const p of [undefined, {lat:null,lng:129}, {lat:NaN,lng:129}, {lat:0,lng:0}]) assert.equal(routePoint(p), null);
});
