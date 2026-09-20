# 여행 공유 · 공동 편집

일정 화면 상단 **공유 · 친구와 함께**에서 사용합니다. 공유 전에 로그인하고 계정에 일정을 저장합니다.

## 사용 흐름

- **일정 보기 링크**: 로그인 없이 전체 일정과 날짜별 지도를 볼 수 있습니다. 유효기간은 30일입니다. 최신 저장 내용을 보여주며 열린 화면은 새로고침하면 갱신됩니다.
- **함께 편집 초대**: 친구가 로그인한 뒤 참여하면 같은 여행을 편집합니다. 초대 유효기간은 7일이며 여행 소유자를 포함해 최대 20명입니다.
- 소유자는 각 종류의 링크를 따로 재발급하거나 취소할 수 있습니다. 편집 초대 취소는 이미 참여한 친구의 권한을 없애지 않습니다. 참여자 목록의 **제외**로 권한을 회수합니다.
- 공동 여행의 수정은 0.8초 후 자동 저장하고, 다른 사람의 변경은 화면이 활성화되어 있으면 3초 간격으로 확인합니다. 노피 코스플래닝을 열어도 동기화를 계속합니다.
- 서로 다른 항목은 자동 병합합니다. 같은 항목의 내용이 다르면 **충돌 해결**에서 내 수정 또는 친구 수정을 항목별로 선택합니다. 선택 중 새 버전이 오면 최신 내용으로 다시 선택합니다.
- 참여자의 접속 상태와 최근 30건의 변경 요약을 표시합니다. 상태는 15초 간격으로 갱신하며 마지막 접속 후 60초가 지나면 자리 비움으로 표시합니다. 변경 내역은 복원 기능이 아닙니다.

## 공개 범위

공개 링크는 제목·여행지·날짜·이동 방식·구간 제목과 시간·장소 이름 및 주소·좌표·머무는 시간·관광정보 식별자를 전달합니다. 개인 메모, 동행 조건, 계정 및 참여자 정보, 편집 권한, 내부 원본 링크는 전달하지 않습니다. 제목이나 장소 이름에 직접 입력한 내용은 공개됩니다.

링크 토큰은 브라우저 주소의 `#` 뒤에 담고 서버에는 POST 본문으로 전달합니다. 서버에는 토큰의 SHA-256 해시만 저장합니다. 보기 토큰으로 편집 초대에 참가할 수 없고 편집 토큰으로 공개 보기 API를 사용할 수도 없습니다.

## 배포 순서

1. 백엔드 저장소의 `sql/20260920_trip_sharing.sql`을 서비스 DB에 적용합니다. 신규 테이블 3개만 생성하며 기존 여행 데이터는 변경하지 않습니다. 런타임 계정에 CREATE 권한이 있으면 서버가 자동 생성하지만 사전 적용을 권장합니다.
2. 백엔드의 `routes/trips/collaboration.js`, `repository.js`, `router.js`를 포함해 배포하고 기존 PM2 절차로 재시작합니다. 신규 환경변수나 별도 API 키는 없습니다.
3. 프론트에서 `npm run build` 후 `dist`를 배포합니다. SPA 경로 `/app/trips/shared`와 `/app/trips/join` 직접 접속도 기존 index.html fallback으로 처리되어야 합니다.

프론트만 배포하면 신규 공유 API가 없어 동작하지 않습니다. 이 작업에서는 운영 DB 적용이나 배포를 실행하지 않았습니다.

## MySQL Workbench에서 1번 실행하기

1. Workbench에서 노플랜 운영 DB 연결을 엽니다.
2. 왼쪽 **SCHEMAS**에서 기존 `noplan_trips` 테이블이 들어 있는 DB 이름을 더블클릭합니다. 선택한 DB 이름이 굵게 표시됩니다.
3. 새 SQL 탭을 열고 아래 내용을 전부 붙여 넣습니다. 전체를 선택한 뒤 번개 버튼으로 실행합니다.
4. 마지막 결과에 테이블 이름 3개가 나오면 완료입니다. 왼쪽 테이블 목록은 새로고침하면 나타납니다.

