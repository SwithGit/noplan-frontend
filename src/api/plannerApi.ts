import { apiJson, getLoggedInUser } from './client';
import type { CoursePlace, CoursePlan, PlannerCondition } from '../types/noplan';

interface GenerateCourseResponse {
  success?: boolean;
  course?: Array<Record<string, unknown>>;
  backupPlaces?: Array<Record<string, unknown>>;
  searchCourseId?: number;
  message?: string;
  generator?: string;
  timeline?: {
    period?: string;
    startAt?: string;
    endAt?: string;
    endLabel?: string;
    targetCount?: number;
  };
}

export interface ParsedPlannerCondition {
  companion: string | null;
  duration: string | null;
  location: string | null;
  locationLabel: string | null;
  mood: string | null;
  time: string | null;
}

interface ParseConditionResponse {
  success?: boolean;
  parser?: 'openai' | 'fallback';
  condition?: ParsedPlannerCondition;
}

function normalizeParsedValue(value: unknown): string | null {
  const normalized = String(value ?? '').trim();
  return normalized && !/^(null|undefined)$/i.test(normalized) ? normalized : null;
}

const fallbackPlaces: CoursePlace[] = [
  {
    id: 'place-cafe',
    time: '1',
    title: '조용한 카페',
    name: '조용한 카페',
    type: 'cafe',
    category: '카페',
    summary: '대화하기 좋은 첫 장소',
    description: '동선이 짧고 오래 앉기 좋아서 첫 장소로 적당해요.',
    reason: '친구랑 이야기하기 좋고, 다음 장소까지 가까워.',
    moveText: '도보 6분',
    waitText: '낮음',
    moodText: '조용',
    color: '#E1F0FF',
    searchKeyword: '조용한 카페',
    tags: ['대화하기 좋음', '실내', '혼잡 낮음'],
  },
  {
    id: 'place-walk',
    time: '2',
    title: '가벼운 산책',
    name: '가벼운 산책',
    type: 'walk',
    category: '산책',
    summary: '비 오면 실내로 변경',
    description: '카페 다음에 부담 없이 걸을 수 있는 짧은 코스예요.',
    reason: '이동 부담이 적고 대화 흐름을 이어가기 좋아.',
    moveText: '도보 12분',
    waitText: '없음',
    moodText: '가벼움',
    color: '#E4F7ED',
    searchKeyword: '산책',
    tags: ['짧은 이동', '가벼운 코스'],
  },
];

function valueOf(source: Record<string, unknown>, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && String(value).trim()) return String(value);
  }

  return fallback;
}

