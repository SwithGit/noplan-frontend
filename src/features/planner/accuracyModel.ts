import { getLoggedInUser } from '../../api/client';
import type { PlannerAccuracy, PlannerCondition } from '../../types/noplan';

export const preferenceKey = () => {
  const user = getLoggedInUser();
  return user ? `noplan:recommendation-preferences:${user.userId}` : null;
};
export function savedAccuracyPreferences(): PlannerAccuracy {
  try {
    const key = preferenceKey();
    const saved = key ? JSON.parse(localStorage.getItem(key) || '{}') as PlannerAccuracy : {};
    return {
      budgetPerPerson: [0,20000,30000,50000,70000,100000,150000].includes(Number(saved.budgetPerPerson)) && typeof saved.budgetPerPerson === 'number' ? saved.budgetPerPerson : undefined,
      alcoholPreference: saved.alcoholPreference,
      drinkServings: saved.drinkServings,
      excludedDetails: Array.isArray(saved.excludedDetails) ? saved.excludedDetails.filter(x => typeof x === 'string') : [],
      preferredFoodDetails: Array.isArray(saved.preferredFoodDetails) ? saved.preferredFoodDetails.filter(x => ['한식','중식','양식','일식','고기','분식','해산물'].includes(x)) : undefined,
    };
  } catch { return {}; }
}
export function groupSizeOf(condition: PlannerCondition) {
  return condition.accuracy?.groupSize ?? (/혼자/.test(condition.companion) ? 1 : /두명|2명/.test(condition.companion) ? 2 : undefined);
}
export function accuracyMissing(condition: PlannerCondition) {
  const maxWalk=condition.accuracy?.maxWalkingDistanceMeters;
  if(condition.transportMode!=='car' && maxWalk!=null && (!Number.isInteger(maxWalk)||maxWalk<100||maxWalk>5000))return '최대 도보 거리를 다시 선택해 주세요.';
  if (condition.accuracy?.budgetPerPerson == null) return '1인당 전체 예산을 선택해 주세요. 제한 없음도 선택할 수 있어요.';
  const size = groupSizeOf(condition);
  if (!Number.isInteger(size) || !size || size < 1 || size > 30) return '이번 모임의 정확한 인원을 1~30명 사이로 입력해 주세요.';
  return '';
}