기존 데이터를 삭제하는 쿼리는 없습니다. 이미 있는 테이블은 건너뜁니다. `No database selected` 오류는 2번의 DB 선택 후 다시 실행하면 됩니다.

```sql
CREATE TABLE IF NOT EXISTS noplan_trip_public_links (
    trip_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL UNIQUE,
    expires_at DATETIME NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS noplan_trip_activity (
    trip_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    version INT UNSIGNED NOT NULL, actor_id VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    summary JSON NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (trip_id, version)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS noplan_trip_presence (
    trip_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    user_id VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    editing TINYINT NOT NULL DEFAULT 0, seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (trip_id, user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- 생성 결과 확인: 테이블 이름 3개가 나와야 합니다.
SELECT TABLE_NAME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN (
    'noplan_trip_public_links',
    'noplan_trip_activity',
    'noplan_trip_presence'
  )
ORDER BY TABLE_NAME;
```

## 검증

### 공동 편집 충돌 수정 (2026-09-20)

- 같은 구간에서 각자 선택한 중심 장소는 구간 단위로 선택합니다. 더현대와 삼청각을 합쳐 한 구간에 저장하려던 문제를 수정했습니다.
- 같은 날짜의 전체 코스를 각각 재생성하거나, 합친 구간의 시간이 겹치면 코스 단위 충돌로 처리합니다. 다른 날짜와 구간의 독립적인 수정은 유지됩니다.
- 수정 충돌을 감지하면 팝업이 자동으로 열립니다. 닫아도 작업본은 유지되며 상단의 충돌 해결 버튼으로 다시 열 수 있습니다. 새로운 서버 버전이 도착하면 다시 안내합니다.
- 충돌 선택은 서버 저장 성공 후 완료됩니다. 저장 실패 시 팝업과 작업본을 유지하고 오류를 표시합니다. 제3자가 먼저 저장했다면 최신 내용을 다시 받아 선택합니다.
- 이전 버그로 중심 장소 두 개가 합쳐진 브라우저 작업본도 다시 열 때 복구 선택을 제공합니다.
- 이번 수정은 **프론트만 배포**합니다. 앞서 배포한 공유 백엔드와 DB 테이블은 그대로 사용합니다. 참여자 모두 새 프론트를 불러오도록 배포 후 새로고침합니다.
- `node --test tests/tripCollaboration.test.cjs tests/tripSync.test.cjs tests/tripOverview.test.cjs tests/tripDeletion.test.cjs`: 25개 통과. 실제 동기화 훅에 모의 서버와 타이머를 연결해 3인 동기화, 저장 실패, 제3자 수정 경쟁을 검증했습니다. 운영 브라우저 화면 검증은 포함하지 않습니다.

- 백엔드: `node --test tests/tripSharing.test.js tests/tripCollaboration.test.js tests/tripDeletion.test.js tests/trips.test.js` — 13개 통과. 실제 Express 라우터와 메모리 DB 경계 fixture로 검증했으며 운영 MySQL 연결 테스트는 아닙니다.
- 프론트: `node --test tests/tripCollaboration.test.cjs` — 10개 통과. 독립 변경, 항목별 충돌 선택, 삭제 대 수정, 순서 충돌, 노피 계획 중 다른 날짜 수정 병합을 확인했습니다.
- 전체 일정 보기·초안 삭제·로그인 후 여행 생성 회귀 테스트까지 포함해 프론트 총 23개가 통과했습니다. 초안 삭제 테스트의 누락된 locale 의존성 fixture도 보완했습니다.
- 프론트 프로덕션 빌드와 변경 파일 ESLint 완료. 기존 번들 크기 경고와 기존 ESLint 지시문 경고 1개가 남습니다.
- 화면 검증은 사용자 진행: 시크릿 창에서 보기 링크 열기 → 다른 계정으로 편집 초대 참가 → 각각 다른 날짜 수정 → 같은 제목 동시 수정 및 충돌 선택 → 링크 취소와 참여자 제외 순서로 확인할 수 있습니다.
