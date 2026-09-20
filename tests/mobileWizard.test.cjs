const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const sandbox={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/planner/mobileWizardModel.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
const {cycleFoodTag,wizardComplete,wizardTimeRange}=sandbox.exports;
test('음식 태그는 선호→제외→취소, 다른 조건과 다른 선호는 유지',()=>{
 let a={preferredFoodDetails:['양식'],excludedDetails:['고기'],budgetPerPerson:50000};
 a=cycleFoodTag(a,'일식');assert.ok(a.preferredFoodDetails.includes('일식'));assert.equal(a.budgetPerPerson,50000);
 a=cycleFoodTag(a,'일식');assert.ok(a.excludedDetails.includes('일식'));assert.ok(!a.preferredFoodDetails.includes('일식'));
 a=cycleFoodTag(a,'일식');assert.ok(!a.excludedDetails.includes('일식'));assert.ok(a.preferredFoodDetails.includes('양식'));assert.ok(a.excludedDetails.includes('고기'));
});
test('인원 범위만으로 인원 완료로 처리하지 않고 무제한 예산 0원은 완료',()=>{
 const c={location:'성수',time:'지금',companion:'3-4명, 친구',mood:'맛집',duration:'4시간',accuracy:{budgetPerPerson:0}};
 assert.equal(wizardComplete(c)[2],false);assert.equal(wizardComplete(c)[5],true);
 c.accuracy.groupSize=3;assert.equal(wizardComplete(c).every(Boolean),true);
});
test('이용시간은 한국 시간으로 계산하고 자정을 넘으면 다음 날 표시',()=>{
 const now=new Date('2026-09-20T14:00:00Z');
 assert.match(wizardTimeRange('지금','4시간',now).end,/다음 날.*3:00/);
 assert.match(wizardTimeRange('2026-09-20 PM 11 : 00','종료 00:30',now).end,/다음 날.*12:30/);
 assert.match(wizardTimeRange('오늘 저녁','2시간',new Date('2026-09-20T03:00:00Z')).end,/7:00/);
 assert.match(wizardTimeRange('오늘 저녁','2시간',new Date('2026-09-20T09:15:00Z')).end,/8:15/);
 assert.equal(wizardTimeRange('지금','저녁까지',now).end,'최소 활동 후 종료');
});
