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

export interface CoursePlace {
  id: string;
  time?: string;
  title: string;
  name: string;
  type: string;
  detailType?: string;
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
  course_data?: string | CoursePlace[];
  courseData?: CoursePlace[];
  likes?: number;
  views?: number;
  user_nick?: string;
  profileURL?: string;
  review_image?: string;
  review_text?: string;
  is_visited?: boolean;
  created_at?: string;
}

export interface MyPageSummary {
  name?: string;
  email?: string;
  phone?: string;
  travelStyle?: string;
  point?: number;
}
