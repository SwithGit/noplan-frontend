const test=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'), vm=require('node:vm'), ts=require('typescript'), crypto=require('node:crypto');
function load(path,deps={}) { const sandbox={exports:{},crypto,require:name=>{if(deps[name])return deps[name];if(name==='../../i18n/locale')return {getLocale:()=> 'ko'}; throw new Error(name);}}; vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,sandbox);return sandbox.exports; }
const model=load('src/features/trips/tripModel.ts');
const {setTourismAnchor,attractionFromPlace}=load('src/features/trips/tourismModel.ts',{'./tripModel':model});
const attraction={contentId:'126207',contentTypeId:'12',name:'경주 첨성대',type:'관광지',address:'경상북도 경주시 첨성로 140-25',lat:35.83433,lng:129.21853,sourceUrl:'https://www.data.go.kr/data/15101578/openapi.do',sourceLabel:'한국관광공사 TourAPI'};
const make=()=>model.createTrip({title:'경주 여행',destination:'경주',startDate:'2026-09-20',endDate:'2026-09-21',transport:'walk',outbound:'train',companion:'친구'}).document;
test('선택한 날짜·구간에 관광지를 첫 고정 일정으로 담고 원본·다른 구간을 보존한다',()=>{
 const doc=make(),day=doc.days[1],block=day.blocks[1];
 const next=setTourismAnchor(doc,day.id,block.id,attraction,90),place=next.days[1].blocks[1].places[0];
 assert.equal(doc.days[1].blocks[1].places.length,0);assert.equal(next.days[0],doc.days[0]);
 assert.equal(place.fixed,true);assert.equal(place.source,'tourism');assert.equal(place.tourism.contentId,'126207');assert.equal(place.lat,attraction.lat);assert.equal(place.priceNeedsCheck,true);
 assert.equal(model.minutes(block.startTime)+model.usedMinutes(next.days[1].blocks[1]),14*60+30);
 assert.equal(attractionFromPlace(place).contentId,attraction.contentId);
});
test('관광지 교체는 한 곳만 바꾸고 소주제 장소와 기존 식별자를 유지한다',()=>{
 let doc=make(),day=doc.days[0],block=day.blocks[0];doc=setTourismAnchor(doc,day.id,block.id,attraction,60);
 const prior=doc.days[0].blocks[0].places[0];const cafe={id:'cafe',name:'카페',durationMinutes:30};doc.days[0].blocks[0].places.push(cafe);
 const next=setTourismAnchor(doc,day.id,block.id,{...attraction,contentId:'126208',name:'대릉원'},60);
 const places=next.days[0].blocks[0].places;assert.equal(places.length,2);assert.equal(places[0].id,prior.id);assert.equal(places[0].name,'대릉원');assert.equal(places[1],cafe);
});
test('시간 초과·중복 관광지·잘못된 위치·사라진 구간은 원본을 유지하고 차단한다',()=>{
 let doc=make(),day=doc.days[0],block=day.blocks[0];
 for(const duration of [0,NaN,90.5,601,185])assert.throws(()=>setTourismAnchor(doc,day.id,block.id,attraction,duration));
 assert.throws(()=>setTourismAnchor(doc,day.id,'missing',attraction,90));assert.throws(()=>setTourismAnchor(doc,day.id,block.id,{...attraction,lat:0},90));
 doc=setTourismAnchor(doc,day.id,block.id,attraction,90);assert.throws(()=>setTourismAnchor(doc,day.id,day.blocks[1].id,attraction,90));
 assert.throws(()=>setTourismAnchor(doc,doc.days[1].id,doc.days[1].blocks[0].id,attraction,90));
 assert.equal(doc.days[0].blocks[0].places.length,1);
});


test('여행코스·쇼핑·음식점의 중심 일정은 분류와 대표 좌표를 유지하고 축제는 차단한다',()=>{
 for(const [type,label] of [['25','여행코스'],['38','쇼핑'],['39','음식점']]){
  const doc=make(),day=doc.days[0],block=day.blocks[0];
  const next=setTourismAnchor(doc,day.id,block.id,{...attraction,contentTypeId:type,type:label},120);
  const saved=next.days[0].blocks[0].places[0], reopened=attractionFromPlace(saved);
  assert.equal(next.days[0].blocks[0].places.length,1);
  assert.equal(reopened.contentTypeId,type);assert.equal(reopened.type,label);assert.equal(reopened.lat,attraction.lat);
  assert.equal(saved.fixed,true);assert.equal(saved.durationMinutes,120);
 }
 const doc=make(),day=doc.days[0],block=day.blocks[0];
 for(const type of ['15','32'])assert.throws(()=>setTourismAnchor(doc,day.id,block.id,{...attraction,contentTypeId:type},90));
});
