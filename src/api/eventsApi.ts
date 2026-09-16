import { apiJson } from './client';
import type { EventResult,TravelEvent } from '../features/events/eventModel';
export const fetchEvents=(params:URLSearchParams)=>apiJson<EventResult>(`/api/events?${params}`);
export const fetchEvent=(id:string)=>apiJson<{event:TravelEvent}>(`/api/events/${encodeURIComponent(id)}`).then(result=>result.event);
