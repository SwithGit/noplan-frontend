# NoPlan 성수 장소 수집·공공데이터·메뉴 보강 개발 전달서

- 문서 상태: 개발 실행 기준
- 작성일: 2026-08-18
- Frontend: `D:\VSCode\NoPlan\noplan-web`
- Backend: `D:\Backend\NoPlan`
- 대상 화면: 관리자 장소 수집·검수 페이지
- 대상 지역: 성수역·뚝섬·서울숲 인접권 1차 테스트
- 전제: Apify, 서울관광재단 레드테이블, 소상공인 상가정보, 행정안전부 일반음식점 API의 사용 준비와 활용신청은 완료됨
- 이 문서 하나를 이번 기능의 개발 기준으로 사용한다.

## 1. 개발 페이지에 전달할 최종 요청

Frontend와 Backend의 현재 코드 및 `git status`를 먼저 확인하고, 기존 사용자 변경을 보존한 상태에서 이 문서의 요구사항을 실제로 구현한다.

기획 문서나 예시 코드만 추가하지 말고 다음을 완료한다.

- 관리자 화면에서 성수 지역 선택 및 반경 설정
- 기존 Apify 카카오 후보 수집과 네이버 교차검증 유지
- 서울관광재단 레드테이블 식당·메뉴 데이터 동기화
- 소상공인 상가정보와 행정안전부 일반음식점 데이터 교차검증
- 외부 장소와 NoPlan 후보의 안전한 매칭
- 자동 메뉴를 후보 검수 화면에 표시하고 승인 데이터로 복사
- idempotent DB 마이그레이션
- 외부 API 장애·키 누락·호출 제한 격리
- Backend 자동 테스트와 전체 테스트
- Frontend TypeScript 빌드 및 가능하면 lint
- 성수 샘플 결과와 데이터 커버리지 보고

사용자가 요청하지 않는 한 커밋하거나 푸시하지 않는다.

## 2. 이미 구현된 기능과 이번 작업의 경계

다음 기능은 이미 구현되어 있으므로 새로 설계하거나 다른 수집 방식으로 교체하지 않는다.

1. Apify의 카카오 지도 Actor로 장소 후보와 별점·후기 수 수집
2. 최소 별점과 최소 후기 수 필터
3. Apify의 네이버 지도 Actor를 이용한 실제 존재 여부 교차검증
4. 장소명·주소·좌표를 이용한 카카오/네이버 매칭
5. 관리자 검수함, 후보 수정, 승인, 제외
6. 후보 승인 시 `noplan_places`와 이미지·메뉴 테이블로 복사
7. 장소 분류, 핵심 목적, 분위기, 편의시설, 동행 적합도 입력

현재 주요 파일:

```text
Frontend
src/api/adminPlacesApi.ts
src/pages/admin/PlaceAdmin.tsx

Backend
routes/admin/places.js
routes/admin/placeCatalogSchema.js
routes/admin/placeClassification.js
```

현재 Backend에는 성수 지역이 이미 존재한다.

```js
seongsu: { label: '성수역', lat: 37.544581, lng: 127.055961 }
```

현재 Frontend의 `RegionKey`도 `hongdae | seongsu`를 지원하지만 `REGION_OPTIONS`에는 홍대만 노출되어 있다.

이번 작업은 기존 1·2단계를 다시 만드는 작업이 아니다. 성수 지역을 관리자 화면에 열고, 통과한 후보에 공공정보와 메뉴를 보강하는 작업이다.

## 3. 확정된 성수 테스트 정책

### 3.1 기본 수집값

```text
지역: seongsu
기준점: 성수역 37.544581, 127.055961
기본 반경: 1,800m
허용 반경: 500~5,000m
최소 별점: 3.5
최소 후기: 10
1회 목표 후보: 음식 50, 카페 30 권장
```

현재 Frontend의 최소 후기 기본값 30은 10으로 변경한다.

현재 `collect-apify` Backend 기본 반경은 2,500m이고 Frontend가 `radius`를 보내지 않는다. 성수 테스트에서는 Frontend가 명시적으로 1,800m를 보내도록 한다. 홍대의 기존 동작은 회귀시키지 않는다.

