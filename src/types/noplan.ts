export type PlannerStep =
  | 'home'
  | 'chat'
  | 'condition'
  | 'searching'
  | 'result';

export interface UserSession {
  userId: string;
  userNick: string;
  profileURL?: string;
}

export interface PlannerCondition {
  accuracy?: PlannerAccuracy;
  rawText: string;
  location: string;
  locationLabel?: string;
  time: string;
  companion: string;
  mood: string;
  mainCategory: string;
  supportingCategories: string[];
  coreIntent: string;
  coreIntentExplicit?: boolean;
  coreIntentSkipped: boolean;
  atmosphereTags: string[];
  duration: string;
  extras: string[];
}

export interface CurrentPosition {
  address?: string;
  label?: string;
  lat: number;
  lng: number;
}

export interface CoursePlaceImage {
  imageType?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  isPrimary?: boolean;
}

export interface CourseMenuItem {
  name: string;
  menuCategory?: string;
  price?: number | null;
  priceText?: string;
  description?: string;
  imageUrl?: string;
  isSignature?: boolean;
}

export interface PlannerAccuracy {
  budgetPerPerson?: number;
  groupSize?: number;
  drinkServings?: number;
  alcoholPreference?: 'any' | 'soju' | 'beer' | 'wine' | 'cocktail';
  excludedDetails?: string[];
  allowUnverifiedHours?: boolean;
}

export interface AccuracySummary {
  requiredCount: number;
  fulfilledCount: number;
  costKnown: boolean;
  estimatedMin: number | null;
  estimatedMax: number | null;
  budgetPerPerson: number;
  endAt: string;
  warnings: string[];
}

export type CrowdingLevel = 'relaxed' | 'normal' | 'busy' | 'very_busy' | 'unknown';

export interface CrowdingSnapshot {
  scope: 'area' | 'place';
  source: 'seoul' | 'skt' | 'merchant' | 'unknown';
  areaCode?: string;
  areaName?: string;
  providerPlaceId?: string;
  level: CrowdingLevel;
  label: '여유' | '보통' | '약간 붐빔' | '붐빔' | '정보 없음';
  message: string;
  observedAt?: string;
  fetchedAt: string;
  stale: boolean;
}

export interface CoursePlace {
  estimatedCost?: { status: 'estimated' | 'unknown'; min: number | null; max: number | null; basis: string };
  id: string;
  time?: string;
  durationMinutes?: number;
  scheduledStart?: string;
  scheduledEnd?: string;
  title: string;
  name: string;
  type: string;
  detailType?: string;
  autoAdded?: boolean;
  flowRole?: 'requested' | 'connector';
  isFranchise?: boolean;
  brandName?: string;
  category: string;
  summary: string;
  description: string;
  address?: string;
  hours?: string;
  phone?: string;
  imageUrl?: string;
  galleryImages?: CoursePlaceImage[];
  menuItems?: CourseMenuItem[];
  catalogPlaceId?: number;
  rating?: number;
  reviewCount?: number;
  businessStatus?: string;
  googleAttribution?: string;
  walkingRouteSource?: string;
  walkingRouteNotice?: string;
  provider?: string;
  providerPlaceId?: string;
  sourceUrl?: string;
  instagramUrl?: string;
  reservationUrl?: string;
  reason: string;
  moveText: string;
  waitText: string;
  moodText: string;
  color: string;
  lat?: number | string;
  lng?: number | string;
  searchKeyword?: string;
  tags: string[];
  crowding?: CrowdingSnapshot;
}

export interface CoursePlan {
  constraintFailureCode?: string;
  requestedWindow?: { startAt: string; endAt: string; availableMinutes: number };
  accuracySummary?: AccuracySummary;
  id?: number | string;
  title: string;
  location: string;
  durationText: string;
  courseData: CoursePlace[];
  backupPlaces: CoursePlace[];
  message?: string;
  searchCourseId?: number | null;
  source?: 'api' | 'fallback';
  algorithmVersion?: string;
  analyticsSessionId?: string;
  catalogOnly?: boolean;
  partial?: boolean;
  adjustmentNotice?: string;
  failureReason?: 'no_candidates' | 'verification_failed' | 'unsupported_region' | 'server_error' | 'request_failed' | 'constraints_unmet' | 'invalid_conditions';
}

export interface SharedCourse {
  title: string;
  location: string;
  data: CoursePlace[];
}

export interface ExploreCourse {
  id: number;
  title: string;
  location?: string;
  location_dong?: string;
  course_data?: string | CoursePlace[];
  courseData?: CoursePlace[];
  likes?: number;
  views?: number;
  user_nick?: string;
  profileURL?: string;
  review_image?: string;
  review_text?: string;
  is_visited?: boolean;
  is_public?: boolean;
  published_at?: string;
  created_at?: string;
}

export interface MyPageSummary {
  name?: string;
  email?: string;
  phone?: string;
  travelStyle?: string;
  point?: number;
}
