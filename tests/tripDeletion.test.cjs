const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const values = new Map();
const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
const box = { exports: {}, localStorage: storage };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/trips/tripModel.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, box);
const { readDrafts, writeDraft, removeDraft, draftKey } = box.exports;
const trip = id => ({ id, version: 0, document: { title: id, days: [{ date: '2026-09-20', blocks: [] }] } });
test('delete a draft persistently without removing other trips, accounts or guest drafts', () => {
  values.clear();
  writeDraft(trip('one'), 'alice'); writeDraft(trip('two'), 'alice'); writeDraft(trip('one'), 'bob'); writeDraft(trip('one'));
  removeDraft('one', 'alice');
  assert.equal(readDrafts('alice').map(t => t.id).join(), 'two');
  assert.equal(JSON.parse(values.get(draftKey('alice'))).length, 1);
  assert.equal(readDrafts('bob').length, 1); assert.equal(readDrafts().length, 1);
  removeDraft('missing', 'alice'); assert.equal(readDrafts('alice').length, 1);
  removeDraft('one'); assert.equal(readDrafts().length, 0); assert.equal(readDrafts('bob').length, 1);
});
test('failed browser write reports failure and preserves drafts', () => {
  const before = values.get(draftKey('alice')), setItem = storage.setItem;
  storage.setItem = () => { throw new Error('storage blocked'); };
  assert.throws(() => removeDraft('two', 'alice'), /storage blocked/);
  storage.setItem = setItem; assert.equal(values.get(draftKey('alice')), before);
});