### 3.2 데이터 역할

| 단계 | 데이터 원천 | 역할 |
|---|---|---|
| 1 | Apify 카카오 지도 | 후보, 별점, 후기 수, 기본 장소정보 |
| 2 | Apify 네이버 지도 | 실제 존재 여부 교차검증 |
| 3 | 소상공인 상가정보 | 상호·업종·주소·좌표·외부 상가 ID 교차검증 |
| 4 | 행정안전부 일반음식점 | 인허가·정상영업·폐업 상태 확인 |
| 5 | 서울관광재단 레드테이블 | 식당 ID, 메뉴명, 가격, 설명, 대표 메뉴 보강 |
| 최종 | 관리자 | 오매칭 검수, 분류 보완, 승인·제외 |

공공데이터가 Apify 후보를 대체하지 않는다. Apify/네이버를 통과한 후보를 보강하는 용도로 사용한다.

## 4. 명시적 제외 범위

- 사용자용 홈·검색·탐색·코스·마이 화면의 성수 서비스 공개
- 추천 알고리즘의 전국 또는 서울 전역 확장
- 성수 혼잡도 권역 추가
- POS 업체와의 실제 B2B 계약
- 네이버·카카오 화면 HTML을 새로 크롤링하는 기능
- Google Places 데이터를 영구 장소 DB로 복제하는 기능
- 자동 장소 승인
- 외부 API에서 받은 이미지를 사용자 화면에 자동 게시
- 정기 스케줄러나 별도 작업 큐 인프라 구축

이번 결과는 관리자 수집·검수 기능의 성수 데이터 테스트까지다. 사용자 서비스에 성수를 노출하지 않는다.

## 5. API 키와 보안 처리

실제 키 값은 사용자가 Backend `.env` 또는 배포 환경변수에 직접 입력한다. 개발자는 키 값을 코드, 문서, fixture, 로그, API 응답, Git 이력에 기록하지 않는다.

권장 환경변수:

```env
# 기존
APIFY_API_TOKEN=
KAKAO_REST_API_KEY=
NOPLAN_ADMIN_KEY=

# 신규: 서울관광재단 레드테이블
REDTABLE_SEOUL_API_KEY=
REDTABLE_SEOUL_ENABLED=true

# 신규: 공공데이터포털
PUBLIC_DATA_SERVICE_KEY=
SBIZ_PLACE_DATA_ENABLED=true
GENERAL_RESTAURANT_DATA_ENABLED=true

# 선택적 개별 키 override. 비어 있으면 PUBLIC_DATA_SERVICE_KEY 사용
SBIZ_PLACE_DATA_SERVICE_KEY=
GENERAL_RESTAURANT_SERVICE_KEY=

# 외부 요청 공통
PLACE_DATA_REQUEST_TIMEOUT_MS=10000
PLACE_DATA_MAX_RETRIES=2
PLACE_DATA_CACHE_TTL_MS=86400000
```

키 값은 URL이 포함된 오류 로그에도 노출하면 안 된다. `serviceKey`, `token`, `Authorization`은 로그 전에 제거한다.

관리자 health/status 응답에는 키 값 대신 다음만 반환한다.

```json
{
  "redtableConfigured": true,
  "sbizConfigured": true,
  "generalRestaurantConfigured": true
}
```

## 6. 외부 API 원문 기준

개발 전에 각 서비스의 현재 활용가이드를 다시 확인하고 실제 응답 fixture를 확보한다. 아래 경로와 역할을 기준으로 구현하되, 제공기관이 파라미터명을 변경한 경우 최신 공식 명세를 우선한다.

### 6.1 서울관광재단 레드테이블

Base URL:

```text
https://seoul.openapi.redtable.global
```

이번 작업에 사용하는 API:

```text
GET /api/rstr?serviceKey={KEY}&pageNo={PAGE}
GET /api/menu/korean?serviceKey={KEY}&pageNo={PAGE}
GET /api/menu-dscrn/korean?serviceKey={KEY}&pageNo={PAGE}
GET /api/rstr/oprt?serviceKey={KEY}&pageNo={PAGE}
```

