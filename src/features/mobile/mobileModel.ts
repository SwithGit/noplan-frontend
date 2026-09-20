import type { CoursePlace, CoursePlan, ExploreCourse } from '../../types/noplan';
import { parseExploreCoursePlaces } from '../../utils/coursePlan';

export interface FavoriteInput { kind: 'course' | 'place'; title: string; location: string; places: CoursePlace[]; publicCourseId?:number }
export interface Favorite extends FavoriteInput { id: string; savedAt: string; unavailable?: boolean }
export const courseFavorite = (course: ExploreCourse): FavoriteInput => ({kind:'course', title:course.title, location:course.location || '', places:parseExploreCoursePlaces(course),publicCourseId:course.id});
export const planFavorite = (plan: CoursePlan): FavoriteInput => ({kind:'course',title:plan.title,location:plan.location,places:plan.courseData});
export const placeFavorite = (place: CoursePlace): FavoriteInput => ({kind:'place',title:place.name || place.title,location:place.address || '',places:[place]});
export const favoriteIdentity = (item: FavoriteInput) => JSON.stringify([item.kind,item.kind === 'course' ? item.title.trim().toLowerCase() : '',item.places.map(place => [(place.name || place.title).trim().toLowerCase(),(place.address || '').trim().toLowerCase()])]);
export function durationLabel(places: CoursePlace[]) {
  if (!places.length || places.some(place => !place.durationMinutes)) return `${places.length}곳 · 체류시간 미확인`;
  const minutes=places.reduce((sum,place)=>sum+(place.durationMinutes || 0),0);
  return `${places.length}곳 · 체류 ${minutes >= 60 ? `${Math.floor(minutes/60)}시간 ` : ''}${minutes%60 ? `${minutes%60}분` : ''}`.trim();
}
export const categories = [
  {label:'맛집', mood:'맛집', type:'food', key:'food', tone:'peach'},
  {label:'카페', mood:'카페/디저트', type:'cafe', key:'cafe', tone:'brown'},
  {label:'놀거리', mood:'놀거리', type:'activity', key:'activity', tone:'purple'},
  {label:'산책·명소', mood:'산책/구경', type:'hotplace', key:'hotplace', tone:'green'},
  {label:'술·야간', mood:'술/야간', type:'drink', key:'drink', tone:'blue'},
] as const;
