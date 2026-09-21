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

test('district selection restricts markers, search and bulk removal to actual addresses', () => {
  const rows = [
    { ...place(1), primaryType: 'food', address: '서울특별시 성동구 연무장길 1', regionKey: 'seoul_gwangjin' },
    { ...place(2), primaryType: 'cafe', roadAddress: '서울 성동구 성수이로 1' },
    { ...place(3), address: '서울 광진구 성동구빌딩' },
    { ...place(4), address: '서울 성동구', roadAddress: '서울특별시 광진구 자양로 1' },
    { ...place(5), regionKey: 'seoul_seongdong' },
  ];
  const types = ['food', 'cafe', 'hotplace'];
  assert.equal(filterAdminMapPlaces(rows, types, '', '성동구').map(row => row.id).join(), '1,2');
  const input = buildMapRemovalInput(rows, types, '음수대', '성동구');
  assert.equal(input.placeIds.join(), '1,2');
  assert.equal(input.district, '성동구');
  assert.equal(filterAdminMapPlaces(rows, ['cafe'], '음수대', '성동구').map(row => row.id).join(), '2');
  assert.equal(filterAdminMapPlaces(rows, types, '', 'all').length, 5);
  assert.equal(filterAdminMapPlaces(rows, types, '', '중구').length, 0);
  assert.throws(() => buildMapRemovalInput(rows, types, '음수대', '중구'), /검색 결과/);
});

test('district menu includes all 25 unique Seoul districts', () => {
  assert.equal(new Set(box.exports.MAP_DISTRICTS.map(item => item.name)).size, 25);
});

test('approval and removal use the exact same full marker selection', () => {
  const rows = Array.from({ length: 65 }, (_, i) => ({ ...place(i + 1), address: '서울 성동구' }));
  const approval = box.exports.buildMapReviewInput(rows, ['hotplace'], '음수대', '성동구');
  assert.equal(approval.placeIds.length, 65);
  assert.equal(approval.placeIds.join(), buildMapRemovalInput(rows, ['hotplace'], '음수대', '성동구').placeIds.join());
});
