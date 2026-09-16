import type {CoursePlace} from '../../types/noplan';
export interface EventStop {lat:number;lng:number;index:number;date:string;endDate:string}
function koreaDate(value?:string){
  if(!value)return '';
  // Schedules from the course API are ISO timestamps. Do not reinterpret vague chat text.
  const timestamp=/^\d{4}-\d{2}-\d{2}T/.test(value)?new Date(value):null;
  return timestamp&&Number.isFinite(timestamp.getTime())?new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(timestamp):'';
}
export function courseEventStops(places:CoursePlace[]):EventStop[]{
  return places.flatMap((place,index)=>{
    const lat=Number(place.lat),lng=Number(place.lng),date=koreaDate(place.scheduledStart),endDate=koreaDate(place.scheduledEnd)||date;
    if(place.lat==null||place.lng==null||!Number.isFinite(lat)||!Number.isFinite(lng)||lat<33||lat>39||lng<124||lng>132||!date||endDate<date)return [];
    return [{lat,lng,index:index+1,date,endDate}];
  }).slice(0,15);
}
export const eventDistance=(meters:number)=>meters<1000?`${Math.max(10,Math.round(meters/10)*10)}m`:`${(meters/1000).toFixed(1)}km`;
