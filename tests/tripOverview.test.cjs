const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
function load(path, deps = {}) {
  const box = { exports: {}, require: name => { if (deps[name]) return deps[name]; throw Error(name); } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, box);
  return box.exports;
}
const route = load('src/features/trips/dayRouteModel.ts', { './tripModel': {} });
const { overviewDays, overviewPlaceUrl } = load('src/features/trips/tripOverviewModel.ts', { './dayRouteModel': route });
const place = (id, lat = 35.5) => ({ id, name: id, address: '울산 중구', lat, lng: 129.3, durationMinutes: 60 });
const block = (id, startTime, places) => ({ id, title: id, startTime, endTime: '18:00', places });

test('each day has its own chronological numbering and map points without mutating the trip', () => {
  const input = { days: [
    { id: 'one', blocks: [block('pm', '14:00', [place('museum')]), block('am', '09:00', [place('park'), place('cafe')])] },
    { id: 'two', blocks: [block('morning', '10:00', [place('beach', 35.8)])] },
  ] };
  const before = JSON.stringify(input), days = overviewDays(input);
  assert.deepEqual(Array.from(days[0].stops, s => [s.number, s.place.id]), [[1, 'park'], [2, 'cafe'], [3, 'museum']]);
  assert.deepEqual(Array.from(days[1].points, p => [p.number, p.name, p.lat]), [[1, 'beach', 35.8]]);
  assert.equal(days[0].stops[1].time, '');
  assert.equal(days[0].stops[0].time, '09:00 — 18:00');
  assert.equal(JSON.stringify(input), before);
});

test('invalid or missing coordinates stay in the list without renumbering later map pins', () => {
  const day = overviewDays({ days: [{ id: 'one', blocks: [block('am', '09:00', [place('park'), place('unknown', null), place('cafe'), place('invalid', NaN), place('outside', 0)])] }] })[0];
  assert.equal(day.stops.length, 5);
  assert.deepEqual(Array.from(day.points, p => p.number), [1, 3]);
  assert.equal(day.hasMissingCoordinates, true);
  assert.equal(day.points[1].id, day.stops[2].id);
});

test('empty days have no previous-day markers and repeated places have distinct selection IDs', () => {
  const days = overviewDays({ days: [
    { id: 'one', blocks: [block('am', '09:00', [place('same')]), block('pm', '14:00', [place('same')])] },
    { id: 'empty', blocks: [] },
    { id: 'three', blocks: [block('am', '09:00', [place('same')])] },
  ] });
  assert.equal(days[1].stops.length, 0);
  assert.equal(days[1].points.length, 0);
  assert.equal(days[1].hasMissingCoordinates, false);
  const ids = days.flatMap(day => Array.from(day.stops, stop => stop.id));
  assert.equal(new Set(ids).size, 3);
});

test('external map search uses the actual name and address', () => {
  const url = overviewPlaceUrl({ name: '태화강 국가정원', address: '울산 중구' });
  assert.equal(decodeURIComponent(url.split('/search/')[1]), '태화강 국가정원 울산 중구');
});