function randomId(prefix: string) {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${id}`;
}

function getAnonymousUserId() {
  const storageKey = 'noplanAnonymousUserId';
  const saved = localStorage.getItem(storageKey);
  if (saved) return saved;
  const created = randomId('guest');
  localStorage.setItem(storageKey, created);
  return created;
}

function numberOf(value: unknown): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function normalizeGalleryImages(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry === 'string') return entry ? [{ imageUrl: entry }] : [];
    if (!entry || typeof entry !== 'object') return [];
    const image = entry as Record<string, unknown>;
    const imageUrl = valueOf(image, ['imageUrl', 'url', 'src']);
    if (!imageUrl) return [];
    return [{
      imageUrl,
      imageType: valueOf(image, ['imageType', 'type']),
      thumbnailUrl: valueOf(image, ['thumbnailUrl', 'thumbnail']),
      isPrimary: Boolean(image.isPrimary),
    }];
  });
}

function normalizeMenuItems(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const menu = entry as Record<string, unknown>;
    const name = valueOf(menu, ['name', 'title']);
    if (!name) return [];
    return [{
      name,
      menuCategory: valueOf(menu, ['menuCategory', 'category']),
      price: numberOf(menu.price),
      description: valueOf(menu, ['description']),
      imageUrl: valueOf(menu, ['imageUrl', 'image']),
      isSignature: Boolean(menu.isSignature),
    }];
  });
}

function normalizePlace(item: Record<string, unknown>, index: number): CoursePlace {
  const title = valueOf(item, ['title', 'name', 'searchKeyword'], fallbackPlaces[index % fallbackPlaces.length].title);
  const keyword = valueOf(item, ['searchKeyword', 'name', 'title'], title);
  const type = valueOf(item, ['type', 'category'], index === 0 ? 'cafe' : 'walk');
  const time = valueOf(item, ['time'], String(index + 1));
  const summary = valueOf(item, ['summary', 'hanjul'], valueOf(item, ['description'], index === 0 ? '대화하기 좋은 첫 장소' : '짧은 이동 코스'));
  const shouldShowTime = /^(오전|오후)\s*\d/.test(time);
  const category =
    type === 'food'
      ? '맛집'
      : type === 'cafe'
        ? '카페'
        : type === 'drink'
          ? '술집'
          : type === 'activity'
            ? '놀거리'
            : valueOf(item, ['category'], '코스');

  const galleryImages = normalizeGalleryImages(item.galleryImages);
  const imageUrl = valueOf(item, ['imageUrl'], galleryImages[0]?.imageUrl || '');
  const menuItems = normalizeMenuItems(item.menuItems);

  return {
    id: valueOf(item, ['catalogPlaceId', 'id'], `place-${index}-${keyword}`),
    time,
    title,
    name: keyword,
    type,
    category,
    summary: shouldShowTime ? `${time} · ${summary}` : summary,
    description: valueOf(item, ['description'], '조건에 맞춰 추천된 장소예요.'),
    address: valueOf(item, ['address']),
    hours: valueOf(item, ['hours', 'businessHours']),
    phone: valueOf(item, ['phone']),
    imageUrl: imageUrl || undefined,
    galleryImages,
    menuItems,
    catalogPlaceId: numberOf(item.catalogPlaceId),
    rating: numberOf(item.rating),
    reviewCount: numberOf(item.reviewCount),
    reason: valueOf(item, ['reason'], `${keyword}은 현재 조건과 잘 맞는 실제 후보예요.`),
    moveText: valueOf(item, ['moveText'], index === 0 ? '첫 장소' : '근처 이동'),
    waitText: valueOf(item, ['waitText'], '낮음'),
    moodText: valueOf(item, ['moodText'], index === 0 ? '조용' : '가벼움'),
    color: index % 3 === 0 ? '#E1F0FF' : index % 3 === 1 ? '#E4F7ED' : '#FFF0D8',
    lat: item.lat as number | string | undefined,
    lng: item.lng as number | string | undefined,
    searchKeyword: keyword,
    tags: Array.isArray(item.tags) ? item.tags.map(String) : [category, keyword, index === 0 ? '시작' : '근처'],
  };
}

export function makeFallbackPlan(condition: PlannerCondition): CoursePlan {
  const location = condition.location || '갈매동';

  return {
    title: `${location} 추천 코스`,
    location,
    durationText: '검증된 장소 없음',
    courseData: [],
    backupPlaces: [],
    message: '조건을 통과한 실제 장소를 찾지 못했어요.',
    searchCourseId: null,
    source: 'fallback',
  };
}

export async function extractLocation(text: string) {
  try {
    const result = await apiJson<{ location?: string }>('/api/course/generate/extract-location', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });

    return result.location || '';
  } catch {
    return '';
  }
}

export async function parsePlannerCondition(text: string): Promise<ParsedPlannerCondition | null> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 9000);

  try {
    const result = await apiJson<ParseConditionResponse>('/api/course/generate/parse-condition', {
      method: 'POST',
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    if (!result.success || result.parser !== 'openai' || !result.condition) return null;

    return {
      companion: normalizeParsedValue(result.condition.companion),
      duration: normalizeParsedValue(result.condition.duration),
      location: normalizeParsedValue(result.condition.location),
      locationLabel: normalizeParsedValue(result.condition.locationLabel),
      mood: normalizeParsedValue(result.condition.mood),
      time: normalizeParsedValue(result.condition.time),
    };
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function inferCompanionContext(condition: PlannerCondition) {
  void condition;
  return 'unspecified';
}

export async function generateCourse(condition: PlannerCondition): Promise<CoursePlan> {
  const user = getLoggedInUser();
  const fallback = makeFallbackPlan(condition);

  try {
    const result = await apiJson<GenerateCourseResponse>('/api/course/generate/generate-course', {
      method: 'POST',
      body: JSON.stringify({
        location: condition.location,
        startTime: condition.time,
        pax: condition.companion,
        purpose: condition.mood,
        duration: condition.duration,
        vibe: [...condition.extras, condition.rawText].filter(Boolean).join(', '),
        companionContext: inferCompanionContext(condition),
        userId: user?.userId || null,
      }),
    });

    if (!result.success || !Array.isArray(result.course) || result.course.length === 0) {
      return {
        ...fallback,
        message: result.message || '백엔드에서 추천 코스를 받지 못했어요.',
      };
    }

    const courseData = result.course.map(normalizePlace);
    const backupPlaces = Array.isArray(result.backupPlaces)
      ? result.backupPlaces.map(normalizePlace)
      : fallback.backupPlaces;

    const timelineEnd = result.timeline?.endLabel || (result.timeline?.endAt
      ? new Date(result.timeline.endAt).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })
      : null);

    return {
      title: `${condition.location || fallback.location} 맞춤 코스`,
      location: condition.location || fallback.location,
      durationText: timelineEnd
        ? `${courseData.length}곳 · ${timelineEnd}까지`
        : `${courseData.length}곳 · 백엔드 추천`,
      courseData,
      backupPlaces,
      searchCourseId: result.searchCourseId || null,
      source: 'api',
      algorithmVersion: result.generator || 'unknown',
    };
  } catch (error) {
    return {
      ...fallback,
      message: error instanceof Error ? `백엔드 연결 실패: ${error.message}` : fallback.message,
    };
  }
}

interface RecommendationEventInput {
  eventType: string;
  placeId?: number;
  placeRank?: number;
  courseSlot?: string;
  recommendationSnapshot?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

async function sendRecommendationEvents(
  sessionId: string,
  events: RecommendationEventInput[],
  options: {
    courseId?: number | string | null;
    conditionSnapshot?: PlannerCondition;
    algorithmVersion?: string;
  } = {},
) {
  const user = getLoggedInUser();
  return apiJson<{ success: boolean; recorded: number }>('/api/course/events', {
    method: 'POST',
    body: JSON.stringify({
      anonymousUserId: getAnonymousUserId(),
      userId: user?.userId || null,
      sessionId,
      courseId: options.courseId || null,
      conditionSnapshot: options.conditionSnapshot || null,
      algorithmVersion: options.algorithmVersion || null,
      events,
    }),
  });
}

export async function trackRecommendationImpressions(plan: CoursePlan, condition: PlannerCondition) {
  if (plan.source !== 'api' || plan.courseData.length === 0) return;
  const sessionId = randomId('recommendation');
  sessionStorage.setItem('noplanRecommendationSessionId', sessionId);
  await sendRecommendationEvents(
    sessionId,
    plan.courseData.map((place, index) => ({
      eventType: 'recommendation_impression',
      placeId: place.catalogPlaceId,
      placeRank: index + 1,
      courseSlot: place.time || String(index + 1),
      recommendationSnapshot: {
        name: place.name,
        type: place.type,
        category: place.category,
        reason: place.reason,
      },
    })),
    {
      courseId: plan.searchCourseId,
      conditionSnapshot: condition,
      algorithmVersion: plan.algorithmVersion,
    },
  );
}

export async function trackPlaceInteraction(
  eventType: 'place_detail_open' | 'map_open' | 'course_start' | 'place_replace' | 'gallery_open' | 'menu_view',
  place: CoursePlace,
  placeRank?: number,
) {
  const sessionId = sessionStorage.getItem('noplanRecommendationSessionId');
  if (!sessionId) return;
  await sendRecommendationEvents(sessionId, [{
    eventType,
    placeId: place.catalogPlaceId,
    placeRank,
    courseSlot: place.time,
    metadata: { name: place.name, type: place.type },
  }]);
}
