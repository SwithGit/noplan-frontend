const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/trips/mergeTrip.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: exportsObject });
const { mergeTripDocuments: merge, sameDocument } = exportsObject;
const { resolveTripMerge: resolve } = exportsObject;
const copy = x => JSON.parse(JSON.stringify(x));
const document = () => ({ title: '울산 여행', transport: 'walk', days: [{ id: 'day', blocks: [{ id: 'am', title: '오전', notes: '', places: [{ id: 'a', name: '간절곶', durationMinutes: 60 }, { id: 'b', name: '카페', durationMinutes: 30 }] }, { id: 'pm', title: '오후', notes: '', places: [] }] }] });
test('다른 구간과 같은 장소의 서로 다른 필드는 양쪽 변경을 모두 보존한다', () => {
  const base = document(), a = copy(base), b = copy(base);
  a.days[0].blocks[0].places[0].durationMinutes = 90;
  b.days[0].blocks[0].places[0].name = '진하해수욕장'; b.days[0].blocks[1].notes = '친구 메모';
  const result = merge(base, a, b);
  assert.equal(result.days[0].blocks[0].places[0].durationMinutes, 90);
  assert.equal(result.days[0].blocks[0].places[0].name, '진하해수욕장');
  assert.equal(result.days[0].blocks[1].notes, '친구 메모');
  assert.equal(base.days[0].blocks[1].notes, '');
});
test('같은 필드의 다른 값·삭제와 편집 충돌은 자동 덮어쓰지 않는다', () => {
  const base = document(), a = copy(base), b = copy(base);
  a.title = '내 제목'; b.title = '친구 제목'; assert.equal(merge(base, a, b), null);
  a.title = base.title; b.title = base.title;
  a.days[0].blocks[0].places = []; b.days[0].blocks[0].places[0].durationMinutes = 120;
  assert.equal(merge(base, a, b), null);
});
test('서로 다른 장소 동시 추가는 각 위치를 지키고 중복 없이 합친다', () => {
  const base = document(), a = copy(base), b = copy(base);
  a.days[0].blocks[0].places.splice(1, 0, { id: 'new-a', name: '내 장소' });
  b.days[0].blocks[0].places.splice(1, 0, { id: 'new-b', name: '친구 장소' });
  const result = merge(base, a, b).days[0].blocks[0].places;
  assert.equal(result[0].id, 'a'); assert.equal(result.at(-1).id, 'b');
  assert.equal(new Set(result.map(p => p.id)).size, 4);
});
test('한쪽 순서 변경과 다른 쪽 메모는 합치고 상충하는 순서는 거부한다', () => {
  const base = document(); base.days[0].blocks[0].places.push({ id: 'c', name: '식사' });
  const a = copy(base), b = copy(base);
  a.days[0].blocks[0].places.reverse(); b.days[0].blocks[0].notes = '예약';
  assert.equal(merge(base, a, b).days[0].blocks[0].places[0].id, 'c');
  b.days[0].blocks[0].places = [b.days[0].blocks[0].places[1], b.days[0].blocks[0].places[0], b.days[0].blocks[0].places[2]];
  assert.equal(merge(base, a, b), null);
});
test('동일한 수정·삭제와 JSON 필드 순서 차이는 충돌로 오인하지 않는다', () => {
  const base = document(), a = copy(base), b = copy(base);
  a.title = b.title = '같은 제목'; a.days[0].blocks[0].places.pop(); b.days[0].blocks[0].places.pop();
  assert.ok(merge(base, a, b));
  assert.ok(sameDocument({ a: 1, b: 2, c: undefined }, { b: 2, a: 1 }));
});
test('충돌 후 추가 편집하고 새로고침해도 원래 기준 버전을 유지해 친구 수정을 덮어쓰지 않는다', () => {
  const base = document(), local = copy(base), latest = copy(base);
  local.title = '내 제목'; latest.title = '친구 제목';
  const draft = { id: 'trip', version: 1, document: local, baseDocument: base };
  const remote = { id: 'trip', version: 2, document: latest };
  assert.equal(merge(base, local, latest), null);
  local.days[0].blocks[0].notes = '충돌 뒤 이어 쓴 메모';
  const restored = copy(exportsObject.draftWithBaseline(draft, remote));
  assert.equal(merge(restored.baseDocument, restored.document, latest), null);
});

test('충돌 항목 선택은 독립적인 메모·장소 수정을 함께 유지한다',()=>{
  const base=document(),local=copy(base),remote=copy(base);
  local.title='내 제목';remote.title='친구 제목';local.days[0].blocks[0].notes='내 메모';remote.days[0].blocks[1].notes='친구 메모';
  const initial=resolve(base,local,remote);assert.equal(initial.conflicts.length,1);
  const result=resolve(base,local,remote,{[initial.conflicts[0].key]:'remote'});
  assert.equal(result.conflicts.length,0);assert.equal(result.document.title,'친구 제목');assert.equal(result.document.days[0].blocks[0].notes,'내 메모');assert.equal(result.document.days[0].blocks[1].notes,'친구 메모');
});
test('삭제·수정 충돌에서 수정 선택 시 장소 복구, 삭제 선택 시 삭제 유지',()=>{
  const base=document(),local=copy(base),remote=copy(base);local.days[0].blocks[0].places.shift();remote.days[0].blocks[0].places[0].name='수정한 장소';
  const conflict=resolve(base,local,remote).conflicts[0];
  const kept=resolve(base,local,remote,{[conflict.key]:'remote'});assert.equal(kept.conflicts.length,0);assert.equal(kept.document.days[0].blocks[0].places.find(p=>p.id==='a').name,'수정한 장소');
  const removed=resolve(base,local,remote,{[conflict.key]:'local'});assert.equal(removed.conflicts.length,0);assert.equal(removed.document.days[0].blocks[0].places.length,1);
});
test('서로 충돌하는 방문 순서를 선택하면서 장소 필드 변경은 유지한다',()=>{
  const base=document();base.days[0].blocks[0].places.push({id:'c',name:'식사'});const local=copy(base),remote=copy(base);
  local.days[0].blocks[0].places.reverse();remote.days[0].blocks[0].places=[remote.days[0].blocks[0].places[1],remote.days[0].blocks[0].places[0],remote.days[0].blocks[0].places[2]];remote.days[0].blocks[0].places[0].name='바뀐 카페';
  const conflict=resolve(base,local,remote).conflicts.find(c=>c.path.at(-1)==='@order');assert.ok(conflict);
  const result=resolve(base,local,remote,{[conflict.key]:'local'});assert.equal(result.conflicts.length,0);assert.equal(result.document.days[0].blocks[0].places.map(p=>p.id).join(','),'c,b,a');assert.equal(result.document.days[0].blocks[0].places[1].name,'바뀐 카페');
});
test('노피가 첫날을 계획하는 중 친구가 바꾼 둘째 날을 유지한다',()=>{
  const base=document();base.days.push({...copy(base.days[0]),id:'day2'});const local=copy(base),remote=copy(base);
  local.days[0].blocks[0].places.push({id:'nopi',name:'노피 추천'});remote.days[1].blocks[0].notes='둘째 날 친구 메모';
  const result=merge(base,local,remote);assert.ok(result);assert.equal(result.days[0].blocks[0].places.at(-1).id,'nopi');assert.equal(result.days[1].blocks[0].notes,'둘째 날 친구 메모');
});
