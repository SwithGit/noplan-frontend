import type { PlannerAccuracy, PlannerCondition } from '../../types/noplan';
export const foodTags = ['한식', '중식', '양식', '일식', '고기', '분식', '해산물'];
export const wizardSteps = ['위치', '출발 시각', '누구랑', '하고 싶은 것', '이용시간', '예산', '이동 거리'];
export function cycleFoodTag(value: PlannerAccuracy, tag: string): PlannerAccuracy {
  const preferred = value.preferredFoodDetails || [], excluded = value.excludedDetails || [];
  if (excluded.includes(tag)) return {...value, excludedDetails: excluded.filter(x => x !== tag), preferredFoodDetails: preferred.filter(x => x !== tag)};
  if (preferred.includes(tag)) return {...value, preferredFoodDetails: preferred.filter(x => x !== tag), excludedDetails: [...excluded, tag]};
  return {...value, preferredFoodDetails: [...preferred, tag]};
}
export function wizardComplete(c: PlannerCondition) {
  const size=c.accuracy?.groupSize ?? (/혼자/.test(c.companion)?1:/두명/.test(c.companion)?2:undefined);
  return [Boolean(c.location), Boolean(c.time), Boolean(size && Number.isInteger(size) && size>=1 && size<=30), Boolean(c.mood), Boolean(c.duration), c.accuracy?.budgetPerPerson != null, true];
}
// Korea wall-clock arithmetic, independent of the phone's configured timezone.
export function wizardTimeRange(time: string, duration: string, now = new Date()) {
  const korea=new Date(+now+9*3600000);
  let start=Date.UTC(korea.getUTCFullYear(),korea.getUTCMonth(),korea.getUTCDate(),korea.getUTCHours(),korea.getUTCMinutes());
  const explicit=time.match(/^(\d{4})-(\d{2})-(\d{2})\s+(AM|PM)\s+(\d{1,2})\s*:\s*(\d{2})$/);
  if(explicit) start=Date.UTC(+explicit[1],+explicit[2]-1,+explicit[3],+explicit[5]%12+(explicit[4]==='PM'?12:0),+explicit[6]);
  else if(time==='오늘 저녁'||time==='오늘 밤') {
    const hour=korea.getUTCHours();
    const inside=time==='오늘 저녁'?hour>=17&&hour<20:hour>=20;
    if(!inside)start=new Date(start).setUTCHours(time==='오늘 저녁'?17:20,0,0,0);
  }
  else if(time!=='지금') return {start:time||'출발 시각 선택',end:duration||'종료 시각 선택'};
  const format=(v:number)=>new Intl.DateTimeFormat('ko-KR',{timeZone:'UTC',hour:'numeric',minute:'2-digit'}).format(v);
  let end:number|undefined;
  const hours=duration.match(/^(\d+)시간$/), clock=duration.match(/^종료 (\d{2}):(\d{2})$/);
  if(hours)end=start+Number(hours[1])*3600000;
  else if(duration==='저녁까지')end=new Date(start).setUTCHours(20,30,0,0);
  else if(duration==='밤까지'||clock){end=new Date(start).setUTCHours(clock?+clock[1]:0,clock?+clock[2]:30,0,0);if(end<=start)end+=86400000;}
  const nextDay=end!=null && new Date(end).getUTCDate()!==new Date(start).getUTCDate();
  return {start:time==='지금'?`지금 · ${format(start)}`:format(start),end:end==null?'종료 시각 선택':duration==='저녁까지'&&end<=start?'최소 활동 후 종료':`${nextDay?'다음 날 ':''}${format(end)}${duration==='저녁까지'?' 목표':''}`};
}
