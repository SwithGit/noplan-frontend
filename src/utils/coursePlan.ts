import type { CoursePlace, CoursePlan, ExploreCourse } from '../types/noplan';

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function textValue(record: Record<string, unknown>, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return fallback;
}

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

export function normalizeCoursePlace(value: unknown, index: number): CoursePlace | null {
  const record = toRecord(value);
  const title = textValue(record, ['title', 'name', 'searchKeyword']);
  if (!title) return null;

  const galleryImages = Array.isArray(record.galleryImages)
    ? record.galleryImages.filter((image) => Boolean(toRecord(image).imageUrl)) as CoursePlace['galleryImages']
    : undefined;
  const menuItems = Array.isArray(record.menuItems)
    ? record.menuItems.filter((menu) => Boolean(toRecord(menu).name)) as CoursePlace['menuItems']
    : undefined;

  return {
    id: textValue(record, ['id'], `course-place-${index}`),
    time: textValue(record, ['time'], String(index + 1)),
    durationMinutes: numberValue(record.durationMinutes),
    scheduledStart: textValue(record, ['scheduledStart']) || undefined,
    scheduledEnd: textValue(record, ['scheduledEnd']) || undefined,
    title,
    name: textValue(record, ['name', 'title'], title),
    type: textValue(record, ['type'], 'activity'),
    detailType: textValue(record, ['detailType']) || undefined,
    isFranchise: Boolean(record.isFranchise),
    brandName: textValue(record, ['brandName']) || undefined,
    category: textValue(record, ['category', 'detailType', 'type'], '장소'),
    summary: textValue(record, ['summary', 'hanjul', 'description'], '코스에 포함된 장소예요.'),
    description: textValue(record, ['description', 'summary', 'hanjul'], '장소 정보를 확인해 보세요.'),
    address: textValue(record, ['address']) || undefined,
    hours: textValue(record, ['hours', 'businessHours']) || undefined,
    phone: textValue(record, ['phone']) || undefined,
    imageUrl: textValue(record, ['imageUrl', 'image_url', 'thumbnailUrl']) || undefined,
    galleryImages,
    menuItems,
    catalogPlaceId: numberValue(record.catalogPlaceId),
    rating: numberValue(record.rating),
    reviewCount: numberValue(record.reviewCount),
    businessStatus: textValue(record, ['businessStatus']) || undefined,
    googleAttribution: textValue(record, ['googleAttribution']) || undefined,
    provider: textValue(record, ['provider']) || undefined,
    providerPlaceId: textValue(record, ['providerPlaceId']) || undefined,
    sourceUrl: textValue(record, ['sourceUrl']) || undefined,
    instagramUrl: textValue(record, ['instagramUrl']) || undefined,
    reservationUrl: textValue(record, ['reservationUrl']) || undefined,
    reason: textValue(record, ['reason'], '코스의 흐름과 잘 맞는 장소예요.'),
    moveText: textValue(record, ['moveText'], index === 0 ? '출발지에서 이동' : '이전 장소에서 이동'),
    waitText: textValue(record, ['waitText'], '현장 확인'),
    moodText: textValue(record, ['moodText'], '코스 분위기'),
    color: textValue(record, ['color'], index % 2 === 0 ? '#eeecff' : '#f6edff'),
    lat: record.lat as number | string | undefined,
    lng: record.lng as number | string | undefined,
    searchKeyword: textValue(record, ['searchKeyword', 'name', 'title'], title),
    tags: Array.isArray(record.tags) ? record.tags.map(String).filter(Boolean) : [],
    crowding: record.crowding as CoursePlace['crowding'],
  };
}

export function parseExploreCoursePlaces(course: ExploreCourse) {
  const rawData = course.courseData ?? course.course_data;
  let parsed: unknown = rawData;

  if (typeof rawData === 'string') {
    try {
      parsed = JSON.parse(rawData);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsed)) return [];
  return parsed.map(normalizeCoursePlace).filter((place): place is CoursePlace => Boolean(place));
}

export function exploreCourseToPlan(course: ExploreCourse, label = '저장된 코스'): CoursePlan | null {
  const courseData = parseExploreCoursePlaces(course);
  if (!courseData.length) return null;

  const totalMinutes = courseData.reduce((sum, place) => sum + (place.durationMinutes || 0), 0);
  const duration = totalMinutes > 0
    ? `약 ${Math.max(1, Math.round(totalMinutes / 60))}시간`
    : `${courseData.length}곳`;

  return {
    id: course.id,
    title: course.title,
    location: course.location || '홍대입구 주변',
    durationText: `${courseData.length}곳 · ${duration} · ${label}`,
    courseData,
    backupPlaces: [],
    source: 'api',
  };
}

export function courseSearchText(course: ExploreCourse, places = parseExploreCoursePlaces(course)) {
  return [
    course.title,
    course.location,
    course.user_nick,
    ...places.flatMap((place) => [place.title, place.name, place.category, place.detailType, ...place.tags]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('ko-KR');
}
