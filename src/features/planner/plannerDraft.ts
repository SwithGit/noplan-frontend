import type { CurrentPosition, PlannerCondition } from '../../types/noplan';

const KEY = 'noplan:planner-draft:v1';
const TTL = 12 * 60 * 60 * 1000;
export function readPlannerDraft(fallback: PlannerCondition): { condition: PlannerCondition; currentPosition: CurrentPosition | null } {
  const empty = { condition: fallback, currentPosition: null };
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (!saved || !Number.isFinite(saved.savedAt) || saved.savedAt>Date.now() || Date.now()-saved.savedAt > TTL) return empty;
    const c=saved.condition;
    if (!c || ['rawText','location','time','companion','mood','mainCategory','coreIntent','duration'].some(key=>typeof c[key]!=='string')
      || ['extras','supportingCategories','atmosphereTags'].some(key=>!Array.isArray(c[key]) || c[key].some((v: unknown)=>typeof v!=='string'))
      || (c.accuracy!=null && (typeof c.accuracy!=='object' || Array.isArray(c.accuracy)))) return empty;
    if(c.locationLabel!=null && typeof c.locationLabel!=='string')return empty;
    const a=c.accuracy;
    if(a && (['budgetPerPerson','groupSize','drinkServings'].some(key=>a[key]!=null && (typeof a[key]!=='number' || !Number.isFinite(a[key])))
      || (a.excludedDetails!=null && (!Array.isArray(a.excludedDetails) || a.excludedDetails.some((v:unknown)=>typeof v!=='string')))))return empty;
    const p=saved.currentPosition;
    const position=p && typeof p.lat==='number' && typeof p.lng==='number' && Math.abs(p.lat)<=90 && Math.abs(p.lng)<=180 && p.address===c.location ? p : null;
    return {condition:{...fallback,...c},currentPosition:position};
  } catch { return empty; }
}
export function savePlannerDraft(condition: PlannerCondition, currentPosition: CurrentPosition | null) {
  try { sessionStorage.setItem(KEY,JSON.stringify({savedAt:Date.now(),condition,currentPosition})); } catch { /* Private mode / full storage must not block planning. */ }
}

export function missingPlannerCondition(condition: PlannerCondition) {
  const fields: Array<[string,string]> = [[condition.location,'출발지'],[condition.time,'출발 시간'],[condition.companion,'동행'],[condition.mood,'하고 싶은 활동'],[condition.duration,'종료 시간']];
  const missing=fields.filter(([value])=>!value?.trim()).map(([,label])=>label);
  return missing.length ? `${missing.join('·')} 정보가 없어요. 조건을 입력한 뒤 코스를 찾아 주세요.` : '';
}
