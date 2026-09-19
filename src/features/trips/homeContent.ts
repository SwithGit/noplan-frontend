import type { TravelEvent } from '../events/eventModel';

// Editorial selections, not user travel diaries. Keep provider IDs when moving
// these records to a managed collection so links and attribution stay stable.
export const homeCourses = [
  { id: '2372024', region: '제주', title: '놀멍쉬멍, 제주 바다 구경', description: '바람과 파도를 따라 만나는 제주의 풍경', duration: '3시간', stops: ['사라봉공원', '관덕정', '용두암', '어영소공원'], image: 'https://tong.visitkorea.or.kr/cms/resource/68/3011868_image2_1.jpg', imagePlace: '용두암', license: '1유형' },
  { id: '1904557', region: '강릉', title: '호수와 이야기가 있는 강릉', description: '고즈넉한 누정에서 바다호숫길까지', duration: '5시간 30분', stops: ['선교장', '초당 두부마을', '경포대'], image: 'https://tong.visitkorea.or.kr/cms/resource/52/3501452_image2_1.jpg', imagePlace: '경포대', license: '1유형' },
  { id: '2022929', region: '서울', title: '낮도 밤도 좋은 서울 산책', description: '광화문에서 남산까지, 도심의 다른 표정', duration: '', stops: ['광화문', '청계천', '남산서울타워'], image: 'https://tong.visitkorea.or.kr/cms/resource/72/3069472_image2_1.JPG', imagePlace: '광화문', license: '3유형' },
  { id: '2394381', region: '울산', title: '몽돌 소리 따라 울산 바다', description: '바다를 곁에 두고 이어가는 해안 여행', duration: '7시간', stops: ['강동몽돌해변', '신명·정자해변', '화암 주상절리'], image: 'https://tong.visitkorea.or.kr/cms/resource/81/4075481_image2_1.jpg', imagePlace: '강동몽돌해변', license: '1유형' },
] as const;
export type HomeCourse = typeof homeCourses[number];

export function currentFestivalBanners(events: TravelEvent[], today: string) {
  const current = events.filter(event => event.kind === 'festival' && event.status !== 'cancelled' && event.startDate <= today && event.endDate >= today && event.imageUrl);
  const selected: TravelEvent[] = [], ids = new Set<string>(), regions = new Set<string>();
  // Give different destinations a turn, then fill remaining slots.
  for (const diverse of [true, false]) for (const event of current) {
    if (selected.length === 4) return selected;
    if (ids.has(event.id) || (diverse && regions.has(event.region))) continue;
    selected.push(event); ids.add(event.id); regions.add(event.region);
  }
  return selected;
}
