const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const sandbox={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/planner/textLocation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
const {resolveTextLocation,inferNamedTextLocation}=sandbox.exports;
test('상대 위치 표현은 과거 모델이 문자열로 반환해도 현재 위치 요청으로 해석한다',()=>{
  for(const text of ['근처','내 주변','여기','이 근방','현재 위치']){
    assert.equal(resolveTextLocation(text+'에서 친구랑',text).mode,'current');
    assert.equal(inferNamedTextLocation(text+'에서 친구랑'),'');
  }
});
test('실제 역명과 추가 주소 확인이 필요한 집·회사를 구분한다',()=>{
  assert.equal(resolveTextLocation('강남역 근처에서 카페','강남역','named').location,'강남역');
  assert.equal(resolveTextLocation('우리 집 근처 맛집',null,'context').location,'');
  assert.equal(resolveTextLocation('회사 앞 카페',null).mode,'context');
  assert.equal(resolveTextLocation('회사 근처 카페','회사 근처').mode,'context');
});
test('현재 위치를 명시한 모델의 의도는 문장 속 제외 지명보다 우선한다',()=>{
  const r=resolveTextLocation('홍대 말고 여기 근처','홍대','current');
  assert.equal(r.mode,'current');assert.equal(r.location,'');
  assert.equal(resolveTextLocation('친구랑 카페',null,'unspecified').mode,'unspecified');
});
