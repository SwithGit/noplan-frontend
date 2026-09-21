const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const box = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/pages/admin/mapPlaceLinks.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, box);
const { kakaoMapUrl, naverMapUrl } = box.exports;
const place = { name: '카페 & 빵 #성수점', roadAddress: '서울 성동구 연무장길 1', address: '서울 성동구 성수동' };
test('only genuine numeric Kakao provider IDs open the Kakao place detail', () => {
  assert.equal(kakaoMapUrl({ ...place, provider: 'kakao_local', providerPlaceId: '123456' }), 'https://place.map.kakao.com/123456');
  for (const data of [{ provider: 'google', providerPlaceId: '123456' }, { provider: 'kakao_local', providerPlaceId: 'manual-123' }, {}]) {
    assert.equal(kakaoMapUrl({ ...place, ...data }), `https://map.kakao.com/link/search/${encodeURIComponent(`${place.name} ${place.roadAddress}`)}`);
  }
});
test('Naver searches the exact branch name with road address, falling back to parcel address', () => {
  assert.equal(naverMapUrl(place), `https://map.naver.com/p/search/${encodeURIComponent(`${place.name} ${place.roadAddress}`)}`);
  assert.equal(decodeURIComponent(naverMapUrl({ ...place, roadAddress: ' ' }).split('/search/')[1]), `${place.name} ${place.address}`);
  assert.equal(naverMapUrl({ name: '가게' }), `https://map.naver.com/p/search/${encodeURIComponent('가게')}`);
});
