import { apiJson, getLoggedInUser } from './client';
import type { CoursePlace, SharedCourse } from '../types/noplan';

export async function getSharedCourse(seq: number, type = 'saved') {
  const result = await apiJson<{
    success?: boolean;
    course?: { title: string; location: string; course_data: string | CoursePlace[] };
  }>(`/api/get-shared-course?seq=${seq}&type=${type}`);

  if (!result.success || !result.course) return null;

  const data =
    typeof result.course.course_data === 'string'
      ? JSON.parse(result.course.course_data)
      : result.course.course_data;

  return {
    title: result.course.title,
    location: result.course.location,
    data,
  } satisfies SharedCourse;
}

export async function saveCourse(title: string, location: string, courseData: CoursePlace[]) {
  const user = getLoggedInUser();

  if (!user?.userId) {
    throw new Error('로그인이 필요해요.');
  }

  return apiJson<{ success?: boolean; courseId?: number }>('/api/course/explore/save-course', {
    method: 'POST',
    body: JSON.stringify({
      userId: user.userId,
      title,
      location,
      courseData,
    }),
  });
}
