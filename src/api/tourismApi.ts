import { getLocale, type Locale } from '../i18n/locale';
import { apiJson } from './client';

export interface TourismRegion { id: string; name: string; districts: string[] }
export interface TourismCourseList {
  locale?: Locale;
  requestedLocale?: Locale;
  translationStatus?: 'original' | 'translated' | 'unavailable';
  translationSource?: 'machine';
  items: (Pick<TourismAttraction, 'contentId' | 'name' | 'address' | 'imageUrl' | 'imageLicense'> & {
    region: string; regionName: string; description?: string; duration?: string; stops?: string[]; imagePlace?: string;
  })[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  regions: { id: string; name: string; count: number }[];
}
export function getTourismCourses(region: string, keyword: string, page: number, signal: AbortSignal, locale: Locale = getLocale()) {
  const params = new URLSearchParams({ region, keyword, page: String(page), locale });
  return apiJson<TourismCourseList>(`/api/tourism/courses?${params}`, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(locale === 'ko' ? 15000 : 120000)]),
  });
}
export function getTourismRegions(signal?: AbortSignal) {
  return apiJson<{ items: TourismRegion[] }>('/api/tourism/regions', { signal });
}

export interface TourismAttraction {
  locale?: Locale;
  localizedName?: string;
  localizedAddress?: string;
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
  classification?: string;
}
export type TourismSort = 'recommended' | 'popular' | 'name';
export interface TourismRankingOptions { region?: string; destination?: string; sort?: TourismSort; profile?: 'member' | 'custom'; ageBand?: string; gender?: 'all' | 'male' | 'female' }
export interface TourismSearchResult {
  locale?: Locale;
  translationStatus?: 'ok' | 'unavailable';
  items: TourismAttraction[]; page: number; hasMore: boolean; total?: number;
  effectiveSort?: TourismSort; rankingNote?: string; fallbackReason?: string | null;
  profile?: { ageBand: string | null; gender: 'male' | 'female' | null; source: 'member' | 'custom' | 'missing'; label: string | null };
  period?: { start: string; end: string };
  scope?: { region: string; name: string; district: string; label: string; districts: string[] };
}
export function searchTourism(keyword: string, type: TourismAttraction['contentTypeId'] | 'all', page: number, signal?: AbortSignal, ranking: TourismRankingOptions = {}) {
  const params = new URLSearchParams({ keyword, type, page: String(page), locale: getLocale() });
  Object.entries(ranking).forEach(([key, value]) => { if (value !== undefined) params.set(key, value); });
  return apiJson<TourismSearchResult>(`/api/tourism/search?${params}`, { signal });
}

export interface TourismDetail {
  contentId: string;
  contentTypeId: TourismAttraction['contentTypeId'];
  locale?: Locale;
  requestedLocale?: Locale;
  translationStatus?: 'translated' | 'missing' | 'unavailable';
  translationSource?: 'machine';
  localizedImagePlace?: string;
  localizedName?: string;
  localizedAddress?: string;
  overview: string;
  homepage: string;
  facts: { label: string; value: string }[];
  extras: { label: string; value: string }[];
  course: { duration: string; distance: string; stops: { name: string; originalName?: string; description: string }[] } | null;
  partial: boolean;
  sourceLabel: string;
}

export function getTourismDetail(id: string, type: TourismAttraction['contentTypeId'], signal: AbortSignal, locale: Locale = getLocale()) {
  return apiJson<TourismDetail>(`/api/tourism/${encodeURIComponent(id)}?type=${type}&locale=${locale}`, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(type === '25' && locale !== 'ko' ? 120000 : 15000)]),
  });
}
