import '../src/styles/index.css';
// Isolated mobile UI checks: all API calls are fixtures; no production writes.
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AppFrame } from '../src/components/ui/AppFrame';
import { PlannerProvider } from '../src/features/planner/PlannerContext';
import { FavoritesProvider } from '../src/features/mobile/FavoritesProvider';
import { MobileTripView } from '../src/features/mobile/MobileTripView';
import { createTrip } from '../src/features/trips/tripModel';
import { MobileMy } from '../src/features/mobile/MobileMy';
import { MobileHome } from '../src/features/mobile/MobileHome';
import { MobileExplore } from '../src/features/mobile/MobileExplore';
import { MobileFavorites } from '../src/features/mobile/MobileFavorites';
import { EventsPage } from '../src/features/events/EventsPage';
import { EventDetail } from '../src/features/events/EventDetail';
import coast from '../src/assets/travel/coastal-escape.webp';
import '../src/styles/app-layout.css';
import '../src/features/mobile/mobile.css';
const query=new URLSearchParams(location.search),user=query.has('member')?{userId:'preview',userNick:'미리보기',profileURL:''}:null;
const event={id:'seoul:preview',provider:'seoul',providerId:'preview',title:'[미리보기] 가을의 작은 전시',kind:'exhibition',startDate:'2026-09-01',endDate:'2026-10-30',address:'서울 성동구 성수동',region:'서울',district:'성동구',venue:'미리보기 전시장',lat:37.54,lng:127.05,imageUrl:coast,imageLicense:'미리보기용',sourceUrl:'https://example.com',description:'화면 확인용 행사입니다.',hours:'10:00—18:00',price:'무료',isFree:true,age:'전체',phone:'',status:'scheduled',sourceLabel:'미리보기 데이터'};
let favorites:any[]=JSON.parse(sessionStorage.getItem('mobile-preview-favorites')||'[]');
const course=(id:number,type:string)=>({id,title:type==='cafe'?'[미리보기] 성수 카페 산책':'[미리보기] 동네 맛집 한 끼',location:'성수동',courseData:[{id:String(id),name:type==='cafe'?'미리보기 카페':'미리보기 식당',type,category:type==='cafe'?'카페':'맛집',address:'서울 성동구 성수동',imageUrl:coast,durationMinutes:90}]});
window.fetch=async(input,init)=>{
 const url=new URL(String(input),location.origin);let data:any={};
 if(url.pathname.endsWith('/favorites')){
  if(init?.method==='PUT'){const favorite={...JSON.parse(String(init.body)),id:'saved-event',savedAt:new Date().toISOString()};favorites=[favorite];sessionStorage.setItem('mobile-preview-favorites',JSON.stringify(favorites));data={favorite};}else data={favorites};
 }else if(url.pathname.includes('/favorites/')&&init?.method==='DELETE'){favorites=[];sessionStorage.removeItem('mobile-preview-favorites');}
 else if(url.pathname.includes('explore-courses'))data={success:true,courses:url.searchParams.has('dong')?[course(1,'cafe')]:[course(1,'cafe'),course(2,'food')]};
 else if(url.pathname==='/api/events/weekly')data={events:query.has('weeklyEmpty')?[]:[event,{...event,id:'seoul:preview-2',title:'[미리보기] 주말 가을 축제',kind:'festival',region:'부산'},{...event,id:'seoul:preview-3',title:'[미리보기] 가을 저녁 음악회',kind:'performance',region:'제주'}],from:'2026-09-20',to:'2026-09-20',sources:[]};
 else if(url.pathname==='/api/events')data={events:[event,{...event,id:'seoul:preview-2',title:'[미리보기] 주말 가을 축제',kind:'festival'}],total:2,page:1,pageSize:20,sources:[]};
 else if(url.pathname.startsWith('/api/events/'))data={event};
 else if(url.pathname.includes('/tourism/'))data={overview:'한국관광공사 상세 화면 미리보기',course:{duration:'3시간',stops:[{name:'미리보기 장소',description:'실제 관광 데이터는 운영 API에서 확인합니다.'}]}};
 else if(url.pathname.startsWith('/api/trips/')){const trip=createTrip({title:'[미리보기] 함께 만든 여행',destination:'서울',startDate:'2026-09-20',endDate:'2026-09-20',companion:'친구',transport:'walk',needs:[]});trip.id='preview';trip.version=1;trip.collaboration={enabled:true,role:'editor',memberCount:2};data={trip};}
 else if(url.pathname.includes('nearby'))data={places:[]};
 return new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
};
createRoot(document.getElementById('root')!).render(<MemoryRouter initialEntries={[query.get('path')||'/app']}><PlannerProvider><FavoritesProvider user={user}><AppFrame><Routes><Route path='/app' element={<MobileHome user={user} active/>}/><Route path='/app/mypage' element={<MobileMy user={user} active onLogout={()=>{}}/>}/><Route path='/app/explore' element={<MobileExplore active/>}/><Route path='/app/favorites' element={<MobileFavorites/>}/><Route path='/app/events' element={<EventsPage/>}/><Route path='/app/events/:id' element={<EventDetail user={user}/>}/><Route path='/app/trips/:id' element={<MobileTripView user={user}/>}/><Route path='*' element={<p>미리보기 연결 확인</p>}/></Routes></AppFrame></FavoritesProvider></PlannerProvider></MemoryRouter>);