핵심 필드:

```text
식당
RSTR_ID
RSTR_NM
RSTR_RDNMADR
RSTR_LNNO_ADRES
RSTR_LA
RSTR_LO
RSTR_TELNO
BSNS_STATM_BZCND_NM
BSNS_LCNC_NM

메뉴
MENU_ID
MENU_NM
MENU_PRICE
SPCLT_MENU_YN
SPCLT_MENU_NM
RSTR_ID
RSTR_NM

운영
RSTR_ID
BSNS_TM_CN
RESTDY_INFO_CN
RSRV_MTHD_NM
ONLINE_RSRV_INFO_CN
REPRSNT_MENU_NM
```

API는 식당명을 직접 조회하는 검색 API가 아니라 페이지 목록 API다. 매 후보마다 전체 API를 다시 호출하면 안 된다. 전체 식당을 먼저 로컬 staging에 동기화한 뒤 `RSTR_ID`로 메뉴를 연결한다.

메뉴 전체 데이터가 큰 경우 다음 규칙을 사용한다.

1. 식당 기본정보를 먼저 동기화한다.
2. 주소가 `서울특별시 성동구`이고 성수역 기준 1,800m 안인 `RSTR_ID` 집합을 만든다.
3. 메뉴 페이지는 순회하되 위 `RSTR_ID`에 해당하는 행만 저장한다.
4. `header.totalCount`, `header.numOfRows`, `header.pageNo`로 마지막 페이지를 계산한다.
5. 중단 후 재실행해도 이어서 처리하거나 처음부터 안전하게 upsert한다.

포털의 오래된 수정일 때문에 `실시간`이라는 표기만 신뢰하지 않는다. 실제 응답의 메뉴 가격과 현재 공개 메뉴를 표본 비교하고 결과를 보고한다.

### 6.2 소상공인시장진흥공단 상가정보

Base URL:

```text
https://apis.data.go.kr/B553077/api/open/sdsc2
```

성수에는 공식 활용가이드의 `storeListInRadius`를 사용한다.

```text
중심 경도: 127.055961
중심 위도: 37.544581
반경: 1800m
응답 형식: JSON
```

최신 공식 명세의 요청 파라미터명과 JSON 구조를 fixture로 고정한다. 상가업소번호, 상호명, 지점명, 업종명, 지번주소, 도로명주소, 경도, 위도를 정규화한다.

이 공급자는 메뉴를 제공하지 않는다. 후보 존재·주소·업종 검증과 외부 상가 ID 저장에만 사용한다.

### 6.3 행정안전부 일반음식점

Base URL:

```text
https://apis.data.go.kr/1741000/general_restaurants
```

사용 API:

```text
GET /info
GET /history
```

`/info`는 현재 영업상태 검증에 사용하고 `/history`는 이번 1차에서는 선택사항이다.

좌표는 WGS84가 아닌 EPSG:5174일 수 있으므로 그대로 NoPlan 위경도와 거리 비교하지 않는다. 다음 중 하나를 적용한다.

- 공식 좌표계에 맞게 WGS84로 변환 후 비교
- 1차에서는 상호명·전화번호·도로명주소로만 매칭

임의로 EPSG:5174 값을 위도·경도로 간주하면 안 된다.

## 7. Backend 권장 구조

현재 `routes/admin/places.js`가 더 커지지 않도록 외부 데이터 책임을 분리한다.

```text
routes/admin/placeData/
├─ externalDataService.js
├─ placeMatcher.js
├─ normalizeExternalPlace.js
└─ providers/
   ├─ redtableProvider.js
   ├─ sbizPlaceProvider.js
   └─ generalRestaurantProvider.js

scripts/
└─ syncSeongsuPlaceData.js
```

Provider는 외부 원본 응답을 그대로 route나 Frontend에 전달하지 않는다.

권장 공통 결과:

