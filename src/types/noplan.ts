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
  rawText: string;
  location: string;
  locationLabel?: string;
  time: string;
  companion: string;
  mood: string;
  mainCategory: string;
  supportingCategories: string[];
  coreIntent: string;
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
  id: string;
  time?: string;
  durationMinutes?: number;
  scheduledStart?: string;
  scheduledEnd?: string;
  title: string;
  name: string;
  type: string;
  detailType?: string;
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
  failureReason?: 'no_candidates' | 'verification_failed' | 'unsupported_region' | 'server_error' | 'request_failed';
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
