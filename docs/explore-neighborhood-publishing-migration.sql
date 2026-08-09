-- NoPlan 동네 탐색 + 공개 코스 등록 1회성 마이그레이션
-- 적용 대상: saved_courses

ALTER TABLE saved_courses
  ADD COLUMN location_dong VARCHAR(50) NULL AFTER location,
  ADD COLUMN is_public TINYINT(1) NOT NULL DEFAULT 0 AFTER is_visited,
  ADD COLUMN published_at DATETIME NULL AFTER is_public,
  ADD INDEX idx_saved_courses_public_dong (is_public, location_dong, published_at);

-- 기존 탐색 화면에 노출되던 방문 완료 코스는 공개 코스로 유지한다.
UPDATE saved_courses
SET
  is_public = 1,
  published_at = COALESCE(published_at, created_at, NOW())
WHERE is_visited = 1;

-- 기존 홍대 권역 코스의 location 또는 course_data 주소에서 동 이름을 최대한 채운다.
-- MySQL 5.7/8.0에서 모두 실행할 수 있도록 CASE + LIKE만 사용한다.
UPDATE saved_courses
SET location_dong = CASE
  WHEN location LIKE '%연남동%' THEN '연남동'
  WHEN location LIKE '%동교동%' THEN '동교동'
  WHEN location LIKE '%서교동%' THEN '서교동'
  WHEN location LIKE '%합정동%' THEN '합정동'
  WHEN location LIKE '%상수동%' THEN '상수동'
  WHEN location LIKE '%창전동%' THEN '창전동'
  WHEN location LIKE '%망원동%' THEN '망원동'
  WHEN location LIKE '%성산동%' THEN '성산동'
  WHEN course_data LIKE '%연남동%' THEN '연남동'
  WHEN course_data LIKE '%동교동%' THEN '동교동'
  WHEN course_data LIKE '%서교동%' THEN '서교동'
  WHEN course_data LIKE '%합정동%' THEN '합정동'
  WHEN course_data LIKE '%상수동%' THEN '상수동'
  WHEN course_data LIKE '%창전동%' THEN '창전동'
  WHEN course_data LIKE '%망원동%' THEN '망원동'
  WHEN course_data LIKE '%성산동%' THEN '성산동'
  ELSE location_dong
END
WHERE location_dong IS NULL;

-- 확인용: 공개 코스 중 동 정보가 없는 데이터와 동별 개수를 확인한다.
SELECT COUNT(*) AS public_courses_without_dong
FROM saved_courses
WHERE is_public = 1
  AND (location_dong IS NULL OR location_dong = '');

SELECT location_dong, COUNT(*) AS course_count
FROM saved_courses
WHERE is_public = 1
GROUP BY location_dong
ORDER BY course_count DESC, location_dong;