```js
{
  provider: 'redtable_seoul',
  providerPlaceId: '1234',
  name: '가게명',
  normalizedName: '가게명',
  phone: '0212345678',
  roadAddress: '서울특별시 성동구 ...',
  address: '서울특별시 성동구 ...',
  latitude: 37.0,
  longitude: 127.0,
  businessStatus: 'open',
  businessType: '일반음식점',
  fetchedAt: 'ISO-8601',
  rawPayload: {}
}
```

외부 API 실패는 기존 Apify 후보 수집, 후보 조회, 수정, 승인 기능을 실패시키면 안 된다.

## 8. DB 마이그레이션

`routes/admin/placeCatalogSchema.js`의 현재 idempotent 방식을 유지한다. 서버를 여러 번 시작해도 중복 테이블·컬럼 오류가 발생하면 안 된다.

### 8.1 외부 장소 staging

```sql
CREATE TABLE IF NOT EXISTS noplan_external_places (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  provider VARCHAR(50) NOT NULL,
  provider_place_id VARCHAR(160) NOT NULL,
  name VARCHAR(255) NOT NULL,
  normalized_name VARCHAR(255) NOT NULL,
  branch_name VARCHAR(120) NULL,
  phone VARCHAR(80) NULL,
  normalized_phone VARCHAR(40) NULL,
  address VARCHAR(500) NULL,
  road_address VARCHAR(500) NULL,
  latitude DECIMAL(10, 7) NULL,
  longitude DECIMAL(10, 7) NULL,
  business_status VARCHAR(80) NULL,
  business_type VARCHAR(120) NULL,
  region_key VARCHAR(50) NULL,
  raw_payload LONGTEXT NULL,
  source_updated_at DATETIME NULL,
  fetched_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_external_place_provider_id (provider, provider_place_id),
  KEY idx_external_place_region_name (region_key, normalized_name),
  KEY idx_external_place_phone (normalized_phone),
  KEY idx_external_place_coordinates (latitude, longitude)
);
```

### 8.2 외부 메뉴 staging

```sql
CREATE TABLE IF NOT EXISTS noplan_external_menu_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  provider VARCHAR(50) NOT NULL,
  provider_place_id VARCHAR(160) NOT NULL,
  provider_menu_id VARCHAR(160) NOT NULL,
  name VARCHAR(255) NOT NULL,
  menu_category VARCHAR(120) NULL,
  price INT NULL,
  price_text VARCHAR(120) NULL,
  description TEXT NULL,
  is_signature TINYINT(1) NOT NULL DEFAULT 0,
  raw_payload LONGTEXT NULL,
  fetched_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_external_menu_provider_id (provider, provider_menu_id),
  KEY idx_external_menu_place (provider, provider_place_id)
);
```

### 8.3 후보와 외부 장소 매칭

```sql
CREATE TABLE IF NOT EXISTS noplan_candidate_external_matches (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  candidate_id BIGINT UNSIGNED NOT NULL,
  provider VARCHAR(50) NOT NULL,
  provider_place_id VARCHAR(160) NOT NULL,
  match_status VARCHAR(30) NOT NULL,
  match_method VARCHAR(60) NULL,
  match_confidence DECIMAL(4, 3) NULL,
  distance_m INT NULL,
  metadata JSON NULL,
  reviewed_by VARCHAR(100) NULL,
  reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_candidate_external_provider (candidate_id, provider),
  KEY idx_candidate_external_status (provider, match_status),
  CONSTRAINT fk_candidate_external_candidate
    FOREIGN KEY (candidate_id) REFERENCES noplan_place_candidates(id) ON DELETE CASCADE
);
```

`match_status` 허용값:

```text
matched
review_required
not_found
rejected
error
```

### 8.4 동기화 실행상태

Provider별 마지막 페이지와 실행 결과를 기록하는 작은 테이블을 추가한다.

```text
provider
region_key
resource_type
status
last_page
total_count
processed_count
error_count
started_at
finished_at
last_error
```

키나 인증 URL은 기록하지 않는다.

### 8.5 후보 메뉴 출처 필드

기존 `noplan_candidate_menu_items`에 다음 컬럼을 idempotent하게 추가한다.

