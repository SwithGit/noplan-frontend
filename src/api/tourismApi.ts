import { apiJson } from './client';

export interface TourismAttraction {
  contentId: string;
  contentTypeId: '12' | '14' | '28';
  name: string;
  type: string;
  address: string;
  lat: number;
  lng: number;
  sourceUrl: string;
  sourceLabel: string;
}
export interface TourismSearchResult { items: TourismAttraction[]; page: number; hasMore: boolean }
export function searchTourism(keyword: string, type: TourismAttraction['contentTypeId'], page: number, signal?: AbortSignal) {
  return apiJson<TourismSearchResult>(`/api/tourism/search?${new URLSearchParams({ keyword, type, page: String(page) })}`, { signal });
}
