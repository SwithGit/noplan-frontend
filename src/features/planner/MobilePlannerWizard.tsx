import { useEffect, useRef, useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlanner } from './PlannerContext';
import { accuracyMissing, groupSizeOf } from './accuracyModel';
import { categoryKeyFromLabel, PLANNER_CATEGORIES } from './plannerIntents';
import { cycleFoodTag, foodTags, wizardComplete, wizardSteps, wizardTimeRange } from './mobileWizardModel';
import { normalizeFillPreferences } from '../../utils/fillPreferences';
import { TripDialog } from '../trips/TripDialog';
import { PlaceVisual } from '../../components/ui/PlaceVisual';
import type { PlannerAccuracy, PlannerCondition } from '../../types/noplan';
import { ROUTES } from '../../routes';
import './mobile-wizard.css';

type Mode = 'date' | 'time';
type Props = {
  review?: boolean;
  DateSheet: ComponentType<{initialValue?: string; mode: Mode; onClose:()=>void; onConfirm:(value:string)=>void; onModeChange:(mode:Mode)=>void}>;
  AddressSheet: ComponentType<{value:string; onChange:(value:string)=>void; onClose:()=>void; onConfirm:()=>void}>;
};
const details:Record<string,string[]> = {'카페/디저트':['커피','디저트','베이커리','브런치'],'놀거리':['방탈출','보드게임','볼링','노래방','오락실','공방/체험','스포츠'],'산책/구경':['산책','공원','야경','쇼핑몰','시장/상권'],'술/야간':['포차','펍','와인/칵테일','이자카야']};
const titles=['어디에서 출발할까요?','언제 출발할까요?','누구와 함께하나요?','오늘 뭐 하고 싶나요?','언제까지 즐길까요?','예산을 알려주세요','얼마나 걸을까요?'];
const subtitles=['현재 위치를 확인하거나 동네·역을 선택해 주세요.','일정이 시작되는 시각을 골라주세요.','인원과 동행에 맞는 장소를 찾아요.','하고 싶은 활동을 최대 3개 골라주세요.','출발부터 종료까지, 함께 보며 정해요.','전체 일정에서 쓸 1인 예산이에요.','장소 사이, 한 구간의 이동 기준이에요.'];
const help:Record<string,{title:string;lines:string[]}>={
  food:{title:'음식 취향을 골라주세요',lines:['한 번 누르면 선호, 두 번 누르면 제외, 세 번 누르면 선택이 취소돼요.','선호 음식은 여러 개 선택할 수 있고, 맞는 장소를 우선 추천해요.','해산물을 제외해도 다른 식사·안주 메뉴가 있으면 그 메뉴를 기준으로 추천해요.']},
  budget:{title:'예산은 이렇게 계산해요',lines:['식사·주류·활동비를 포함한 1인 예산이에요.','장소별 예상 최저·최고 금액의 평균으로 일정을 구성해요. 실제 결제 금액은 달라질 수 있어요.','가격 정보가 없는 장소는 예산 미검증으로 안내해요.']},
  fill:{title:'남는 시간 채우기',lines:['선택한 활동을 먼저 담고, 남는 시간과 예산으로 놀거리·카페 등을 추가해요.','술집을 선택하면 2차·3차도 이어질 수 있어요. 밤 8시 이후 카페는 자동으로 추가하지 않아요.']},
  walk:{title:'예산이 부족할 때만 무료 산책',lines:['시간이 남지만 유료 활동을 추가할 예산이 부족할 때 사용해요.','실제로 주변에 있는 산책 장소만 추천해요. 장소가 없으면 억지로 추가하지 않아요.']},
  distance:{title:'한 구간 최대 도보 거리',lines:['출발지에서 첫 장소, 장소에서 다음 장소까지 각 구간에 적용해요.','제한을 선택하면 실제 도보 경로로 확인해요. 전체 코스의 총 도보 거리는 아니에요.','제한 없음은 이동 시간을 비교해서 선택할 수 있어요.']},
};
function selectionsOf(mood:string){return mood.split(/\s*·\s*/).filter(Boolean).map(group=>{const [category,...rest]=group.split(/\s*,\s*/);return {category,detail:rest[0]||''};});}

