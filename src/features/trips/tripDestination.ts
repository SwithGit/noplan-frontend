import type { TourismRegion } from '../../api/tourismApi';

const aliases: Record<string, string[]> = {
  seoul: ['서울', '서울시'], busan: ['부산', '부산시'], daegu: ['대구', '대구시'],
  incheon: ['인천', '인천시'], daejeon: ['대전', '대전시'], ulsan: ['울산', '울산시'],
  sejong: ['세종', '세종시'], gyeonggi: ['경기'], gangwon: ['강원', '강원도'],
  chungbuk: ['충북'], chungnam: ['충남'], jeonbuk: ['전북', '전라북도'],
  jeonnam: ['전남'], gyeongbuk: ['경북'], gyeongnam: ['경남'], jeju: ['제주', '제주도'],
};
const compact = (value: string) => value.replace(/\s/g, '');

export function destinationDistricts(region: TourismRegion): string[] {
  // Offer a whole city as well as its districts; reject malformed address fragments.
  const districts = region.districts.filter(name => name !== region.name && /^[가-힣]+[시군구](?: [가-힣]+구)?$/.test(name) && !/(광역시|특별시|자치시)$/.test(name));
  return [...new Set(districts.flatMap(name => [name.split(' ')[0], name]))].sort((a, b) => a.localeCompare(b, 'ko'));
}

export function formatDestination(region: TourismRegion, district = '') {
  return district ? `${region.name} ${district}` : region.name;
}

export function resolveDestination(value: string, regions: TourismRegion[]): { region: TourismRegion; district: string } | null {
  const input = compact(value);
  if (!input) return null;
  // Keep ambiguous legacy names unselected instead of silently picking another city.
  if (input === '광주' || input === '광주시') return null;
  const candidates = regions.flatMap(region => [region.name, region.id, ...(aliases[region.id] || [])].map(alias => ({ region, alias })));
  const prefix = candidates.sort((a, b) => b.alias.length - a.alias.length).find(({ alias }) => input.startsWith(alias));
  if (prefix) {
    const remainder = input.slice(prefix.alias.length);
    if (!remainder || remainder === '전체') return { region: prefix.region, district: '' };
    const district = destinationDistricts(prefix.region).find(name => compact(name) === remainder || compact(name).replace(/[시군]$/, '') === remainder);
    return district ? { region: prefix.region, district } : null;
  }
  const matches = regions.flatMap(region => destinationDistricts(region).filter(name => compact(name) === input || compact(name).replace(/[시군]$/, '') === input).map(district => ({ region, district })));
  return matches.length === 1 ? matches[0] : null;
}
