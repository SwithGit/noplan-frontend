export interface TravelEvent {
  id:string;provider:'tourapi'|'seoul';providerId:string;title:string;kind:'festival'|'exhibition'|'performance'|'event';
  startDate:string;endDate:string;address:string;region:string;district?:string;venue:string;lat:number|null;lng:number|null;
  imageUrl:string;imageLicense:string;sourceUrl:string;bookingUrl?:string;description:string;hours:string;price:string;isFree:boolean|null;age:string;phone:string;
  status:'scheduled'|'cancelled';sourceLabel:string;detailUnavailable?:boolean;
  nearby?:{distanceMeters:number;placeIndex:number;visitDate:string};
}
export interface EventResult {events:TravelEvent[];total:number;page:number;pageSize:number;sources:{provider:string;enabled:boolean;available:boolean;stale:boolean;fetchedAt:string|null}[]}
export const eventKinds={festival:'축제',exhibition:'전시',performance:'공연',event:'행사'};
export const koreaToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function eventStatus(event:TravelEvent){const today=koreaToday();return event.status==='cancelled'?'취소':event.endDate<today?'종료':event.startDate>today?'개최 예정':'기간 중';}
export const eventDate=(date:string)=>date.replaceAll('-','.');
