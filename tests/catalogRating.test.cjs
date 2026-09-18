const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const sandbox={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/coursePlan.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
const normalize=sandbox.exports.normalizeCoursePlace;
test('저장 코스를 다시 열어도 DB 평점과 Google 조회 평점이 섞이지 않는다',()=>{
  const place=normalize({name:'식당',rating:3.7,reviewCount:36,catalogRating:4.5,catalogReviewCount:250},0);
  assert.equal(place.rating,3.7);assert.equal(place.catalogRating,4.5);assert.equal(place.catalogReviewCount,250);
});
test('DB 평점이 없으면 Google 값을 카카오·저장 평점으로 재표시하거나 0점으로 만들지 않는다',()=>{
  for(const catalogRating of [undefined,null]){
    const place=normalize({name:'식당',rating:3.7,reviewCount:36,catalogRating,catalogReviewCount:null},0);
    assert.equal(place.catalogRating,undefined);assert.equal(place.catalogReviewCount,undefined);
  }
});
test('저장 코스를 다시 열어도 실시간 검색 출처와 가격 미확인 상태를 보존한다',()=>{
  const place=normalize({id:'kakao:101',name:'주변 식당',candidateSource:'live',provider:'kakao_local',providerPlaceId:'101',estimatedCost:{status:'unknown',min:null,max:null,basis:'계산 가능한 메뉴 가격 부족'}},0);
  assert.equal(place.id,'kakao:101');assert.equal(place.candidateSource,'live');
  assert.equal(place.providerPlaceId,'101');assert.equal(place.estimatedCost.status,'unknown');assert.equal(place.catalogPlaceId,undefined);
});
