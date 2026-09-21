const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
let request;
const box={exports:{},require:name=>{
  if(name==='./client') return {apiJson:async(path,init)=>{request={path,body:JSON.parse(init.body),signal:init.signal};return response();}};
  throw Error(name);
}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/courseOrderApi.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,box);
const {moveStop,mergeReorderedPlan,reorderPlan}=box.exports;
const plain=v=>JSON.parse(JSON.stringify(v));
const stops=[1,2,3].map(id=>({id:String(id),catalogPlaceId:id,name:`장소${id}`,summary:'오후 1:00 시작 · 예상 20분 · 설명',durationMinutes:20,tags:['시작','한식'],imageUrl:`photo${id}`,estimatedCost:{status:'estimated',min:10000,max:15000}}));
const summary={endAt:'2026-09-21T06:00:00.000Z',warnings:['가격은 예상치예요.'],estimatedMin:30000,estimatedMax:45000};
const plan={id:99,searchCourseId:55,source:'api',courseData:stops,backupPlaces:[stops[0]],location:'성수',
  routeOrigin:{lat:37.55,lng:127.04},requestedWindow:{startAt:'2026-09-21T04:00:00.000Z',endAt:'2026-09-21T06:00:00.000Z'},
  accuracySummary:summary,selectedOptionId:'first',courseOptions:[{id:'first',courseData:stops,summary,ranking:{score:9,walkingMinutes:10}},{id:'second',courseData:stops,summary,ranking:{score:8}}],
  planningContext:{condition:{location:'성수',transportMode:'walk',accuracy:{maxWalkingDistanceMeters:1000}},currentPosition:{lat:37,lng:127,address:'다른 위치'}}};
function response(){return {success:true,updates:[2,3,1].map(id=>({key:`catalog:${id}`,moveText:'약 5분 도보 이동',scheduledStart:`new-${id}`,businessStatus:'unknown'})),
  origin:plan.routeOrigin,endAt:'2026-09-21T06:15:00.000Z',walkingMinutes:15,warnings:['방문 전 영업시간 확인']};}

test('drag moves a stop to its target without replacing, dropping or mutating any place',()=>{
  const moved=moveStop(stops,0,2);assert.deepEqual(plain(moved.map(p=>p.id)),['2','3','1']);assert.equal(stops[0].id,'1');
  assert.equal(moveStop(stops,-1,2),stops);assert.equal(moveStop(stops,0,4),stops);
});
test('merge updates selected comparison option, schedule and save identity while preserving venues, photos and costs',()=>{
  const next=mergeReorderedPlan(plan,moveStop(stops,0,2),response());
  assert.deepEqual(plain(next.courseData.map(p=>p.id)),['2','3','1']);
  assert.equal(next.courseOptions[0].courseData,next.courseData);assert.equal(next.courseOptions[1],plan.courseOptions[1]);
  assert.equal(next.courseOptions[0].ranking.walkingMinutes,15);assert.equal(next.accuracySummary.endAt,response().endAt);
  assert.equal(next.id,undefined);assert.equal(next.searchCourseId,null);assert.equal(next.backupPlaces.length,0);
  assert.equal(next.courseData[0].estimatedCost,stops[1].estimatedCost);assert.equal(next.courseData[0].imageUrl,'photo2');
  assert.equal(next.courseData[0].summary,'설명');assert.equal(next.courseData[0].businessStatus,'unknown');
  assert.equal(plan.id,99);assert.equal(plan.courseData[0].id,'1');
});
test('partial or differently ordered server results do not overwrite the original course',()=>{
  assert.throws(()=>mergeReorderedPlan(plan,stops,response()),/변경된 순서/);
  assert.throws(()=>mergeReorderedPlan(plan,stops,{...response(),updates:[]}),/변경된 순서/);
});
test('reorder sends original start, correct origin, walking limit and just the existing ordered stops to dedicated API',async()=>{
  const signal={};await reorderPlan(plan,0,2,signal);
  assert.equal(request.path,'/api/course/generate/reorder-course');assert.equal(request.signal,signal);
  assert.deepEqual(request.body.origin,plan.routeOrigin);assert.equal(request.body.startAt,plan.requestedWindow.startAt);
  assert.equal(request.body.maxWalkingDistanceMeters,1000);assert.deepEqual(request.body.stops.map(p=>p.catalogPlaceId),[2,3,1]);
  assert.ok(!request.body.purposes);assert.ok(!request.body.startTime);
});
