const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync('src/api/adminPlacesApi.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function api(fetch) {
  const box = { exports: {}, URLSearchParams, fetch, require: () => ({ API_BASE_URL: 'https://local-test.invalid' }) };
  vm.runInNewContext(source, box);
  return box.exports;
}
test('loads every page with the same district and categories, deduplicating IDs', async () => {
  const calls = [];
  const client = api(async url => {
    const params = new URL(url).searchParams;
    calls.push(params);
    return { ok: true, json: async () => calls.length === 1
      ? { success: true, places: [{ id: 1 }, { id: 2 }], nextCursor: 2 }
      : { success: true, places: [{ id: 2 }, { id: 3 }], nextCursor: null } };
  });
  const result = await client.listAdminMapPlaces('test', 'test', ['food', 'cafe'], '성동구');
  assert.equal(result.places.map(place => place.id).join(), '1,2,3');
  assert.equal(calls.length, 2);
  assert.equal(calls[1].get('afterId'), '2');
  assert.ok(calls.every(params => params.get('district') === '성동구' && params.get('types') === 'food,cafe'));
});
test('a failed later page never returns a partially loaded map', async () => {
  let calls = 0;
  const client = api(async () => ({ ok: ++calls === 1, json: async () => calls === 1
    ? { places: [{ id: 1 }], nextCursor: 1 } : { message: '조회 실패' } }));
  await assert.rejects(client.listAdminMapPlaces('test', 'test'), /조회 실패/);
});

test('approval submits confirmed IDs, search and district to the authenticated approval endpoint', async () => {
  const input = { placeIds: [1, 2], query: '카페', types: ['cafe'], district: '성동구' };
  const client = api(async (url, init) => {
    assert.equal(new URL(url).pathname, '/api/admin/places/map/approve');
    assert.equal(init.method, 'POST');
    assert.equal(init.headers['x-admin-key'], 'test-key');
    assert.deepEqual(JSON.parse(init.body), input);
    return { ok: true, json: async () => ({ success: true, approvedIds: [1, 2], approvedCount: 2 }) };
  });
  assert.equal((await client.approveAdminMapPlaces('test-key', 'tester', input)).approvedCount, 2);
});