```text
source_place_id VARCHAR(160) NULL
source_menu_id VARCHAR(160) NULL
match_confidence DECIMAL(4, 3) NULL
last_verified_at DATETIME NULL
```

승인 메뉴 테이블 `noplan_place_menu_items`에도 동일 출처 ID와 신뢰도 필드를 복사할 수 있도록 추가한다.

자동 메뉴의 source 값:

```text
redtable_seoul
```

## 9. 외부 장소 매칭 규칙

문자열 정규화:

- HTML 태그 제거
- 앞뒤 공백 제거
- 소문자화 가능한 문자는 소문자화
- 공백·구두점·괄호 제거
- `서울특별시`와 `서울` 표현 통일
- 전화번호는 숫자만 남김
- 본점·지점·성수점 같은 지점명은 별도 토큰으로 보존

매칭 우선순위:

| 조건 | 처리 | 권장 신뢰도 |
|---|---|---:|
| 전화번호 완전일치 + 상호명 호환 | 자동 매칭 | 1.000 |
| 정규화 상호명 완전일치 + 도로명주소 핵심 토큰 일치 | 자동 매칭 | 0.970 |
| 정규화 상호명 완전일치 + 좌표 50m 이내 | 자동 매칭 | 0.950 |
| 상호명 부분일치 + 주소 일치 또는 좌표 100m 이내 | 관리자 검수 | 0.800~0.899 |
| 동일 이름 후보가 둘 이상 | 관리자 검수 | 계산값 표시 |
| 주소·전화·좌표가 모두 충돌 | 매칭하지 않음 | 0 |

자동 매칭 최소값은 0.920으로 한다. 자동 매칭 조건을 충족하지 못하면 메뉴를 후보에 바로 복사하지 않는다.

프랜차이즈는 이름만으로 자동 매칭하지 않는다. 지점명, 주소 또는 전화번호가 반드시 일치해야 한다.

행정안전부 데이터에서 폐업·영업종료로 확인되면 다음처럼 처리한다.

- 후보를 자동 삭제하지 않는다.
- 외부 검증 상태를 `closed`로 표시한다.
- 관리자 화면에 강한 경고를 표시한다.
- 승인 시 확인 경고를 추가하되 기존 승인 API를 무조건 막지는 않는다.

## 10. 메뉴 복사와 갱신 규칙

데이터 우선순위:

```text
관리자 직접 확인(manual/team_upload)
→ 점주·가맹점 제공(merchant_upload/owner_upload)
→ 서울관광재단 레드테이블(redtable_seoul)
```

규칙:

1. 수동·팀·점주 메뉴를 자동 메뉴가 덮어쓰거나 삭제하지 않는다.
2. 동일 `source + source_menu_id`는 upsert한다.
3. 동일한 이름과 가격의 자동 메뉴는 중복 생성하지 않는다.
4. 재동기화에서 사라진 메뉴를 즉시 삭제하지 않고 미확인 또는 품절 상태로 표시한다.
5. 가격 0, 음수, 비정상 문자열은 숫자 가격으로 저장하지 않고 `price_text`에 보존한다.
6. 메뉴명 없는 항목은 저장하지 않는다.
7. 자동 메뉴의 출처와 마지막 확인일을 관리자에게 표시한다.
8. 후보 승인 시 출처 ID, 신뢰도, 마지막 확인일까지 승인 메뉴로 복사한다.

현재 후보 목록과 상세 조회는 다음 source만 노출한다.

```text
manual
team_upload
merchant_upload
owner_upload
```

여기에 `redtable_seoul`을 추가해야 한다. 단, 외부 이미지는 이번 작업에서 허용 목록에 추가하지 않는다.

## 11. Backend API 계약

기존 API는 유지하고 다음 관리자 API를 추가한다. 모두 기존 `requireAdmin` 인증을 사용한다.

### 11.1 외부 데이터 상태

```text
GET /api/admin/places/external-data/status?regionKey=seongsu
```

응답 예시:

