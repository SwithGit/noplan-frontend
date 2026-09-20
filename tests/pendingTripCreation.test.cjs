const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const compiled = ts.transpileModule(fs.readFileSync('src/features/trips/pendingTripCreation.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
class ApiError extends Error { constructor(status) { super('API error'); this.status = status; } }
function fixture(api = {}) {
  const data = new Map();
  const sessionStorage = { getItem: k => data.get(k) || null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) };
  const load = () => {
    const box = { exports: {}, sessionStorage, require: name => ({ '../../api/client': { ApiError }, '../../api/tripsApi': api, './mergeTrip': { sameDocument: (a, b) => JSON.stringify(a) === JSON.stringify(b) } })[name] };
    vm.runInNewContext(compiled, box); return box.exports;
  };
  return { load, data };
}
const input = () => ({ trip: { id: 'stable-trip-id', version: 0, document: { destination: '서울 노원구', days: [{ id: 'day-1', blocks: [{ id: 'block-1', places: [{ id: 'park', name: '공원' }] }] }] } }, draft: { destination: '서울 노원구', startDate: '2026-09-22', endDate: '2026-09-23', companion: '친구', outbound: 'train', transport: 'car', needs: { pet: { enabled: true } }, attraction: { contentId: '123', name: '공원' }, visitDate: '2026-09-23', visitSlot: 1, visitDuration: 75 }, focusDayId: 'day-1', focusBlockId: 'block-1' });

test('login redirect and reload preserve the trip ID, dates, selected attraction and travel preferences', () => {
  const f = fixture(), store = f.load(), queued = store.queueTripCreation(input());
  assert.deepEqual(JSON.parse(JSON.stringify(f.load().readPendingTripCreation())), JSON.parse(JSON.stringify(queued)));
  store.clearPendingTripCreation(queued.trip.id);
  assert.equal(f.load().readPendingTripCreation(), null);
});
test('unauthenticated creation never calls the save API', async () => {
  let saves = 0; const store = fixture({ saveTrip: async () => { saves++; } }).load();
  await assert.rejects(store.savePendingTripCreation(store.queueTripCreation(input()), ''), /로그인/);
  assert.equal(saves, 0);
});
test('duplicate effects and repeated submits share one save and a stable ID', async () => {
  let saves = 0;
  const store = fixture({ saveTrip: async trip => { saves++; return { ...trip, version: 1 }; } }).load(), pending = store.queueTripCreation(input());
  const a = store.savePendingTripCreation(pending, 'alice'), b = store.savePendingTripCreation(pending, 'alice');
  assert.equal(a, b);
  assert.equal((await a).id, pending.trip.id); assert.equal(saves, 1);
});
test('retry after a lost save response recovers the already-created trip instead of duplicating it', async () => {
  let saves = 0, gets = 0;
  const request = input(), store = fixture({ saveTrip: async trip => { assert.equal(trip.id, request.trip.id); if (++saves === 1) throw Error('network'); throw new ApiError(409); }, getTrip: async id => { gets++; assert.equal(id, request.trip.id); return { ...request.trip, version: 1 }; } }).load();
  const pending = store.queueTripCreation(request);
  await assert.rejects(store.savePendingTripCreation(pending, 'alice'), /network/);
  assert.equal(store.readPendingTripCreation().trip.id, request.trip.id);
  assert.equal((await store.savePendingTripCreation(pending, 'alice')).version, 1);
  assert.equal(saves, 2); assert.equal(gets, 1);
});
test('account binding survives reload and blocks an automatic save into another account', async () => {
  let saves = 0;
  const f = fixture({ saveTrip: async () => { saves++; throw Error('offline'); } }), store = f.load();
  await assert.rejects(store.savePendingTripCreation(store.queueTripCreation(input()), 'alice'));
  const reloaded = f.load();
  await assert.rejects(reloaded.savePendingTripCreation(reloaded.readPendingTripCreation(), 'bob'), /계정/);
  assert.equal(saves, 1);
});
test('conflicting server content is never overwritten or treated as successful creation', async () => {
  const store = fixture({ saveTrip: async () => { throw new ApiError(409); }, getTrip: async () => ({ document: { title: 'changed' } }) }).load();
  await assert.rejects(store.savePendingTripCreation(store.queueTripCreation(input()), 'alice'), { status: 409 });
  assert.ok(store.readPendingTripCreation());
});
test('expired or corrupt pending requests do not restart creation', () => {
  const f = fixture(), store = f.load(); store.queueTripCreation(input());
  const key = [...f.data.keys()][0], expired = JSON.parse(f.data.get(key)); expired.expiresAt = 1;
  f.data.set(key, JSON.stringify(expired)); assert.equal(f.load().readPendingTripCreation(), null);
  f.data.set(key, '{broken'); assert.equal(f.load().readPendingTripCreation(), null);
});
