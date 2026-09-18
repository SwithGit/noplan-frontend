import {useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import '../src/styles/index.css';
import '../src/features/mobile/mobile.css';
import {PlannerProvider,usePlanner} from '../src/features/planner/PlannerContext';
import {FavoritesProvider} from '../src/features/mobile/FavoritesProvider';
import {ResultScreen} from '../src/features/planner/PlannerScreens';
import {normalizeCoursePlace} from '../src/utils/coursePlan';
import type {CoursePlan} from '../src/types/noplan';

// This standalone development entry never calls the backend or route providers.
window.fetch=async()=>new Response(JSON.stringify({success:true,events:[]}),{headers:{'Content-Type':'application/json'}});
const names=[['오후의 식탁','동네 작은 공원','달빛 한잔'],['골목 파스타','초록 산책길','저녁의 주점'],['온기 한상','강변 쉼터','오늘의 술집']];
const options:NonNullable<CoursePlan['courseOptions']>=names.map((stops,index)=>({
  id:`sample-${index}`,courseData:stops.map((name,i)=>({...normalizeCoursePlace({
    name,type:['food','hotplace','drink'][i],durationMinutes:[75,45,120][i],
    scheduledStart:['2026-09-17T11:04:00Z','2026-09-17T12:23:00Z','2026-09-17T13:18:00Z'][i],
    catalogRating:4.6-index*.1,catalogReviewCount:158-index*25,businessStatus:i===0?'unknown':'open',
    moveText:`약 ${[9,4,6][i]}분 도보 이동`,autoAdded:i===1,walkingRouteSource:'tmap_pedestrian',
    color:['#e8e1fa','#e5f4e9','#fce9e0'][i]
  },i)!,estimatedCost:{status:'estimated' as const,min:i===1?0:10000+index*1000,max:i===1?0:13700+index*1000,
    basis:'샘플 가격',menuExamples:i===1?[]:['대표 메뉴 · 샘플'],assumptions:i===1?[]:['미리보기용 가격이에요.']}})),
  summary:{requiredCount:2,fulfilledCount:2,costKnown:true,estimatedMin:20000+index*2000,estimatedMax:27400+index*2000,budgetPerPerson:50000,endAt:'2026-09-17T15:18:00Z',warnings:['이 화면의 장소·가격·영업정보는 디자인 확인을 위한 샘플이에요.']},
  ranking:{score:200-index,walkingMinutes:19-index*2,basis:'선호 · 이동 시간 · 예산'}
}));
const plan:CoursePlan={title:'오늘 저녁, 우리 동네 코스',location:'샘플 출발지',durationText:'3곳 · 오전 12:18까지',courseData:options[0].courseData,backupPlaces:[],source:'api',courseOptions:options,selectedOptionId:options[0].id,accuracySummary:options[0].summary};
function Preview(){
  const {loadPlan,setCondition}=usePlanner();const ready=useRef(false);const [notice,setNotice]=useState('');
  useEffect(()=>{if(!ready.current){ready.current=true;loadPlan(plan);setCondition({location:'샘플 출발지',time:'오늘 저녁',companion:'두명, 연인',mood:'맛집 · 술집'});}},[loadPlan,setCondition]);
  return <main style={{maxWidth:1100,margin:'auto',padding:'18px 16px',background:'#f8f7fc'}} onClickCapture={event=>{
    if((event.target as HTMLElement).closest('.result-actions,.m-favorite-control,.stop-open,.screen-back')){event.preventDefault();event.stopPropagation();setNotice('디자인 미리보기예요. 코스 선택과 펼쳐보기를 이용해 주세요.');}
  }}>
    <p style={{color:'#8b71ad',fontSize:11,margin:'0 0 8px'}}>DESIGN PREVIEW · 장소와 금액은 샘플이에요</p>
    {notice&&<p role="status" style={{position:'fixed',top:8,left:12,right:12,zIndex:99,padding:12,borderRadius:12,background:'#eee6ff',fontSize:12}} onClick={()=>setNotice('')}>{notice} ×</p>}
    <ResultScreen/>
  </main>;
}
createRoot(document.getElementById('root')!).render(<MemoryRouter><FavoritesProvider user={null}><PlannerProvider><Preview/></PlannerProvider></FavoritesProvider></MemoryRouter>);
