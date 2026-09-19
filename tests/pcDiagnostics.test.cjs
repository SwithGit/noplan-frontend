const test = require('node:test'), assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), ts = require('typescript'), crypto = require('node:crypto');
function load(fetcher) {
  const source = fs.readFileSync('src/api/pcDiagnostics.ts', 'utf8').replace('import.meta.env.VITE_APP_API_URL', "'http://local.test'");
  const box = { exports: {}, crypto, performance, AbortSignal, fetch: fetcher };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, box);
  return box.exports;
}
test('browser operation shares an ID and emits exactly one terminal outcome without awaiting logging', () => {
  const events = [], diagnostics = load((url, init) => { events.push({ url, ...JSON.parse(init.body) }); return new Promise(() => {}); });
  const operation = diagnostics.beginPcOperation('course_generate', { transport: 'walk', limitMeters: 1000 });
  operation.finish('success', { resultCount: 4 }); operation.finish('cancelled');
  assert.equal(events.length, 2); assert.equal(events[0].status, 'started'); assert.equal(events[1].resultCount, 4); assert.equal(events[0].operationId, events[1].operationId); assert.equal(events[0].url, 'http://local.test/api/pc-diagnostics');
});
test('obvious credentials/contact values are redacted before transmission', () => {
  const events = [], diagnostics = load((_, init) => { events.push(JSON.parse(init.body)); return Promise.resolve({}); });
  diagnostics.beginPcOperation('place_search', { keyword: '울산\n카페' }).finish('empty');
  for (const keyword of ['person@example.com', '010-1234-5678', 'https://map.test/?key=SECRET', 'token=SECRET']) diagnostics.beginPcOperation('place_search', { keyword });
  assert.equal(events[0].keyword, '울산 카페'); assert.ok(events.slice(2).every(event => event.keyword === '[redacted]'));
  assert.ok(!JSON.stringify(events).includes('SECRET'));
});
test('logging rejection or unavailable fetch does not fail user actions', async () => {
  for (const fetcher of [() => { throw Error('offline'); }, () => Promise.reject(Error('offline'))]) {
    const diagnostics = load(fetcher); assert.doesNotThrow(() => diagnostics.beginPcOperation('place_search').finish('error'));
  }
  await new Promise(resolve => setImmediate(resolve));
});
test('API failure paths are templated and never include trip/invitation tokens or raw errors', () => {
  const diagnostics = load(() => Promise.resolve({}));
  assert.equal(diagnostics.pcApiEndpoint('/api/trips/SECRET/invite?token=SECRET'), '/api/trips');
  assert.equal(diagnostics.pcApiEndpoint('/api/tourism/123?type=12'), '/api/tourism/:id');
  assert.equal(diagnostics.pcApiEndpoint('/api/auth/login'), undefined);
  assert.equal(diagnostics.pcApiEndpoint('/api/pc-diagnostics'), undefined);
});
