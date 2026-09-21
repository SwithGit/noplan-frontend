const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function api(){const calls=[];const sandbox={exports:{},URLSearchParams,require:()=>({apiJson:async url=>{calls.push(url);return {success:true,courses:[]};}})};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/exploreApi.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,sandbox);return {fetch:sandbox.exports.fetchExploreCourses,calls};}
test('nearby course request sends coordinates even when its region is a road address or district',async()=>{
 const {fetch,calls}=api();await fetch('likes','성동구 연무장길',{lat:37.54,lng:127.05});
 const p=new URL(calls[0],'https://example.test').searchParams;assert.equal(p.get('lat'),'37.54');assert.equal(p.get('lng'),'127.05');assert.equal(p.has('dong'),false);assert.equal(p.has('area'),false);
});
test('manual area uses geocoding input; all courses request has no accidental nearby filter',async()=>{
 const {fetch,calls}=api();await fetch('latest','성수');await fetch('likes');
 assert.equal(new URL(calls[0],'https://example.test').searchParams.get('area'),'성수');
 assert.equal(calls[1],'/api/course/explore/explore-courses?sort=likes');
});