```json
{
  "success": true,
  "configured": {
    "redtable": true,
    "sbiz": true,
    "generalRestaurant": true
  },
  "sync": [
    {
      "provider": "redtable_seoul",
      "resourceType": "menus",
      "status": "completed",
      "processedCount": 1200,
      "finishedAt": "2026-08-18T00:00:00.000Z"
    }
  ]
}
```

### 11.2 후보 한 건 보강

```text
POST /api/admin/places/candidates/:id/enrich-public-data
```

처리 순서:

1. staging에서 Redtable 매칭
2. staging 또는 API에서 소상공인 상가 매칭
3. 일반음식점 영업상태 매칭
4. 자동 매칭이면 Redtable 메뉴를 후보 메뉴로 upsert
5. 애매하면 후보는 수정하지 않고 검수용 match만 반환

응답 예시:

```json
{
  "success": true,
  "matches": {
    "redtable": { "status": "matched", "confidence": 0.97, "menuCount": 8 },
    "sbiz": { "status": "matched", "confidence": 0.95 },
    "generalRestaurant": { "status": "matched", "businessStatus": "open" }
  },
  "importedMenuCount": 8,
  "reviewRequired": false
}
```

### 11.3 후보 일괄 보강

```text
POST /api/admin/places/candidates/enrich-public-data
```

요청 예시:

```json
{
  "regionKey": "seongsu",
  "status": "pending",
  "candidateIds": [1, 2, 3]
}
```

한 번에 최대 100건으로 제한한다. 후보 하나의 실패 때문에 전체 요청을 롤백하지 않고 후보별 결과를 반환한다.

### 11.4 수동 매칭 확정·거절

```text
POST /api/admin/places/candidates/:id/external-match
```

요청 예시:

```json
{
  "provider": "redtable_seoul",
  "providerPlaceId": "1234",
  "action": "confirm"
}
```

`confirm` 시 메뉴를 후보로 복사하고 `reject` 시 해당 provider 후보를 거절 상태로 저장한다.

## 12. 동기화 실행 방식

레드테이블 전체 페이지 동기화를 일반 후보 상세 API 안에서 실행하지 않는다. 요청시간과 호출량이 너무 커질 수 있다.

1차 구현은 idempotent CLI 스크립트를 제공한다.

```text
node scripts/syncSeongsuPlaceData.js --provider=redtable --resource=places
node scripts/syncSeongsuPlaceData.js --provider=redtable --resource=menus
node scripts/syncSeongsuPlaceData.js --provider=sbiz
```

스크립트 요구사항:

- `.env` 사용
- 키 마스킹
- 시작·완료·페이지·저장·건너뜀·오류 수 출력
- `--page`, `--max-pages`, `--resume` 지원 또는 동등한 재개 방식
- 실패 후 재실행 안전
- 성수 대상만 저장
- dry-run 또는 실제 저장 전 표본 출력 기능 제공

행정안전부 일반음식점은 전체 전국 데이터를 무조건 저장하지 않는다. 성수 후보에 필요한 항목만 조회·매칭하거나, 성동구 정상영업 데이터만 staging한다.

정기 실행과 운영 스케줄러는 커버리지 검증 후 별도 작업으로 남긴다.

## 13. Frontend 변경

### 13.1 지역 선택

`PlaceAdmin.tsx`의 지역 선택에 다음을 추가한다.

```ts
{ key: 'seongsu', label: '성수역' }
```

지역 변경 시 후보 페이지, 선택 후보, 알림 상태를 안전하게 초기화하고 해당 지역의 검수함과 커버리지를 다시 불러온다.

### 13.2 수집 입력

`adminPlacesApi.ts`의 `collectApifyCandidates` 입력에 `radius`를 추가한다.

```ts
{
  regionKey: RegionKey;
  query: string;
  targetCount: number;
  minRating: number;
  minReviewCount: number;
  radius: number;
}
```

관리자 화면에 검색 반경 필드를 추가한다.

```text
1.0km
1.5km
1.8km
2.5km
```

성수 기본값은 1.8km다. 최소 후기 기본값은 10으로 변경한다.

### 13.3 외부 데이터 상태와 보강 버튼

