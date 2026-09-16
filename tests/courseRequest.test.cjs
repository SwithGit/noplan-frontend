const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function fixture(chunks,contentType='application/x-ndjson'){
  class ApiError extends Error{constructor(message,status,data){super(message);this.status=status;this.data=data;}}
  const source=ts.transpileModule(fs.readFileSync(require.resolve('../src/api/courseRequest.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  const sandbox={exports:{},TextDecoder,JSON,Error,fetch:async()=>({ok:true,headers:{get:()=>contentType},json:async()=>({success:true}),body:new ReadableStream({start(controller){for(const chunk of chunks)controller.enqueue(chunk);controller.close();}})}),require:()=>({API_BASE_URL:'http://fixture',ApiError})};
  vm.runInNewContext(source,sandbox);return sandbox.exports.requestCourse;
}
test('진행 표시와 최종 결과를 UTF-8 및 줄 경계와 무관하게 읽는다',async()=>{
  const bytes=new TextEncoder().encode(JSON.stringify({type:'progress',stage:'location-resolved',checked:1})+'\n'+JSON.stringify({type:'result',status:200,body:{success:true,title:'한식 코스'}})+'\n');
  const chunks=Array.from(bytes,b=>new Uint8Array([b])),progress=[];
  const result=await fixture(chunks)('{}',new AbortController().signal,p=>progress.push(p));
  assert.equal(result.title,'한식 코스');assert.equal(progress[0].stage,'location-resolved');
});
test('스트림의 실패 응답은 성공 결과로 오인하지 않는다',async()=>{
  const bytes=new TextEncoder().encode(JSON.stringify({type:'result',status:404,body:{message:'영업 확인 실패'}})+'\n');
  await assert.rejects(()=>fixture([bytes])('{}',new AbortController().signal,()=>{}),e=>e.status===404&&e.message==='영업 확인 실패');
});
test('중간 연결 종료는 완료로 가장하지 않고 JSON 서버도 호환한다',async()=>{
  await assert.rejects(()=>fixture([])('{}',new AbortController().signal,()=>{}),/중간에/);
  assert.equal((await fixture([],'application/json')('{}',new AbortController().signal,()=>{})).success,true);
});
