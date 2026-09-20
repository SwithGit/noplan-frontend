const ts=require('typescript'),fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const load=(file,deps={})=>{const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:id=>deps[id]});return exports;};
const dictionary=load('src/i18n/messages.ts'),mobile=load('src/i18n/mobileMessages.ts');
const {translate}=load('src/i18n/translate.ts',{'./locale':{getLocale:()=> 'ko'},'./messages':dictionary,'./mobileMessages':mobile});
for(const locale of ['en','ja','zh-CN']) {
  assert.notEqual(translate('새 여행 만들기',locale),'새 여행 만들기');
  assert.notEqual(translate('도보',locale),'도보');
  assert.equal(translate('My own cafe 123',locale),'My own cafe 123');
  const data={name:'친구',transport:'walk'};assert.equal(translate(data,locale),data);
}
assert.equal(translate('도보','ko'),'도보');
assert.equal(translate('친구와 함께','en'),'With Friends');
assert.equal(translate('2박 3일','en'),'3 days / 2 nights');
assert.equal(translate('90분','en'),'90 min');
assert.equal(translate('서울특별시 전체','ja'),'ソウル特別市全域');
console.log('Language dictionary, interpolation and canonical data preservation passed');
