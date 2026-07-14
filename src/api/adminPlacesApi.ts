import { API_BASE_URL } from './client';

export type RegionKey = 'hongdae' | 'seongsu';
export type CandidateStatus = 'pending' | 'approved' | 'rejected';
export type PlaceType = 'food' | 'cafe' | 'activity' | 'drink' | 'hotplace';

export interface PlaceImageInput {
  id?: number;
  imageType: string;
  imageUrl: string;
  thumbnailUrl?: string | null;
  source?: string | null;
  isPrimary?: boolean | number;
}

export interface PlaceMenuInput {
  id?: number;
  name: string;
  menuCategory?: string | null;
  price?: number | null;
  description?: string | null;
  imageUrl?: string | null;
  isSignature?: boolean | number;
  isAvailable?: boolean | number;
  source?: string | null;
}

export interface PlaceCandidate {
  id?: number;
  provider: string;
  providerPlaceId: string;
  name: string;
  branchName?: string | null;
  regionKey: RegionKey;
  nearestStation?: string | null;
  stationDistanceM?: number | null;
  address?: string | null;
  roadAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  sourceUrl?: string | null;
  sourceQuery?: string | null;
  entityType: string;
  primaryType: PlaceType;
  detailType?: string | null;
  categoryRaw?: string | null;
  categoryPathRaw?: string | null;
  intentTags: string[];
  atmosphereTags: string[];
  amenityTags: string[];
  companionScores: Record<string, number>;
  isFranchise: boolean;
  brandName?: string | null;
  rating?: number | null;
  ratingCount?: number | null;
  reviewCount?: number | null;
  businessStatus?: string | null;
  businessHoursRaw?: string | null;
  businessHoursJson?: Record<string, unknown> | null;
  priceMin?: number | null;
  priceAverage?: number | null;
  priceMax?: number | null;
  recommendedPaxMin?: number | null;
  recommendedPaxMax?: number | null;
  averageStayMinutes?: number | null;
  classificationConfidence?: number | null;
  status?: CandidateStatus;
  primaryImageUrl?: string | null;
  imageCount?: number;
  menuCount?: number;
  images?: PlaceImageInput[];
  menus?: PlaceMenuInput[];
}

interface ApiEnvelope {
  success: boolean;
  message?: string;
}

function headers(key: string, adminId: string) {
  return {
    'Content-Type': 'application/json',
    'x-admin-key': key,
    'x-admin-id': encodeURIComponent(adminId),
  };
}

async function adminJson<T extends ApiEnvelope>(
  path: string,
  key: string,
  adminId: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { ...headers(key, adminId), ...(init?.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || '관리자 API 요청에 실패했습니다.');
  return data as T;
}

export function checkAdminAccess(key: string, adminId: string) {
  return adminJson<ApiEnvelope & { regions: Record<RegionKey, { label: string }> }>(
    '/api/admin/places/health', key, adminId,
  );
}

export function searchAdminPlaces(key: string, adminId: string, regionKey: RegionKey, query: string) {
  return adminJson<ApiEnvelope & { places: PlaceCandidate[] }>(
    '/api/admin/places/search', key, adminId,
    { method: 'POST', body: JSON.stringify({ regionKey, query }) },
  );
}

export function listPlaceCandidates(
  key: string,
  adminId: string,
  regionKey: RegionKey,
  status: CandidateStatus,
) {
  return adminJson<ApiEnvelope & { candidates: PlaceCandidate[] }>(
    `/api/admin/places/candidates?regionKey=${regionKey}&status=${status}`, key, adminId,
  );
}

export function getPlaceCandidate(key: string, adminId: string, candidateId: number) {
  return adminJson<ApiEnvelope & { candidate: PlaceCandidate }>(
    `/api/admin/places/candidates/${candidateId}`, key, adminId,
  );
}

export function createPlaceCandidate(key: string, adminId: string, candidate: PlaceCandidate) {
  return adminJson<ApiEnvelope & { candidateId: number }>(
    '/api/admin/places/candidates', key, adminId,
    { method: 'POST', body: JSON.stringify(candidate) },
  );
}

export function updatePlaceCandidate(key: string, adminId: string, candidate: PlaceCandidate) {
  if (!candidate.id) throw new Error('후보 ID가 없습니다.');
  return adminJson<ApiEnvelope>(
    `/api/admin/places/candidates/${candidate.id}`, key, adminId,
    { method: 'PUT', body: JSON.stringify(candidate) },
  );
}

export function enrichPlaceCandidate(key: string, adminId: string, candidateId: number) {
  return adminJson<ApiEnvelope & { imageCount: number; menuCount: number }>(
    `/api/admin/places/candidates/${candidateId}/enrich-apify`, key, adminId,
    { method: 'POST' },
  );
}

export function approvePlaceCandidate(
  key: string,
  adminId: string,
  candidateId: number,
  editorial: Record<string, unknown>,
) {
  return adminJson<ApiEnvelope & { placeId: number }>(
    `/api/admin/places/candidates/${candidateId}/approve`, key, adminId,
    { method: 'POST', body: JSON.stringify(editorial) },
  );
}

export function rejectPlaceCandidate(key: string, adminId: string, candidateId: number, reason: string) {
  return adminJson<ApiEnvelope>(
    `/api/admin/places/candidates/${candidateId}/reject`, key, adminId,
    { method: 'POST', body: JSON.stringify({ reason }) },
  );
}

export async function uploadPlaceImage(key: string, adminId: string, file: File) {
  const formData = new FormData();
  formData.append('image', file);
  const response = await fetch(`${API_BASE_URL}/api/admin/places/upload-image`, {
    method: 'POST',
    headers: { 'x-admin-key': key, 'x-admin-id': encodeURIComponent(adminId) },
    body: formData,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || '이미지 업로드에 실패했습니다.');
  return data as ApiEnvelope & { imageUrl: string };
}
