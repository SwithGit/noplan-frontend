const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const scope = { exports: {}, URL };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/stampEvent/eventModel.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, scope);
const { scannedStampId } = scope.exports;
test('scanner accepts the five printed QR links and the canonical domain', () => {
  for (let id = 1; id <= 5; id++) {
    assert.equal(scannedStampId(`https://www.noplan.live/event/${id}`), id);
    assert.equal(scannedStampId(`https://noplan.live/event/${id}/`), id);
  }
});
test('scanner cannot navigate to external sites, another event or forged paths', () => {
  for (const url of ['javascript:alert(1)', 'https://evil.test/event/1', 'https://noplan.live.evil.test/event/1', 'https://www.noplan.live/event/0', 'https://www.noplan.live/event/6', 'https://www.noplan.live/event/01', 'http://www.noplan.live/event/1', 'https://user@www.noplan.live/event/1', 'https://www.noplan.live:8080/event/1', '/event/1', 'https://www.noplan.live/event/staff']) assert.equal(scannedStampId(url), null, url);
});
