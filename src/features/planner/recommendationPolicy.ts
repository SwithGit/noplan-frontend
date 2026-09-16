import type {CoursePlace} from '../../types/noplan';
const cultureDetails = new Set(['전시','영화','공연','팝업','미술관/박물관','독립서점','복합문화공간']);
export function isCourseRecommendationPlace(place:CoursePlace){
  return place.type!=='culture'&&!cultureDetails.has(place.detailType||'')&&!/문화시설|전시|미술관|박물관|갤러리|영화관|공연장|극장|팝업|독립서점|복합문화공간/.test(place.category||'');
}
