import { apiJson } from './client';
import type { Favorite, FavoriteInput } from '../features/mobile/mobileModel';
import { normalizeCoursePlace } from '../utils/coursePlan';
import type { CoursePlace, CurrentPosition } from '../types/noplan';

function normalize(item: Favorite): Favorite { return {...item,places:item.places.map(normalizeCoursePlace).filter((place): place is CoursePlace => Boolean(place))}; }
export async function fetchFavorites() { const result=await apiJson<{favorites:Favorite[]}>('/api/library/favorites');return result.favorites.map(normalize); }
export async function putFavorite(item: FavoriteInput) { const result=await apiJson<{favorite:Favorite}>('/api/library/favorites',{method:'PUT',body:JSON.stringify(item)});return normalize(result.favorite); }
export async function deleteFavorite(id: string) { await apiJson(`/api/library/favorites/${encodeURIComponent(id)}`,{method:'DELETE'}); }
export async function fetchNearby(area: string, position?: CurrentPosition | null) {
  const params=new URLSearchParams({area});
  if(position){params.set('lat',String(position.lat));params.set('lng',String(position.lng));}
  const result=await apiJson<{places:unknown[]}>(`/api/library/nearby?${params}`);
  return result.places.map((raw,index)=>{
    const place=normalizeCoursePlace(raw,index);
    if(place&&raw&&typeof raw==='object'){
      const source=raw as Record<string,unknown>;
      // Missing catalog metrics must not appear as a real zero-star/zero-review value.
      if(source.rating==null||source.rating==='')place.rating=undefined;
      if(source.reviewCount==null||source.reviewCount==='')place.reviewCount=undefined;
    }
    return place;
  }).filter((place): place is CoursePlace => Boolean(place));
}
