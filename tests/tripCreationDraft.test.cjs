const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const compiled = ts.transpileModule(fs.readFileSync('src/features/trips/tripCreationDraft.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const fixture = () => {
  const data = new Map(), local = new Map();
  const sessionStorage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
  const load = () => { const box = { exports: {}, sessionStorage, localStorage: { getItem: key => local.get(key) ?? null }, require: () => ({ tomorrow: () => '2026-09-20' }) }; vm.runInNewContext(compiled, box); return box.exports; };
  return { data, local, sessionStorage, load };
};
test('home to creation retains every input, survives reload and isolates accounts', () => {
  const f = fixture(), store = f.load();
  const input = { ...store.readTripCreation('alice'), destination: '울산 중구', startDate: '2026-09-22', endDate: '2026-09-24', companion: '가족', outbound: 'train', transport: 'car', visitDate: '2026-09-23', visitSlot: 1, visitDuration: 60, attraction: { contentId: '123', contentTypeId: '12', name: '태화강 국가정원', lat: 35.55, lng: 129.3 } };
  store.writeTripCreation(input, 'alice');
  assert.equal(store.readTripCreation('alice'), input);
  assert.deepEqual(JSON.parse(JSON.stringify(f.load().readTripCreation('alice'))), JSON.parse(JSON.stringify(input)));
  assert.equal(store.readTripCreation('bob').destination, '서울');
  assert.equal(store.readTripCreation().destination, '서울');
  store.clearTripCreation('alice');
  assert.equal(f.load().readTripCreation('alice').attraction, undefined);
  assert.equal(store.readTripCreation('alice').destination, '서울');
});
test('unavailable session storage still preserves navigation; corrupt data uses defaults', () => {
  const f = fixture(), store = f.load();
  f.sessionStorage.setItem = () => { throw Error('blocked'); };
  store.writeTripCreation({ ...store.readTripCreation(), destination: '경주' });
  assert.equal(store.readTripCreation().destination, '경주');
  f.data.set('noplan.trip.creation.v1:alice', '{broken');
  assert.equal(store.readTripCreation('alice').destination, '서울');
  f.local.set('noplan.trip.transport:bob', 'car');
  assert.equal(store.readTripCreation('bob').transport, 'car');
});
