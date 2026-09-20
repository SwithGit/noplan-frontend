const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const copy=x=>JSON.parse(JSON.stringify(x));
function load(file,deps={}){const box={exports:{},require:name=>{if(!(name in deps))throw Error(name);return deps[name];},...deps.globals};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,box);return box.exports;}
const merge=load('src/features/trips/mergeTrip.ts');
class ApiError extends Error{constructor(message,status){super(message);this.status=status;}}
const original=()=>({id:'trip',version:1,collaboration:{enabled:true,role:'editor',memberCount:3},document:{title:'서울 여행',days:[{id:'day3',blocks:[{id:'pm',title:'오후',area:'서울',startTime:'13:00',endTime:'17:00',notes:'',places:[]},{id:'evening',title:'저녁',startTime:'18:00',endTime:'21:00',places:[]}]}]}});
const anchor=(id,name)=>({id,name,address:name,durationMinutes:75,tourism:{contentId:id}});
function server(){let stored=original(),failure=null;return{get stored(){return copy(stored);},set failure(value){failure=value;},api:{getTrip:async()=>copy(stored),pollTrip:async(_id,version)=>({trip:version===stored.version?null:copy(stored),collaboration:stored.collaboration}),saveTrip:async trip=>{if(failure)throw failure;if(trip.version!==stored.version)throw new ApiError('stale',409);const issue=merge.tripMergeIssue(trip.document);if(issue)throw new ApiError(issue,400);stored={...copy(trip),version:stored.version+1};return copy(stored);}}};}
// Deterministic hook runner: actual useTripSync effects/API calls, controlled timers.
// No browser or production account is used.
function client(srv,seed=srv.stored){let cursor=0,dirty=true,result,paused=false;const slots=[],effects=[],timers=new Map();let timerId=0;
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
 const react={useState(initial){const i=cursor++;if(!slots[i])slots[i]={value:typeof initial==='function'?initial():initial};return[slots[i].value,value=>{slots[i].value=typeof value==='function'?value(slots[i].value):value;dirty=true;}];},useRef(value){const i=cursor++;return slots[i]??(slots[i]={current:value});},useCallback(fn,deps){const i=cursor++;if(!same(slots[i]?.deps,deps))slots[i]={deps,value:fn};return slots[i].value;},useEffect(fn,deps){const i=cursor++;if(!same(slots[i]?.deps,deps)){const old=slots[i];slots[i]={deps};effects.push(()=>{old?.cleanup?.();slots[i].cleanup=fn();});}}};
 const win={setInterval(fn,ms){const id=++timerId;timers.set(id,{fn,ms,repeat:true});return id;},clearInterval(id){timers.delete(id);},setTimeout(fn,ms){const id=++timerId;timers.set(id,{fn,ms});return id;},clearTimeout(id){timers.delete(id);},addEventListener(){},removeEventListener(){},confirm:()=>true};
 const hook=load('src/features/trips/useTripSync.ts',{'react':react,'../../api/client':{ApiError},'../../api/tripsApi':srv.api,'./mergeTrip':merge,'./tripModel':{resetChangedTravel:(_before,next)=>next},globals:{window:win,document:{visibilityState:'visible'}}}).useTripSync;
 const clear=()=>{};
 async function flush(){for(let i=0;i<25;i++){if(dirty){dirty=false;cursor=0;result=hook('trip','user',seed,paused,clear);while(effects.length)effects.shift()();}await Promise.resolve();}}
 return{get state(){return result;},flush,async tick(ms){for(const[id,t]of[...timers])if(t.ms===ms){if(!t.repeat)timers.delete(id);t.fn();}await flush();},async edit(fn){const next=copy(result.trip);fn(next.document);result.setTrip(next);await flush();},async pause(value){paused=value;dirty=true;await flush();},close(){for(const slot of slots)slot?.cleanup?.();}};
}
test('세 참여자: 충돌 선택을 서버에 저장한 뒤 세 화면이 같은 장소로 수렴한다',async t=>{
 const srv=server(),a=client(srv),b=client(srv),c=client(srv);t.after(()=>[a,b,c].forEach(x=>x.close()));await Promise.all([a.flush(),b.flush(),c.flush()]);
 await a.edit(doc=>{doc.days[0].blocks[0].area='더현대';doc.days[0].blocks[0].places=[anchor('1','더현대')];});
 await b.edit(doc=>{doc.days[0].blocks[0].area='삼청각';doc.days[0].blocks[0].places=[anchor('2','삼청각')];});
 await a.tick(800);await b.tick(3000);await c.tick(3000);assert.equal(b.state.conflict,true);assert.equal(c.state.trip.document.days[0].blocks[0].places[0].name,'더현대');
 const initial=merge.resolveTripMerge(b.state.trip.baseDocument,b.state.trip.document,b.state.remote.document);
 const resolved=merge.resolveTripMerge(b.state.trip.baseDocument,b.state.trip.document,b.state.remote.document,Object.fromEntries(initial.conflicts.map(x=>[x.key,'remote'])));
 await b.state.resolveConflict(resolved.document,b.state.remote.version);await b.flush();await a.tick(3000);await c.tick(3000);
 for(const participant of[a,b,c]){assert.equal(participant.state.conflict,false);assert.equal(participant.state.dirty,false);assert.deepEqual(copy(participant.state.trip.document),srv.stored.document);assert.equal(participant.state.trip.document.days[0].blocks[0].places.length,1);}
});
test('충돌 선택 도중 세 번째 사람이 저장하면 선택 결과를 덮어쓰지 않고 최신 버전을 다시 받는다',async t=>{
 const srv=server(),a=client(srv),b=client(srv);t.after(()=>[a,b].forEach(x=>x.close()));await a.flush();await b.flush();
 await a.edit(doc=>{doc.title='서버 제목';});await b.edit(doc=>{doc.title='내 제목';});await a.tick(800);await b.tick(3000);assert.equal(b.state.conflict,true);
 const version=b.state.remote.version,selection=copy(b.state.remote.document);await srv.api.saveTrip({...srv.stored,document:{...srv.stored.document,title:'세 번째 친구 제목'}});
 await assert.rejects(()=>b.state.resolveConflict(selection,version),/다시 수정/);await b.flush();assert.equal(b.state.conflict,true);assert.equal(b.state.remote.document.title,'세 번째 친구 제목');assert.equal(b.state.trip.document.title,'내 제목');assert.equal(srv.stored.document.title,'세 번째 친구 제목');
});
test('저장 실패 시 충돌을 해제하지 않고 원래 작업본을 보존한다',async t=>{
 const srv=server(),a=client(srv),b=client(srv);t.after(()=>[a,b].forEach(x=>x.close()));await a.flush();await b.flush();await a.edit(doc=>{doc.title='서버';});await b.edit(doc=>{doc.title='작업본';});await a.tick(800);await b.tick(3000);
 srv.failure=new ApiError('저장 실패',503);await assert.rejects(()=>b.state.resolveConflict(b.state.remote.document,b.state.remote.version),/저장 실패/);await b.flush();assert.equal(b.state.conflict,true);assert.equal(b.state.saving,false);assert.equal(b.state.trip.document.title,'작업본');
});
test('이전 버그로 두 중심 장소가 들어간 작업본은 재접속 시 복구 충돌로 전환한다',async t=>{
 const srv=server(),seed=srv.stored;seed.document.days[0].blocks[0].places=[anchor('1','더현대'),anchor('2','삼청각')];const a=client(srv,seed);t.after(()=>a.close());await a.flush();assert.equal(a.state.conflict,true);assert.ok(a.state.trip.baseDocument);assert.equal(srv.stored.document.days[0].blocks[0].places.length,0);
});
