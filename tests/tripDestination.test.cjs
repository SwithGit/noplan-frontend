const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const box = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/trips/tripDestination.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, box);
const { resolveDestination, destinationDistricts, formatDestination } = box.exports;
const regions = [
  { id: 'seoul', name: '서울특별시', districts: ['중구', '강남구'] },
  { id: 'ulsan', name: '울산광역시', districts: ['중구', '울주군'] },
  { id: 'gwangju', name: '광주광역시', districts: ['북구'] },
  { id: 'gyeonggi', name: '경기도', districts: ['광주시', '수원시 장안구', '수원시 영통구'] },
  { id: 'gyeongbuk', name: '경상북도', districts: ['경주시'] },
  { id: 'sejong', name: '세종특별자치시', districts: ['세종특별자치시'] },
  { id: 'busan', name: '부산광역시', districts: ['해운대구', '해운대구광역시'] },
];
test('restores legacy city names without losing district scope', () => {
  for (const [input, expected] of [['서울', '서울특별시'], ['울산 중구', '울산광역시 중구'], ['경주', '경상북도 경주시'], ['경기 수원', '경기도 수원시'], ['경기도수원시장안구', '경기도 수원시 장안구']]) {
    const result = resolveDestination(input, regions);
    assert.ok(result, input);
    assert.equal(formatDestination(result.region, result.district), expected);
  }
});
test('does not silently broaden unknown districts or guess ambiguous city names', () => {
  for (const value of ['중구', '광주', '광주시', '울산 해운대구', '서울 없는구', '']) assert.equal(resolveDestination(value, regions), null, value);
  assert.equal(resolveDestination('경기도 광주시', regions).region.id, 'gyeonggi');
  assert.equal(resolveDestination('광주광역시', regions).region.id, 'gwangju');
});
test('all province and district selections round trip into the same search scope', () => {
  for (const region of regions) for (const district of ['', ...destinationDistricts(region)]) {
    const result = resolveDestination(formatDestination(region, district), regions);
    assert.equal(result.region.id, region.id);
    assert.equal(result.district, district);
  }
  assert.ok(destinationDistricts(regions[3]).includes('수원시'));
  assert.equal(destinationDistricts(regions[5]).length, 0);
  assert.equal(destinationDistricts(regions[6]).join(','), '해운대구');
});
