import { apiJson } from './client';

export interface TourismRegion { id: string; name: string; districts: string[] }
export function getTourismRegions(signal?: AbortSignal) {
  return apiJson<{ items: TourismRegion[] }>('/api/tourism/regions', { signal });
}

export interface TourismAttraction {
  contentId: string;
  contentTypeId: '12' | '14' | '28' | '25' | '38' | '39';
  name: string;
  type: string;
  address: string;
  lat: number;
  lng: number;
  sourceUrl: string;
  sourceLabel: string;
  imageUrl?: string;
  imageLicense?: string;
  searchCount?: number | null;
  demographicShare?: number | null;
  district?: string;
  foodKind?: 'meal' | 'cafe' | 'unknown';
}
export type TourismSort = 'recommended' | 'popular' | 'name';
export interface TourismRankingOptions { region?: string; destination?: string; sort?: TourismSort; profile?: 'member' | 'custom'; ageBand?: string; gender?: 'all' | 'male' | 'female' }
export interface TourismSearchResult {
  items: TourismAttraction[]; page: number; hasMore: boolean; total?: number;
  effectiveSort?: TourismSort; rankingNote?: string; fallbackReason?: string | null;
  profile?: { ageBand: string | null; gender: 'male' | 'female' | null; source: 'member' | 'custom' | 'missing'; label: string | null };
  period?: { start: string; end: string };
  scope?: { region: string; name: string; district: string; label: string; districts: string[] };
}
export function searchTourism(keyword: string, type: TourismAttraction['contentTypeId'] | 'all', page: number, signal?: AbortSignal, ranking: TourismRankingOptions = {}) {
  const params = new URLSearchParams({ keyword, type, page: String(page) });
  Object.entries(ranking).forEach(([key, value]) => { if (value !== undefined) params.set(key, value); });
  return apiJson<TourismSearchResult>(`/api/tourism/search?${params}`, { signal });
}

export interface TourismDetail {
  contentId: string;
  contentTypeId: TourismAttraction['contentTypeId'];
  overview: string;
  homepage: string;
  facts: { label: string; value: string }[];
  extras: { label: string; value: string }[];
  course: { duration: string; distance: string; stops: { name: string; description: string }[] } | null;
  partial: boolean;
  sourceLabel: string;
}

export function getTourismDetail(id: string, type: TourismAttraction['contentTypeId'], signal: AbortSignal) {
  return apiJson<TourismDetail>(`/api/tourism/${encodeURIComponent(id)}?type=${type}`, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
  });
}
