const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const box = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/pages/admin/mapPlaceSelection.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, box);
const { filterAdminMapPlaces, buildMapRemovalInput } = box.exports;
const place = id => ({ id, name: `공원 ${id} 음수대`, primaryType: 'hotplace', latitude: 37.55, longitude: 127.04 });

test('bulk targets exactly all map markers, not the sidebar preview', () => {
  const rows = [...Array.from({ length: 81 }, (_, i) => place(i + 1)), { ...place(90), primaryType: 'drink' }, { ...place(91), name: '일반 공원' }];
  const visible = filterAdminMapPlaces(rows, ['hotplace'], '음수대');
  const input = buildMapRemovalInput(rows, ['hotplace'], ' 음수대 ');
  assert.equal(visible.slice(0, 30).length, 30);
  assert.equal(input.placeIds.length, 81);
  assert.equal(input.placeIds.join(), visible.map(row => row.id).join());
  assert.equal(input.query, '음수대');
  assert.ok(!input.placeIds.includes(90));
  assert.ok(!input.placeIds.includes(91));
});

test('empty search cannot turn into a full-catalog removal', () => {
  assert.throws(() => buildMapRemovalInput([place(1)], ['hotplace'], '  '), /먼저 검색/);
  assert.throws(() => buildMapRemovalInput([place(1)], [], '음수대'), /검색 결과/);
});

test('address, category and case-insensitive literal matches use the same selection', () => {
  const rows = [{ ...place(1), name: '첫번째', roadAddress: 'SEOUL %_ 길' }, { ...place(2), name: '두번째', detailType: 'SEOUL %_' }, { ...place(3), name: '다른곳' }];
  assert.equal(buildMapRemovalInput(rows, ['hotplace'], 'seoul %_').placeIds.join(), '1,2');
});
