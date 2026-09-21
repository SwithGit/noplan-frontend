const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function fixture(disabled=false) {
  let frame,cleared=false;const moves=[];
  const scroller={scrollTop:0};
  const box={exports:{},document:{scrollingElement:scroller},window:{innerHeight:844},
    getComputedStyle:()=>({overflowY:'visible'}),requestAnimationFrame:fn=>{frame=fn;return 1;},cancelAnimationFrame:()=>{cleared=true;},
    require:()=>({useRef:current=>({current}),useState:initial=>[initial,()=>{}],useEffect:()=>{}})};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/planner/useStopDrag.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,box);
  const hook=box.exports.useStopDrag(3,disabled,(from,to)=>moves.push([from,to]));
  hook.listRef.current={parentElement:null,getBoundingClientRect:()=>({left:10,right:380}),
    querySelectorAll:()=>[0,1,2].map(i=>({dataset:{stopIndex:String(i)},getBoundingClientRect:()=>({top:i*240,bottom:(i+1)*240})}))};
  let captured=false;
  const target={focus(){},setPointerCapture(){captured=true;},hasPointerCapture:()=>captured,releasePointerCapture(){captured=false;}};
  const event=(patch={})=>({pointerId:1,pointerType:'touch',isPrimary:true,button:0,clientX:30,clientY:50,currentTarget:target,preventDefault(){},...patch});
  return {hook,moves,event,scroller,frame:()=>frame(),cleared:()=>cleared,captured:()=>captured};
}
test('touch dragging captures the finger, moves only on release, and keeps the release target',()=>{
  const f=fixture(),h=f.hook.handleProps(0,'첫 장소');
  h.onPointerDown(f.event());assert.equal(f.captured(),true);
  h.onPointerMove(f.event({clientY:300}));assert.equal(f.moves.length,0);
  h.onPointerUp(f.event({clientY:550}));assert.deepEqual(f.moves,[[0,2]]);
  assert.equal(f.captured(),false);assert.equal(f.cleared(),true);
});
test('cancel, drop outside the list, second touches, and disabled handles do not reorder',()=>{
  const f=fixture(),h=f.hook.handleProps(0,'첫 장소');
  h.onPointerDown(f.event());h.onPointerMove(f.event({clientY:300}));h.onPointerCancel();h.onPointerUp(f.event({clientY:300}));
  h.onPointerDown(f.event());h.onPointerUp(f.event({clientX:500,clientY:300}));
  h.onPointerDown(f.event({isPrimary:false}));h.onPointerUp(f.event({clientY:300}));
  assert.deepEqual(f.moves,[]);
  const d=fixture(true),dh=d.hook.handleProps(0,'첫 장소');dh.onPointerDown(d.event());dh.onPointerUp(d.event({clientY:300}));assert.deepEqual(d.moves,[]);
});
test('edge dragging scrolls, and arrow keys support moving without a pointer',()=>{
  const f=fixture(),h=f.hook.handleProps(1,'둘째 장소');
  h.onPointerDown(f.event({clientY:790}));f.frame();assert.equal(f.scroller.scrollTop,0);
  h.onPointerMove(f.event({clientY:810}));f.frame();assert.ok(f.scroller.scrollTop>0);h.onPointerCancel();
  h.onKeyDown({key:'ArrowUp',preventDefault(){}});assert.deepEqual(f.moves,[[1,0]]);
});
test('touching a handle near the viewport edge does not scroll or reorder before dragging',()=>{
  const f=fixture(),h=f.hook.handleProps(0,'첫 장소');
  assert.equal(h.style.touchAction,'none');
  h.onPointerDown(f.event({clientY:20}));f.frame();assert.equal(f.scroller.scrollTop,0);
  h.onPointerUp(f.event({clientY:20}));assert.deepEqual(f.moves,[]);
});
