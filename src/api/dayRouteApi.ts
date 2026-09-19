import { apiJson } from './client';
import type { RoutePoint } from '../features/trips/dayRouteModel';
import type { TripDocument } from '../features/trips/tripModel';

export interface DayRouteResult {
  id: string;
  status: 'ok' | 'unavailable';
  durationMinutes?: number;
  distanceMeters?: number;
  parkingMinutes?: number;
  source?: string;
  reason?: string;
}
export async function getDayRoutes(transport: TripDocument['transport'], legs: { id: string; from: RoutePoint; to: RoutePoint }[], signal: AbortSignal, operationId?: string) {
  return apiJson<{ legs: DayRouteResult[] }>('/api/tourism/day-route', {
    method: 'POST', body: JSON.stringify({ transport, legs }),
    ...(operationId ? { headers: { 'X-NoPlan-Operation-Id': operationId } } : {}),
    signal: AbortSignal.any([signal, AbortSignal.timeout(25000)]),
  });
}
