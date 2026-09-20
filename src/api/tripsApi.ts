import { apiJson } from './client';
import type { TripRecord } from '../features/trips/tripModel';
import type { TripDocument } from '../features/trips/tripModel';

export async function listTrips() {
  const result = await apiJson<{ success: boolean; trips: TripRecord[] }>('/api/trips');
  return result.trips;
}
export function deleteTrip(trip: TripRecord) {
  return apiJson<{ success: boolean; action: 'deleted' | 'left' }>(`/api/trips/${encodeURIComponent(trip.id)}`, {
    method: 'DELETE', signal: AbortSignal.timeout(15000), body: JSON.stringify({ version: trip.version }),
  });
}
export async function getTrip(id: string) {
  const result = await apiJson<{ success: boolean; trip: TripRecord }>(`/api/trips/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(15000) });
  return result.trip;
}
export async function saveTrip(trip: TripRecord) {
  const result = await apiJson<{ success: boolean; trip: TripRecord }>(`/api/trips/${encodeURIComponent(trip.id)}`, { method: 'PUT', signal: AbortSignal.timeout(15000), body: JSON.stringify({ version: trip.version, document: trip.document }) });
  return result.trip;
}
export async function pollTrip(id: string, version: number) {
  return apiJson<{ trip: TripRecord | null; collaboration: TripRecord['collaboration'] }>(`/api/trips/${encodeURIComponent(id)}?since=${version}`, { signal: AbortSignal.timeout(15000) });
}
export interface TripMember { userId: string; nickname: string; role: 'owner' | 'editor' }
export interface TripActivity { version: number; nickname: string; createdAt: string; summary: { type: string; date?: string; added?: number; removed?: number }[] }
export interface TripCollaborationState { members: (TripMember & { online: boolean; editing: boolean })[]; activity: TripActivity[] }
export function getTripCollaboration(id: string) { return apiJson<TripCollaborationState>(`/api/trips/${encodeURIComponent(id)}/collaboration`, { signal: AbortSignal.timeout(15000) }); }
export function tripHeartbeat(id: string, editing: boolean) { return apiJson(`/api/trips/${encodeURIComponent(id)}/presence`, { method:'POST', body:JSON.stringify({editing}), signal:AbortSignal.timeout(10000) }); }
export function createTripPublicLink(id: string) { return apiJson<{token:string; expiresAt:string}>(`/api/trips/${encodeURIComponent(id)}/public-link`, {method:'POST'}); }
export function revokeTripPublicLink(id: string) { return apiJson(`/api/trips/${encodeURIComponent(id)}/public-link`, {method:'DELETE'}); }
export function getPublicTrip(token: string, signal?: AbortSignal) { return apiJson<{document:TripDocument;updatedAt:string}>('/api/trips/public-view', {method:'POST', body:JSON.stringify({token}), signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000)}); }
export async function getTripMembers(id: string) {
  return (await apiJson<{ members: TripMember[] }>(`/api/trips/${encodeURIComponent(id)}/members`)).members;
}
export function createTripInvite(id: string) {
  return apiJson<{ token: string; expiresAt: string }>(`/api/trips/${encodeURIComponent(id)}/invite`, { method: 'POST' });
}
export function revokeTripInvite(id: string) {
  return apiJson(`/api/trips/${encodeURIComponent(id)}/invite`, { method: 'DELETE' });
}
export function removeTripMember(id: string, memberId: string) {
  return apiJson(`/api/trips/${encodeURIComponent(id)}/members/${encodeURIComponent(memberId)}`, { method: 'DELETE' });
}
export async function joinTrip(token: string) {
  return (await apiJson<{ trip: TripRecord }>('/api/trips/join', { method: 'POST', body: JSON.stringify({ token }) })).trip;
}
