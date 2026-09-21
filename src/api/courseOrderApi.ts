import { apiJson } from './client';
import type { CoursePlace, CoursePlan } from '../types/noplan';

export const stopKey = (place: CoursePlace) => place.catalogPlaceId ? `catalog:${place.catalogPlaceId}` : `live:${place.provider || ''}:${place.providerPlaceId || place.id}`;

export function moveStop<T>(items: T[], from: number, to: number): T[] {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const result = [...items];
  result.splice(to, 0, result.splice(from, 1)[0]);
  return result;
}

interface ReorderResponse {
  success: boolean;
  updates: Array<Partial<CoursePlace> & {key:string}>;
  endAt: string;
  walkingMinutes: number;
  warnings: string[];
  origin: {lat:number;lng:number};
}

export function mergeReorderedPlan(plan: CoursePlan, ordered: CoursePlace[], result: ReorderResponse): CoursePlan {
  if (!result.success || result.updates.length !== ordered.length
    || result.updates.some((update,i)=>update.key !== stopKey(ordered[i]))) throw new Error('변경된 순서를 확인하지 못했어요. 다시 시도해 주세요.');
  const courseData = ordered.map((place,i)=>{
    const {key: _key,...update} = result.updates[i];
    void _key;
    return {...place,...update,summary:place.summary.replace(/^(?:오전|오후).*? · 예상 \d+분 · /,''),
      tags:place.tags.filter(tag=>tag!=='시작')};
  });
  const summary = plan.accuracySummary ? {...plan.accuracySummary,endAt:result.endAt,
    warnings:[...new Set([...plan.accuracySummary.warnings.filter(w=>!w.includes('예상 종료가') && !w.includes('영업시간') && !w.includes('자유시간')), ...result.warnings])]} : undefined;
  const end = new Date(result.endAt).toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul',hour:'numeric',minute:'2-digit'});
  return {...plan,courseData,accuracySummary:summary,routeOrigin:result.origin,id:undefined,searchCourseId:null,backupPlaces:[],
    durationText:`${courseData.length}곳 · ${end}까지`,
    adjustmentNotice:['바꾼 순서에 맞춰 이동 시간과 방문 시간을 다시 확인했어요.',...result.warnings].join(' '),
    courseOptions:plan.courseOptions?.map(option=>option.id === plan.selectedOptionId ? {...option,courseData,summary:summary || {...option.summary,endAt:result.endAt},
      ranking:{...option.ranking,walkingMinutes:result.walkingMinutes,basis:'직접 변경한 순서'}} : option)};
}

export async function reorderPlan(plan: CoursePlan, from: number, to: number, signal: AbortSignal): Promise<CoursePlan> {
  if (!plan.requestedWindow) throw new Error('방문 시간 정보가 없어요. 새로 추천받은 코스에서 순서를 변경해 주세요.');
  const ordered = moveStop(plan.courseData,from,to);
  const context = plan.planningContext;
  const position = context?.currentPosition;
  const result = await apiJson<ReorderResponse>('/api/course/generate/reorder-course',{
    method:'POST',signal,body:JSON.stringify({
      stops:ordered.map(place=>({key:stopKey(place),catalogPlaceId:place.catalogPlaceId,lat:place.lat,lng:place.lng,durationMinutes:place.durationMinutes})),
      startAt:plan.requestedWindow.startAt,endAt:plan.requestedWindow.endAt,location:plan.location,
      origin:plan.routeOrigin || (position?.address === context?.condition.location ? position : null),
      transportMode:context?.condition.transportMode || 'walk',maxWalkingDistanceMeters:context?.condition.accuracy?.maxWalkingDistanceMeters,
    }),
  });
  return mergeReorderedPlan(plan,ordered,result);
}
