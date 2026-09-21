const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');

test('course API keeps the selected locale across regional pages, explicit requests and detail reloads', async () => {
  let locale = 'ja';
  const requests = [];
  const sandbox = { exports: {}, URLSearchParams, AbortSignal, require: name => {
    if (name === '../i18n/locale') return { getLocale: () => locale };
    if (name === './client') return { apiJson: async (url, options) => { requests.push({ url: new URL(url, 'https://example.com'), options }); return {}; } };
    throw Error(name);
  } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/tourismApi.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, sandbox);
  const api = sandbox.exports, controller = new AbortController();
  for (const language of ['ja', 'en', 'zh-CN']) {
    locale = language;
    await api.getTourismCourses('gangwon', '', 2, controller.signal);
    const list = requests.at(-1).url;
    assert.equal(list.searchParams.get('locale'), language);
    assert.equal(list.searchParams.get('region'), 'gangwon');
    assert.equal(list.searchParams.get('page'), '2');
    await api.getTourismDetail('2022929', '25', controller.signal);
    assert.equal(requests.at(-1).url.searchParams.get('locale'), language);
    assert.equal(requests.at(-1).url.pathname, '/api/tourism/2022929');
  }
  await api.getTourismCourses('seoul', '', 1, controller.signal, 'ja');
  assert.equal(requests.at(-1).url.searchParams.get('locale'), 'ja');
  await api.getTourismDetail('2022929', '25', controller.signal, 'en');
  assert.equal(requests.at(-1).url.searchParams.get('locale'), 'en');
  controller.abort();
  assert.ok(requests.every(request => request.options.signal.aborted));
});
