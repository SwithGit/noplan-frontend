import { apiJson } from './client';
import type { ExploreCourse, MyPageSummary } from '../types/noplan';

export async function fetchUserInfo(userId: string) {
  try {
    const result = await apiJson<{ success?: boolean; user?: MyPageSummary }>(
      `/api/mypage/userinfo?id=${userId}`,
    );

    return result.success ? result.user || {} : {};
  } catch {
    return {};
  }
}

export async function fetchMyCourses(userId: string) {
  const fallback = { saved: [] as ExploreCourse[], recent: [] as ExploreCourse[] };

  try {
    const [savedData, recentData] = await Promise.all([
      apiJson<{ success?: boolean; courses?: ExploreCourse[] }>(
        `/api/mypage/saved-courses?userId=${userId}`,
      ),
      apiJson<{ success?: boolean; courses?: ExploreCourse[] }>(
        `/api/mypage/recent-courses?userId=${userId}`,
      ),
    ]);

    return {
      saved: savedData.success ? savedData.courses || [] : [],
      recent: recentData.success ? recentData.courses || [] : [],
    };
  } catch {
    return fallback;
  }
}
