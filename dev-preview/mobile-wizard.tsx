// Isolated visual test harness. No production requests or real GPS access.
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PlannerProvider } from '../src/features/planner/PlannerContext';
import { ChatStart } from '../src/features/planner/PlannerScreens';
import '../src/styles/index.css';
import '../src/styles/app-layout.css';
sessionStorage.removeItem('noplan:planner-draft:v1');
const gps=new URLSearchParams(location.search).has('gps');
Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(ok:PositionCallback,fail:PositionErrorCallback){setTimeout(()=>gps?ok({coords:{latitude:37.54,longitude:127.05}} as GeolocationPosition):fail({code:1,message:'테스트: 위치 거절'} as GeolocationPositionError),100);}}});
let submitted='';
window.fetch=async(_input,init)=>{
  if(String(_input).includes('generate-course'))submitted=String(init?.body||'');
  return new Response(JSON.stringify({success:false,message:'테스트 요청 확인 완료. 실제 추천 API는 호출하지 않았어요.'}),{status:200,headers:{'Content-Type':'application/json'}});
};
function RequestPreview(){return <main style={{padding:20}}><h1>요청 확인</h1><p>실제 서버 호출 없음</p><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{submitted?JSON.stringify(JSON.parse(submitted),null,2):'요청 대기'}</pre></main>;}
createRoot(document.getElementById('root')!).render(<MemoryRouter initialEntries={['/app/planner/chat']}><PlannerProvider><Routes><Route path="/app/planner/chat" element={<ChatStart/>}/><Route path="/app/planner/searching" element={<RequestPreview/>}/><Route path="/app" element={<p>홈으로 돌아왔어요.</p>}/></Routes></PlannerProvider></MemoryRouter>);
