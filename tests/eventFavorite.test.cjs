const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
function load(path, deps = {}) {
  const scope = { exports: {}, require: name => { if (!(name in deps)) throw Error(name); return deps[name]; } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, scope);
  return scope.exports;
}
const model = load('src/features/events/eventModel.ts');
const { eventFavorite, favoriteEventId } = load('src/features/events/eventFavorite.ts', { './eventModel': model });
const { normalizeCoursePlace } = load('src/utils/coursePlan.ts');
const event = { id: 'tourapi-123', title: '가을 축제', kind: 'festival', startDate: '2026-09-20', endDate: '2026-10-01', address: '서울 성동구', venue: '축제 광장', sourceLabel: '한국관광공사', imageLicense: '공공누리 1유형', imageUrl: '', sourceUrl: '', lat: null, lng: null };

test('행사는 장소 찜으로 저장되고 JSON 재조회·장소 정규화 후에도 행사 상세 ID와 기간이 유지된다', () => {
  const saved = JSON.parse(JSON.stringify(eventFavorite(event)));
  saved.places = saved.places.map(normalizeCoursePlace);
  assert.equal(saved.kind, 'place');
  assert.equal(saved.places.length, 1);
  assert.equal(favoriteEventId(saved), event.id);
  assert.equal(saved.places[0].summary, '2026.09.20 — 2026.10.01');
  assert.match(saved.places[0].description, /한국관광공사.*공공누리/);
  assert.equal(saved.places[0].lat, undefined);
});

test('일반 장소·코스는 행사 상세로 잘못 연결하지 않는다', () => {
  const saved = eventFavorite(event);
  assert.equal(favoriteEventId({ ...saved, kind: 'course' }), undefined);
  assert.equal(favoriteEventId({ ...saved, places: [{ ...saved.places[0], type: 'food' }] }), undefined);
});
