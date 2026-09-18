import type { PlannerAccuracy } from '../types/noplan';

export function normalizeFillPreferences(value: PlannerAccuracy = {}) {
  const fillSchedule = value.fillSchedule !== false;
  const allowBudgetWalk = value.allowBudgetWalk ??
    (!Array.isArray(value.additionalActivities) || value.additionalActivities.includes('hotplace'));
  // Old saved forms could enable filling while disabling every paid activity.
  const additionalActivities: NonNullable<PlannerAccuracy['additionalActivities']> = fillSchedule
    ? ['activity', 'cafe', ...(allowBudgetWalk ? ['hotplace' as const] : [])] : [];
  return { fillSchedule, allowBudgetWalk, additionalActivities };
}
