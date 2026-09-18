const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),crypto=require('node:crypto');
const sandbox={exports:{},crypto};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/trips/tripModel.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
const m=sandbox.exports;
const make=()=>m.createTrip({title:'울산',destination:'울산',startDate:'2026-09-19',endDate:'2026-09-19',outbound:'car',transport:'car',companion:'친구'}).document;
const cafe={name:'주변 카페',type:'cafe',durationMinutes:70,scheduledStart:'2026-09-19T01:50:00.000Z',scheduledEnd:'2026-09-19T03:00:00.000Z'};
test('75분 여유에 이동 5분+카페 70분을 중복 여유 없이 담고 다음 출발 시간을 보존한다',()=>{
  const doc=make(),day=doc.days[0],block=day.blocks[0];block.places=[{id:'anchor',name:'관광지',durationMinutes:105}];
  const places=m.recommendationPlaces([cafe],day,block);
  assert.equal(places[0].travelMinutes,5);block.places.push(...places);
  assert.equal(m.usedMinutes(block),180);assert.equal(m.minutes(block.startTime)+m.usedMinutes(block),720);
});
test('시간 누락·겹침·다음 구간 침범·중복 추천은 일부만 담지 않고 거절한다',()=>{
  const doc=make(),day=doc.days[0],block=day.blocks[0];block.places=[{id:'anchor',name:'관광지',durationMinutes:105}];
  for(const patch of [{scheduledStart:undefined},{scheduledStart:'2026-09-19T01:40:00Z'},{scheduledEnd:'2026-09-19T03:01:00Z'},{name:'관광지'}])assert.throws(()=>m.recommendationPlaces([{...cafe,...patch}],day,block));
  assert.equal(block.places.length,1);
});
test('앞 장소·순서·이동수단 변경 시 저장된 이동시간을 초기화하고 메모 편집은 보존한다',()=>{
  const doc=make(),block=doc.days[0].blocks[0];block.places=[{id:'anchor',name:'관광지',durationMinutes:105},{id:'cafe',name:'카페',durationMinutes:70,travelMinutes:5}];
  const unchanged=structuredClone(doc);unchanged.days[0].blocks[0].notes='메모';
  assert.equal(m.resetChangedTravel(doc,unchanged).days[0].blocks[0].places[1].travelMinutes,5);
  for(const edit of [d=>{d.transport='walk';},d=>{d.days[0].blocks[0].places[0].durationMinutes=90;},d=>d.days[0].blocks[0].places.reverse()]){
    const next=structuredClone(doc);edit(next);assert.equal(m.resetChangedTravel(doc,next).days[0].blocks[0].places.find(p=>p.id==='cafe').travelMinutes,undefined);
  }
});
