export type Facility = 'entrance' | 'restroom' | 'parking' | 'elevator' | 'stroller' | 'nursing';
export type NeedLevel = 'prefer' | 'required';
export interface TravelNeeds {
  pet: { enabled: boolean; species: 'dog' | 'cat'; weightKg: number | null; indoor: boolean };
  facilities: Partial<Record<Facility, NeedLevel>>;
}
export type EvidenceState = 'yes' | 'no' | 'conditional' | 'unknown';
export interface TravelSupport {
  contentId: string; checkedAt: string;
  pet: { status: 'ok' | 'unavailable'; allowed: EvidenceState; species: string[]; maxKg: number | null; exclusiveMax?: boolean; weightRestricted: boolean; indoor: EvidenceState; facts: { label: string; value: string }[] };
  access: { status: 'ok' | 'unavailable'; facilities: Record<Facility, { state: EvidenceState; text: string }> };
}
export const facilityLabels: Record<Facility, string> = { entrance: '휠체어 접근 출입구', restroom: '장애인 화장실', parking: '장애인 주차구역', elevator: '엘리베이터', stroller: '유모차 대여', nursing: '수유실' };
export const emptyNeeds = (): TravelNeeds => ({ pet: { enabled: false, species: 'dog', weightKg: null, indoor: false }, facilities: {} });
export function normalizeNeeds(raw?: Partial<TravelNeeds> | null): TravelNeeds {
  const p = raw?.pet;
  return { pet: { enabled: p?.enabled === true, species: p?.species === 'cat' ? 'cat' : 'dog', weightKg: typeof p?.weightKg === 'number' && Number.isFinite(p.weightKg) && p.weightKg > 0 && p.weightKg <= 150 ? p.weightKg : null, indoor: p?.indoor === true }, facilities: Object.fromEntries(Object.entries(raw?.facilities || {}).filter(([key, v]) => Object.hasOwn(facilityLabels, key) && (v === 'prefer' || v === 'required'))) };
}
export function hasTravelNeeds(needs?: TravelNeeds) { return Boolean(needs?.pet.enabled || Object.keys(needs?.facilities || {}).length); }
export function evaluateNeeds(support: TravelSupport | undefined, raw?: TravelNeeds) {
  const needs = normalizeNeeds(raw), missing: string[] = []; let score = 0;
  if (needs.pet.enabled) {
    const p = support?.pet;
    if (!p || p.status !== 'ok' || !['yes', 'conditional'].includes(p.allowed) || !p.species.includes(needs.pet.species)
      || p.weightRestricted && (needs.pet.weightKg == null || p.maxKg == null || (p.exclusiveMax ? needs.pet.weightKg >= p.maxKg : needs.pet.weightKg > p.maxKg))
      || needs.pet.indoor && p.indoor !== 'yes') missing.push('반려동물 동반 조건 확인 필요');
  }
  for (const [key, level] of Object.entries(needs.facilities)) {
    const confirmed = support?.access.status === 'ok' && support.access.facilities[key as Facility]?.state === 'yes';
    if (confirmed) score += 1;
    else if (level === 'required') missing.push(facilityLabels[key as Facility]);
  }
  return { eligible: missing.length === 0, missing, score };
}
