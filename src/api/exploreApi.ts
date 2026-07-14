import { apiJson, getLoggedInUser } from './client';
import type { ExploreCourse } from '../types/noplan';

export async function fetchExploreCourses(sort: 'likes' | 'views' = 'likes') {
  try {
    const result = await apiJson<{ success?: boolean; courses?: ExploreCourse[] }>(
      `/api/course/explore/explore-courses?sort=${sort}`,
    );

    return result.success ? result.courses || [] : [];
  } catch {
    return [];
  }
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