export function MobilePlannerWizard({review=false,DateSheet,AddressSheet}:Props){
  const {condition,setCondition,detectCurrentLocation,locationStatus,currentPosition,inputNotice,runSearch}=usePlanner();
  const navigate=useNavigate();
  const [step,setStep]=useState(()=>{const missing=wizardComplete(condition).findIndex(x=>!x);return missing<0?(review?6:1):missing;});
  const [notice,setNotice]=useState(inputNotice),[info,setInfo]=useState(''),[dateMode,setDateMode]=useState<Mode|null>(null),[address,setAddress]=useState<string|null>(null),[busy,setBusy]=useState(false);
  const requestedLocation=useRef(false),mounted=useRef(true),heading=useRef<HTMLHeadingElement>(null);
  const value=condition.accuracy||{},fill=normalizeFillPreferences(value),selections=selectionsOf(condition.mood),complete=wizardComplete(condition);
  const range=wizardTimeRange(condition.time,condition.duration);
  const patchAccuracy=(patch:Partial<PlannerAccuracy>)=>setCondition({accuracy:{...value,...patch}});
  const move=(next:number)=>{setNotice('');setStep(next);};
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  useEffect(()=>{window.scrollTo({top:0});heading.current?.focus();},[step]);
  const locate=async()=>{try{const found=await detectCurrentLocation();if(mounted.current){setNotice('');setStep(current=>current===0?1:current);return found;}}catch{if(mounted.current)setNotice('현재 위치를 확인하지 못했어요. 권한을 허용하거나 동네·역을 직접 입력해 주세요.');}};
  useEffect(()=>{
    if(step!==0||requestedLocation.current)return;
    requestedLocation.current=true;
    if(currentPosition?.address===condition.location&&condition.location){setStep(1);return;}
    if(!condition.location&&!inputNotice)void locate();
    // Request GPS only on initial entry, never when returning to edit location.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  const changeActivities=(next:ReturnType<typeof selectionsOf>)=>{
    const category=categoryKeyFromLabel(next[0]?.category);
    setCondition({mood:next.map(s=>s.detail?`${s.category}, ${s.detail}`:s.category).join(' · '),mainCategory:category,supportingCategories:next.slice(1).map(s=>categoryKeyFromLabel(s.category)),...(category!==condition.mainCategory?{coreIntent:'',coreIntentExplicit:false,coreIntentSkipped:true}:{})});
    setNotice('');
  };
  const toggleActivity=(category:string)=>{
    if(selections.some(s=>s.category===category)){changeActivities(selections.filter(s=>s.category!==category));return;}
    if(selections.length===3){setNotice('활동은 최대 3개까지 선택할 수 있어요.');return;}
    changeActivities([...selections,{category,detail:''}]);
  };
  const foodValue:PlannerAccuracy={...value,preferredFoodDetails:value.preferredFoodDetails??selections.filter(s=>s.category==='맛집'&&foodTags.includes(s.detail)).map(s=>s.detail)};
  const toggleFood=(tag:string)=>{
    const accuracy=cycleFoodTag(foodValue,tag);
    // Cuisine likes are preferences, not mutually required cuisine filters.
    setCondition({accuracy,mood:selections.map(s=>s.category==='맛집'?'맛집':s.detail?`${s.category}, ${s.detail}`:s.category).join(' · ')});
  };
  const setPeople=(size:number)=>{
    const relation=['친구','연인','가족','동료'].find(x=>condition.companion.includes(x));
    setCondition({companion:[size===1?'혼자':size===2?'두명':size<=4?'3-4명':'5명 이상',size>1?relation:''].filter(Boolean).join(', '),accuracy:{...value,groupSize:size}});
  };
  const advance=async()=>{
    if(busy||!complete[step])return;
    if(step<6){move(step+1);return;}
    const missing=complete.findIndex(x=>!x);
    if(missing>=0){move(missing);return;}
    const error=accuracyMissing(condition);if(error){setNotice(error);return;}
    setBusy(true);
    const next:PlannerCondition={...condition,accuracy:{...value,...normalizeFillPreferences(value),preferredFoodDetails:foodValue.preferredFoodDetails},rawText:[condition.location,condition.time,condition.companion,condition.mood,condition.duration].join(' ')};
    setCondition(next);
    const result=runSearch(next);navigate(ROUTES.plannerSearching);
    if(await result)navigate(ROUTES.plannerResult,{replace:true});
  };
  const infoButton=(key:string)=><button type="button" className="mw-info" aria-label={`${help[key].title} 설명`} onClick={()=>setInfo(key)}>ⓘ</button>;
  const toggle=(label:string,key:'fillSchedule'|'allowBudgetWalk',enabled:boolean)=><div className="mw-toggle"><span>{label}{infoButton(key==='fillSchedule'?'fill':'walk')}</span><div>{[true,false].map(on=><button type="button" key={String(on)} aria-pressed={enabled===on} onClick={()=>patchAccuracy({[key]:on})}>{on?'✓ 허용':'안 함'}</button>)}</div></div>;
  return <main className="mobile-planner-wizard">
    <header className="mw-header"><button type="button" aria-label="뒤로 가기" onClick={()=>step===0?navigate(ROUTES.appHome):move(step-1)}>‹</button><strong>여행 조건</strong><span>{step+1} / 7</span></header>
    <nav className="mw-progress" aria-label="조건 입력 단계">{wizardSteps.map((label,index)=><button type="button" key={label} aria-label={`${index+1}. ${label}${complete[index]?' · 입력 완료':''}`} aria-current={step===index?'step':undefined} className={index<=step?'filled':''} onClick={()=>move(index)}/>)}</nav>
    <section className="mw-title"><span>STEP {String(step+1).padStart(2,'0')} · {wizardSteps[step]}</span><h1 ref={heading} tabIndex={-1}>{titles[step]}</h1><p>{subtitles[step]}</p></section>
    {step===0&&<section className="mw-card"><h2>출발 위치</h2><button className="mw-location" type="button" disabled={locationStatus==='locating'} onClick={()=>void locate()}><span>⌖</span><strong>{locationStatus==='locating'?'현재 위치 확인 중…':'현재 위치로 시작'}</strong><b>›</b></button>{condition.location&&<p className="mw-location-result">✓ {condition.locationLabel||condition.location}</p>}<button className="mw-secondary" type="button" disabled={locationStatus==='locating'} onClick={()=>setAddress(condition.location)}>동네·역 직접 입력</button><p className="mw-hint">현재 위치가 확인되면 출발 시각으로 넘어가요.</p></section>}
    {step===1&&<section className="mw-card"><h2>출발 시각</h2><div className="mw-options">{['지금','오늘 저녁','오늘 밤'].map(time=><button type="button" key={time} aria-pressed={condition.time===time} onClick={()=>setCondition({time})}>{time}</button>)}</div><button className="mw-secondary" type="button" onClick={()=>setDateMode('date')}>{condition.time&&!['지금','오늘 저녁','오늘 밤'].includes(condition.time)?condition.time:'날짜·시간 직접 선택'} <span>›</span></button></section>}
    {step===2&&<section className="mw-card"><h2>인원 · 동행</h2><label className="mw-label">몇 명이 함께하나요?</label><div className="mw-options">{[['혼자',1],['두명',2],['3–4명',3],['5명 이상',5]].map(([label,size])=><button type="button" key={label} aria-pressed={size===1?groupSizeOf(condition)===1:size===2?groupSizeOf(condition)===2:size===3?Number(groupSizeOf(condition))>=3&&Number(groupSizeOf(condition))<=4:Number(groupSizeOf(condition))>=5} onClick={()=>setPeople(Number(size))}>{label}</button>)}</div><div className="mw-stepper"><button type="button" aria-label="인원 줄이기" disabled={!groupSizeOf(condition)||Number(groupSizeOf(condition))<=1} onClick={()=>setPeople(Number(groupSizeOf(condition))-1)}>−</button><strong>{groupSizeOf(condition)?`${groupSizeOf(condition)}명`:'인원 선택'}</strong><button type="button" aria-label="인원 늘리기" disabled={Number(groupSizeOf(condition))>=30} onClick={()=>setPeople((groupSizeOf(condition)||0)+1)}>＋</button></div>{groupSizeOf(condition)!==1&&<><label className="mw-label">누구와 가나요? <small>선택사항</small></label><div className="mw-options">{['친구','연인','가족','동료'].map(relation=><button type="button" key={relation} aria-pressed={condition.companion.includes(relation)} onClick={()=>setCondition({companion:[condition.companion.match(/혼자|두명|3-4명|5명 이상/)?.[0]||'',condition.companion.includes(relation)?'':relation].filter(Boolean).join(', '),accuracy:value})}>{relation}</button>)}</div></>}</section>}
    {step===3&&<><section className="mw-card"><h2>하고 싶은 것 <small>{selections.length} / 3</small></h2><div className="mw-activities">{PLANNER_CATEGORIES.map(cat=><button type="button" key={cat.key} aria-pressed={selections.some(s=>s.category===cat.label)} onClick={()=>toggleActivity(cat.label)}><PlaceVisual type={cat.key==='walk'?'hotplace':cat.key} alt=""/><strong>{cat.label}</strong></button>)}</div></section>{selections.map(selection=><section className="mw-card" key={selection.category}><h2>{selection.category==='맛집'?'어떤 음식이 좋을까요?':selection.category==='술/야간'?'어떤 술을 얼마나 마실까요?':`${selection.category} 세부 선택`}{selection.category==='맛집'&&infoButton('food')}</h2>{selection.category==='맛집'?<><p className="mw-hint">한 번 선호 · 두 번 제외 · 세 번 취소</p><div className="mw-options">{foodTags.map(tag=>{const excluded=foodValue.excludedDetails?.includes(tag),preferred=foodValue.preferredFoodDetails?.includes(tag);return <button type="button" key={tag} className={excluded?'excluded':''} aria-label={`${tag}: ${excluded?'제외':preferred?'선호':'미선택'}`} aria-pressed={Boolean(excluded||preferred)} onClick={()=>toggleFood(tag)}>{excluded?'× ':preferred?'✓ ':''}{tag}</button>;})}</div><p className="mw-hint">선호는 여러 개 선택할 수 있어요. 조건에 맞는 장소 중 우선 추천해요.</p></>:<><div className="mw-options">{[...(details[selection.category]||[]),'아무거나'].map(detail=><button type="button" key={detail} aria-pressed={detail==='아무거나'?!selection.detail:selection.detail===detail} onClick={()=>changeActivities(selections.map(s=>s.category===selection.category?{...s,detail:s.detail===detail||detail==='아무거나'?'':detail}:s))}>{detail}</button>)}</div>{selection.category==='술/야간'&&<><label className="mw-label">원하는 술</label><div className="mw-options">{[['any','상관없음'],['soju','소주'],['beer','맥주'],['wine','와인'],['cocktail','칵테일·하이볼']].map(([key,label])=><button type="button" key={key} aria-pressed={(value.alcoholPreference||'any')===key} onClick={()=>patchAccuracy({alcoholPreference:key as PlannerAccuracy['alcoholPreference']})}>{label}</button>)}</div><label className="mw-label" htmlFor="mw-drinks">1인 주류 주문량</label><select id="mw-drinks" value={value.drinkServings??2} onChange={e=>patchAccuracy({drinkServings:Number(e.target.value)})}><option value="0">안 마심 · 안주만</option>{[1,2,3].map(n=><option key={n} value={n}>{n}주문 단위 (잔/병)</option>)}</select></>}</>}</section>)}</>}
    {step===4&&<section className="mw-card"><h2>이용시간</h2><div className="mw-time-range"><button type="button" onClick={()=>move(1)}><small>출발</small><strong>{range.start}</strong></button><span>→</span><div><small>종료</small><strong>{range.end}</strong></div></div><div className="mw-options">{['2시간','4시간','저녁까지','밤까지'].map(duration=><button type="button" key={duration} aria-pressed={condition.duration===duration} onClick={()=>setCondition({duration})}>{duration}</button>)}</div><label className="mw-label" htmlFor="mw-end">종료 시각 직접 선택</label><input id="mw-end" type="time" value={condition.duration.startsWith('종료 ')?condition.duration.slice(3):''} onChange={e=>setCondition({duration:e.target.value?`종료 ${e.target.value}`:''})}/><p className="mw-hint">{condition.duration==='저녁까지'?'20:30이 목표예요. 늦게 출발하면 선택한 활동의 최소 체류시간에 맞춰 종료 시각이 조정돼요.':'출발보다 이른 종료 시각은 다음 날로 계산해요.'}</p></section>}
    {step===5&&<section className="mw-card"><h2>예산{infoButton('budget')}</h2><label className="mw-label" htmlFor="mw-budget">전체 일정의 1인 예산 <small>필수</small></label><select id="mw-budget" value={value.budgetPerPerson==null?'예산 미선택':value.budgetPerPerson??''} onChange={e=>patchAccuracy({budgetPerPerson:e.target.value===''?undefined:Number(e.target.value)})}><option value="">예산 선택</option>{[20000,30000,50000,70000,100000,150000,0].map(n=><option key={n} value={n}>{n?`${n/10000}만 원 이하`:'금액 제한 없음'}</option>)}</select><p className="mw-hint">{groupSizeOf(condition)?`${groupSizeOf(condition)}명`:'인원 미선택'} · 식사, 주류, 활동비를 포함해요.</p><div className="mw-divider"/>{toggle('남는 시간 채우기','fillSchedule',fill.fillSchedule)}{fill.fillSchedule&&toggle('예산 부족 시 무료 산책','allowBudgetWalk',fill.allowBudgetWalk)}</section>}
    {step===6&&<><section className="mw-card"><h2>이동{infoButton('distance')}</h2>{condition.transportMode==='car'?<p>자동차 이동 기준이에요. 반경 10km 안에서 이동 시간을 확인해요. 유류비·통행료·주차비는 예산에 포함하지 않아요.</p>:<><label className="mw-label" htmlFor="mw-distance">한 구간 최대 도보 거리</label><select id="mw-distance" value={value.maxWalkingDistanceMeters??''} onChange={e=>patchAccuracy({maxWalkingDistanceMeters:e.target.value?Number(e.target.value):undefined})}><option value="">제한 없음</option>{[500,800,1000,1500].map(n=><option key={n} value={n}>{n<1000?`${n}m`:`${n/1000}km`} 이내</option>)}</select><label className="mw-label">코스 취향 <small>선택사항</small></label><div className="mw-options">{['도보 짧게','대기 적게','사진 예쁜 곳','조용한 곳'].map(extra=><button type="button" key={extra} aria-pressed={condition.extras.includes(extra)} onClick={()=>setCondition({extras:condition.extras.includes(extra)?condition.extras.filter(x=>x!==extra):[...condition.extras,extra]})}>{extra}</button>)}</div></>}</section><section className="mw-card mw-summary"><h2>이렇게 찾아볼게요</h2><p>{condition.locationLabel||condition.location} · {condition.companion}</p><p>{condition.mood}</p><p>{range.start} → {range.end}</p><strong>{value.budgetPerPerson==null?'예산 미선택':value.budgetPerPerson?`1인 ${value.budgetPerPerson.toLocaleString()}원`:'예산 제한 없음'}</strong>{Boolean(foodValue.preferredFoodDetails?.length)&&<p>선호 · {foodValue.preferredFoodDetails?.join(', ')}</p>}{Boolean(value.excludedDetails?.length)&&<p className="mw-exclusions">제외 · {value.excludedDetails?.join(', ')}</p>}<p className="mw-hint">위 단계 표시를 눌러 조건을 수정할 수 있어요.</p></section></>}
    {notice&&<p className="mw-notice" role="status">{notice}</p>}
    <footer className="mw-footer"><button type="button" disabled={busy||!complete[step]} onClick={()=>void advance()}>{busy?'코스를 찾고 있어요…':step===6?'이 조건으로 코스 찾기':'다음'} <span>→</span></button></footer>
    {dateMode&&<DateSheet initialValue={condition.time} mode={dateMode} onModeChange={setDateMode} onClose={()=>setDateMode(null)} onConfirm={time=>{setCondition({time});setDateMode(null);}}/>}
    {address!==null&&<AddressSheet value={address} onChange={setAddress} onClose={()=>setAddress(null)} onConfirm={()=>{if(address.trim()){setCondition({location:address.trim(),locationLabel:address.trim()});setAddress(null);setNotice('');}}}/>}
    {info&&<TripDialog title={help[info].title} className="mw-help" onClose={()=>setInfo('')}><div className="mw-help-lines">{help[info].lines.map((line,i)=><p key={line}><span>{i+1}</span>{line}</p>)}</div><button className="mw-help-confirm" type="button" onClick={()=>setInfo('')}>확인</button></TripDialog>}
  </main>;
}
