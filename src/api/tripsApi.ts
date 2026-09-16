import { apiJson } from './client';
import type { TripRecord } from '../features/trips/tripModel';

export async function listTrips() {
  const result = await apiJson<{ success: boolean; trips: TripRecord[] }>('/api/trips');
  return result.trips;
}
export async function getTrip(id: string) {
  const result = await apiJson<{ success: boolean; trip: TripRecord }>(`/api/trips/${encodeURIComponent(id)}`);
  return result.trip;
}
export async function saveTrip(trip: TripRecord) {
  const result = await apiJson<{ success: boolean; trip: TripRecord }>(`/api/trips/${encodeURIComponent(trip.id)}`, { method: 'PUT', body: JSON.stringify({ version: trip.version, document: trip.document }) });
  return result.trip;
}