관리자 상단 또는 수집 섹션에 다음을 표시한다.

```text
레드테이블: 연결됨 · 마지막 동기화 시각
상가정보: 연결됨
일반음식점: 연결됨
```

키 값은 표시하지 않는다.

후보 상세에 다음 버튼을 추가한다.

```text
공공데이터 확인 및 메뉴 불러오기
```

검수함에는 선택 후보 또는 현재 페이지 후보에 적용할 수 있는 일괄 보강 기능을 제공할 수 있다. 일괄 실행 전 대상 건수를 보여준다.

### 13.4 후보 상세 표시

외부 매칭 상태:

```text
레드테이블 일치 97%
상가정보 일치 95%
일반음식점 정상 영업
```

애매한 경우:

```text
확인 필요
후보 외부 식당명
주소
전화번호
거리
[이 가게가 맞음] [아님]
```

메뉴에는 출처 배지를 표시한다.

```text
닭구이 18,000원
서울관광재단 · 최근 확인 2026-08-18
```

자동 메뉴도 수정·삭제할 수 있지만, 수정한 메뉴는 원본 자동 동기화에 다시 덮이지 않도록 `manual` 또는 별도의 수동 override로 전환한다.

### 13.5 기존 UX 보호

- 기존 후보 수집 버튼과 네이버 검증 결과 문구를 유지한다.
- 이미지 영역의 `팀 소유 자료만` 정책을 유지한다.
- 이미지·메뉴가 없어도 기존 필수 분류와 좌표가 있으면 승인 가능한 정책을 유지한다.
- 자동 메뉴가 없거나 외부 API가 실패해도 후보 수정·승인은 가능해야 한다.
- 홍대 검수함과 승인 데이터는 변경하거나 재동기화하지 않는다.

## 14. 오류·호출량·재시도 정책

| 상황 | 처리 |
|---|---|
| 키 없음 | Provider 비활성 표시, 기존 관리자 기능 정상 |
| 401/403 | 키 값 제거 후 설정 오류 기록 |
| 429 | 지수 backoff, `Retry-After` 우선, 최대 재시도 제한 |
| timeout | 해당 provider만 error, 다른 provider 계속 진행 |
| JSON 구조 변경 | 명확한 parser 오류와 fixture 갱신 필요 메시지 |
| 일부 페이지 실패 | 실행 상태에 마지막 성공 페이지 기록 |
| 후보 1건 매칭 실패 | `not_found`, 기존 후보 유지 |
| 메뉴 0건 | 정상 결과로 취급, 메뉴 없음 표시 |

외부 원본 응답을 Frontend로 통째로 전달하지 않는다. 관리자 검수에 필요한 정규화 필드만 반환한다.

## 15. 테스트 요구사항

Backend `node:test` 구조를 사용한다.

권장 테스트:

```text
tests/placeDataProviders.test.js
tests/placeMatcher.test.js
tests/placeMenuEnrichment.test.js
tests/fixtures/place-data/redtable-restaurants.json
tests/fixtures/place-data/redtable-menus.json
tests/fixtures/place-data/sbiz-radius.json
tests/fixtures/place-data/general-restaurants.json
```

필수 케이스:

- 레드테이블 정상 페이지·빈 페이지·오류 응답 정규화
- 상가정보 정상 응답과 응답 구조 오류
- 일반음식점 정상영업·폐업 정규화
- 전화번호 완전일치 자동 매칭
- 상호명+주소 자동 매칭
- 프랜차이즈 지점 오매칭 방지
- 이름 부분일치 검수 대기
- EPSG:5174 좌표를 WGS84처럼 비교하지 않음
- 같은 메뉴 재수집 시 중복 없음
- 자동 메뉴가 수동 메뉴를 덮어쓰지 않음
- 외부 API 실패 시 기존 후보 API 정상
- 성수 반경 1,800m 밖 후보 제외
- 홍대 지역 수집 회귀 없음

실제 응답 fixture에는 키, 토큰, 개인식별정보, 불필요한 전체 원문을 넣지 않는다.

검증 명령:

