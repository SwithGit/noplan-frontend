import type { PlannerCategoryKey } from './plannerIntents';

export const PLACE_DETAIL_OPTIONS: Record<PlannerCategoryKey, string[]> = {
  food: ['해산물', '고기', '한식', '일식', '중식', '양식', '분식', '기타 음식'],
  cafe: ['커피', '디저트', '베이커리', '브런치', '기타 카페'],
  activity: ['공방/체험', '방탈출', '보드게임', '볼링', '노래방', '오락실', '스포츠', '서브컬쳐'],
  culture: ['전시', '영화', '공연', '팝업', '미술관/박물관', '독립서점', '복합문화공간'],
  drink: ['펍', '포차', '와인/칵테일', '이자카야', '기타 술집'],
  walk: ['산책', '공원', '야경', '쇼핑몰', '시장/상권', '기타 명소'],
};

export const SEONGSU_HUB_OPTIONS = [
  { key: 'all', label: '전체' },
  { key: 'seongsu_station', label: '성수역' },
  { key: 'seoul_forest', label: '서울숲역' },
  { key: 'konkuk_univ', label: '건대입구역' },
  { key: 'ttukseom', label: '뚝섬역' },
] as const;

export type SeongsuHubKey = (typeof SEONGSU_HUB_OPTIONS)[number]['key'];
