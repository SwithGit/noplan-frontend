const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file){const sandbox={exports:{},Date};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,sandbox);return sandbox.exports;}
const {extractDongFromText,normalizeDongInput}=load('src/utils/location.ts');
const {createLocationResolver}=load('src/features/planner/locationCache.ts');
test('법정동의 숫자·가와 행정동을 인식하고 도로명에서 임의의 동을 만들지 않는다',()=>{
  assert.equal(extractDongFromText('성동구 연무장길','서울 성동구 성수동2가 300'),'성수동2가');
  assert.equal(normalizeDongInput('성수동1가'),'성수동1가');
  assert.equal(normalizeDongInput('성수1가제2동'),'성수1가제2동');
  assert.equal(normalizeDongInput('성수동'),'성수동');
  assert.equal(normalizeDongInput('서울 성동구 연무장길'),'');
  assert.equal(normalizeDongInput('역삼동맛집'),'');
});
test('화면 간 현재 위치 요청을 합치고 10분 뒤에는 다시 확인한다',async()=>{
  let now=1000,calls=0,finish;
  const resolve=createLocationResolver(()=>{calls++;return new Promise(done=>{finish=()=>done({address:'서울 성동구 연무장길',label:'성수동2가',lat:37.54,lng:127.05,capturedAt:now});});},null,()=>now);
  const home=resolve(),explore=resolve();assert.equal(calls,1);finish();
  assert.equal((await home).label,'성수동2가');await explore;
  await resolve();assert.equal(calls,1);
  now+=600001;const next=resolve();assert.equal(calls,2);finish();await next;
});
test('위치 조회 실패 후 사용자가 다시 시도할 수 있고 저장된 최근 위치는 재사용한다',async()=>{
  let calls=0;
  const locate=async()=>{calls++;if(calls===1)throw Error('denied');return {address:'a',label:'성수동2가',lat:37.54,lng:127.05,capturedAt:100};};
  const resolve=createLocationResolver(locate,null,()=>100);
  await assert.rejects(resolve(),/denied/);assert.equal((await resolve()).label,'성수동2가');
  const restored=createLocationResolver(locate,{address:'a',label:'성수동2가',lat:37.54,lng:127.05,capturedAt:100},()=>200);
  await restored();assert.equal(calls,2);
});