```text
Backend
npm test

Frontend
npm run build
npm run lint
```

lint에 기존 오류가 있으면 이번 변경으로 생긴 오류와 기존 오류를 구분해 보고한다.

## 16. 성수 실데이터 검증 절차

키가 설정된 환경에서 다음 순서로 실제 검증한다.

1. 성수 `맛집`, 별점 3.5, 후기 10, 반경 1.8km, 목표 50으로 수집
2. 성수 `카페`, 동일 기준, 목표 30으로 수집
3. 카카오 원본 수, 네이버 확인 수, 기준 미달·반경 밖·중복·미확인 수 기록
4. 레드테이블 식당과 메뉴 staging 동기화
5. 소상공인 상가정보 반경 동기화
6. 후보 80건 공공데이터 보강
7. 자동 매칭·검수 필요·미발견 건수 기록
8. 메뉴 1개 이상 확보된 가게 수 기록
9. 메뉴 가격 존재 비율 기록
10. 무작위 10개 가게를 현재 공개 메뉴와 사람이 비교
11. 폐업·이전·주소 충돌 후보 기록
12. 관리자 승인 1~3건으로 후보 메뉴가 승인 메뉴로 복사되는지 확인

테스트 결과에 다음 지표를 포함한다.

```text
Apify 후보 수
네이버 통과율
Redtable 식당 매칭률
Redtable 메뉴 확보율
메뉴 가격 보유율
상가정보 매칭률
일반음식점 영업상태 매칭률
관리자 검수 필요율
표본 메뉴 정확도
외부 API 호출 수와 대략적 실행시간
```

## 17. 완료 기준

다음을 모두 충족해야 완료다.

- 관리자 화면에서 홍대와 성수를 전환할 수 있다.
- 성수 기본 반경 1.8km와 최소 후기 10이 실제 Backend 요청에 반영된다.
- 기존 Apify 카카오·네이버 검증 흐름이 유지된다.
- 세 외부 데이터 Provider가 서로 격리되어 동작한다.
- 레드테이블 식당·메뉴가 staging에 중복 없이 저장된다.
- 높은 신뢰도의 외부 매칭만 자동 메뉴 복사가 된다.
- 애매한 매칭은 관리자 확인 전 메뉴를 복사하지 않는다.
- 자동 메뉴가 관리자 상세 화면에 출처와 함께 보인다.
- 자동 메뉴가 수동·점주 메뉴를 덮어쓰지 않는다.
- 외부 이미지가 자동 게시되지 않는다.
- 폐업·주소 충돌 경고가 보인다.
- 외부 API가 모두 실패해도 기존 후보 검수와 승인이 가능하다.
- DB 마이그레이션을 반복 실행해도 안전하다.
- Backend 전체 테스트가 통과한다.
- Frontend 빌드가 통과한다.
- 성수 실데이터 커버리지 결과가 수치로 보고된다.

## 18. 최종 보고 형식

개발 완료 후 다음 순서로 보고한다.

1. 구현한 기능 요약
2. Frontend 변경 파일
3. Backend 변경 파일
4. 추가·변경된 DB 테이블과 컬럼
5. 환경변수 이름과 설정 여부만 보고하며 값은 숨김
6. 테스트·빌드 결과
7. 성수 실데이터 수집 결과와 커버리지
8. 메뉴 표본 정확도
9. 남은 문제와 다음 권장 단계

API 키 값, 토큰이 포함된 URL, 전체 원본 응답은 보고하지 않는다.

## 19. 공식 참고 링크

- 서울관광재단 레드테이블 API: `https://seoul.openapi.redtable.global/`
- 레드테이블 OpenAPI 정의서: `https://seoul.openapi.redtable.global/front/docs/openAPI_docs_seoul.pdf`
- 공공데이터포털 서울관광재단 API: `https://www.data.go.kr/data/15097605/openapi.do`
- 소상공인 상가정보 API: `https://www.data.go.kr/data/15012005/openapi.do`
- 행정안전부 일반음식점 API: `https://www.data.go.kr/data/15154916/openapi.do`

