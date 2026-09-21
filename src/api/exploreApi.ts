import { apiJson, getLoggedInUser } from './client';
import type { CurrentPosition, ExploreCourse } from '../types/noplan';

export async function fetchExploreCourses(sort: 'likes' | 'views' | 'latest' = 'likes', area = '', position?: Pick<CurrentPosition, 'lat' | 'lng'> | null) {
  const params = new URLSearchParams({ sort });
  if (position) { params.set('lat', String(position.lat)); params.set('lng', String(position.lng)); }
  else if (area) params.set('area', area);
  const result = await apiJson<{ success?: boolean; courses?: ExploreCourse[] }>(
    `/api/course/explore/explore-courses?${params.toString()}`,
  );

  if (!result.success) throw new Error('코스를 불러오지 못했어요.');
  return result.courses || [];
}

export async function fetchHotCourses() {
  try {
    const result = await apiJson<{ success?: boolean; courses?: ExploreCourse[] }>(
      '/api/course/explore/hot-courses',
    );

    return result.success ? result.courses || [] : [];
  } catch {
    return [];
  }
}

export async function toggleCourseLike(courseId: number) {
  const user = getLoggedInUser();

  if (!user?.userId) throw new Error('로그인이 필요해요.');

  return apiJson<{ success?: boolean; liked?: boolean; currentLikes?: number }>(
    '/api/course/explore/toggle-like',
    {
      method: 'POST',
      body: JSON.stringify({ userId: user.userId, courseId }),
    },
  );
}

export async function publishExploreCourse(courseId: number, locationDong: string) {
  const user = getLoggedInUser();

  if (!user?.userId) throw new Error('로그인이 필요해요.');

  return apiJson<{ success?: boolean; locationDong?: string; message?: string }>(
    '/api/course/explore/publish-course',
    {
      method: 'POST',
      body: JSON.stringify({
        userId: user.userId,
        courseId,
        locationDong,
      }),
    },
  );
}
