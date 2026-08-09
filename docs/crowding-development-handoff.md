# NoPlan 혼잡도 기능 통합 개발 전달서

- 문서 상태: 개발 실행 기준
- 작성일: 2026-08-08
- Frontend: `D:\VSCode\NoPlan\noplan-web`
- Backend: `D:\Backend\NoPlan`
- 적용 범위: 홍대입구·연남동 NoPlan MVP
- 이 문서 하나만 혼잡도 기능 개발 기준으로 사용한다.

## 1. 개발 요청

Frontend와 Backend의 현재 코드와 `git status`를 먼저 확인하고 기존 사용자 변경을 보존한 상태에서 이 문서의 1차부터 4차까지 순서대로 실제 구현한다.

설명이나 계획만 작성하지 말고 다음을 완료한다.

- Backend 기능 구현
- Frontend 기능 구현
- 안전한 DB 마이그레이션
- Mock 및 실제 응답 검증 구조
- 자동 테스트
- Frontend TypeScript 빌드
- Backend 전체 테스트
- 변경 파일 및 남은 외부 준비사항 보고

사용자가 요청하지 않는 한 임의로 커밋하거나 푸시하지 않는다.

## 2. 확정된 기획

이번 기능은 특정 매장 안의 정확한 인원수를 알려주는 기능이 아니다. 추천 장소가 속한 홍대 권역의 현재 주변 혼잡도를 알려주는 기능이다.

표시 단계:

```text
여유
보통
약간 붐빔
붐빔
정보 없음
```

표시 원칙:

- 서울시 권역 데이터는 반드시 `주변 혼잡도`로 표시한다.
- SKT 지원 장소 또는 제휴 매장의 장소 단위 데이터만 `매장 혼잡도`로 표시한다.
- 정확한 인원수, 대기 인원, 좌석 수는 표시하지 않는다.
- 기준 시각과 출처를 표시한다.
- 오래된 fallback 데이터는 `최근 확인`으로 구분한다.
- 혼잡도 때문에 새로운 필수 입력 단계를 추가하지 않는다.
- 외부 API 장애가 코스 생성 실패로 이어지면 안 된다.

## 3. 서비스 권역

현재 사용자 서비스 범위는 `홍대입구·연남동 주변`으로 유지한다.

| 장소 코드 | 장소명 | 현재 사용 | 용도 |
|---|---|---|---|
| `POI073` | 연남동 | 사용 | 연남동 장소의 주변 혼잡도 |
| `POI055` | 홍대입구역(2호선) | 사용 | 홍대입구역 주변 장소의 주변 혼잡도 |
| `POI007` | 홍대 관광특구 | 사용 | 세부 권역에 속하지 않는 홍대 장소 fallback |
| `POI053` | 합정역 | 미사용 | Provider 호환만 허용하고 현재 추천 및 점수에는 반영하지 않음 |

합정역 때문에 첫 화면 서비스 범위 문구를 변경하지 않는다.

권역 중복 시 우선순위:

```text
POI073 연남동
→ POI055 홍대입구역
→ POI007 홍대 관광특구
```

## 4. 외부 키 처리

실제 API 키 값은 사용자가 Backend `.env` 또는 운영 환경변수에 직접 입력한다. 개발자는 키 발급을 요구하거나 키 값을 코드·문서·로그·응답에 복사하지 않는다.

사용 환경변수:

```env
SEOUL_OPEN_DATA_KEY=
CROWDING_SEOUL_ENABLED=true
CROWDING_DISPLAY_ENABLED=true
CROWDING_RANKING_ENABLED=false

SK_OPEN_API_APP_KEY=
CROWDING_SKT_ENABLED=false

CROWDING_CACHE_TTL_MS=300000
CROWDING_STALE_TTL_MS=1800000
CROWDING_REQUEST_TIMEOUT_MS=3000
```

키가 없는 상태에서도 Provider, Mock, 캐시, UI, 추천 페널티 및 테스트를 개발한다. 실제 키가 없으면 실연동 완료라고 보고하지 말고 `Mock 검증 완료 / 실제 API 검증 대기`로 보고한다.

## 5. 공통 데이터 모델

외부 공급자의 원본 응답을 프론트로 직접 전달하지 않고 Backend에서 공통 형식으로 정규화한다.

```ts
type CrowdingLevel =
  | 'relaxed'
  | 'normal'
  | 'busy'
  | 'very_busy'
  | 'unknown';

interface CrowdingSnapshot {
  scope: 'area' | 'place';
  source: 'seoul' | 'skt' | 'merchant' | 'unknown';
  areaCode?: string;
  areaName?: string;
  providerPlaceId?: string;
  level: CrowdingLevel;
  label: '여유' | '보통' | '약간 붐빔' | '붐빔' | '정보 없음';
  message: string;
  observedAt?: string;
  fetchedAt: string;
  stale: boolean;
}
```

외부 API가 알 수 없는 라벨이나 불완전한 데이터를 반환하면 `unknown`으로 처리한다.

## 6. DB 마이그레이션

후보 장소와 승인 장소 양쪽에 다음 컬럼을 안전하게 추가한다.

```text
crowding_area_code VARCHAR(20) NULL
crowding_area_name VARCHAR(100) NULL
crowding_provider_place_id VARCHAR(120) NULL
```

대상 테이블:

- `noplan_place_candidates`
- `noplan_places`

요구사항:

- 기존 데이터와 서버 시작을 깨지 않는 idempotent 마이그레이션
- 후보 수정 시 값 유지
- 후보 승인 시 승인 장소로 값 복사
- 승인 장소 조회 및 코스 후보 조회에 값 포함
- 필요하면 `crowding_area_code` 인덱스 추가
- 기존 장소는 별도 안전한 배치 또는 마이그레이션으로 권역 코드 채움

## 7. 권역 매핑

서울시가 제공하는 공식 주요 장소 영역 파일을 사용해 NoPlan 장소 좌표를 권역에 매핑한다.

개발 절차:

1. 공식 영역 ZIP의 파일 형식과 `.prj` 좌표계를 확인한다.
2. 필요한 경우 WGS84 경위도로 변환한다.
3. 승인 장소의 위도·경도에 point-in-polygon을 실행한다.
4. 중복 권역이면 정해진 우선순위를 적용한다.
5. 계산 결과를 DB 컬럼에 저장한다.
6. API 요청마다 GIS 계산을 반복하지 않는다.
7. 매핑 결과 목록과 권역별 장소 수를 보고한다.

공식 Polygon 적용이 늦어질 경우 임시 정책:

- 홍대 서비스 범위의 장소를 `POI007`로 fallback할 수 있다.
- fallback만 적용된 상태에서는 주변 혼잡도 표시만 허용한다.
- 모든 장소가 같은 권역이면 혼잡도 추천 페널티는 적용하지 않는다.
- 주소 문자열만으로 임의의 세부 권역을 확정해 추천 순위를 바꾸지 않는다.

## 8. Backend 권장 구조

현재 프로젝트 구조에 맞추되 역할은 다음처럼 분리한다.

```text
routes/course/crowding/
├─ crowdingService.js
├─ crowdingCache.js
├─ normalizeCrowding.js
└─ providers/
   ├─ seoulCrowdingProvider.js
   └─ sktCrowdingProvider.js
```

Provider 공통 계약:

```js
async function getCrowding(query) {
  return CrowdingSnapshot;
}
```

키가 없거나 기능이 비활성화된 경우 예외를 사용자까지 던지지 않고 `unknown`을 반환한다.

## 9. 1차: 서울시 주변 혼잡도 Backend 연동

서울시 실시간 인구데이터 `citydata_ppltn`을 사용한다.

요청 형식:

```text
http://openapi.seoul.go.kr:8088/{KEY}/json/citydata_ppltn/1/5/{AREA_CODE}
```

사용 코드:

- `POI073`
- `POI055`
- `POI007`
- `POI053`은 실제 사용하지 않지만 미래 호환 테스트는 가능

확인 및 정규화 대상 필드:

```text
AREA_CD
AREA_NM
AREA_CONGEST_LVL
AREA_CONGEST_MSG
PPLTN_TIME
RESULT.CODE
RESULT.MESSAGE
```

원본 응답 구조가 예상과 다를 수 있으므로 실제 응답 확인 전까지 파서를 특정 루트 배열 하나에 과도하게 결합하지 않는다.

실제 응답을 확보하면 키와 요청 URL의 인증정보를 제거하고 테스트 fixture로 저장한다.

```text
tests/fixtures/crowding/seoul-poi073.json
tests/fixtures/crowding/seoul-poi055.json
tests/fixtures/crowding/seoul-poi007.json
tests/fixtures/crowding/seoul-error-invalid-area.json
```

## 10. 캐시 및 장애 격리

캐시 정책:

- 정상 TTL: 5분
- 최근 정상 데이터 stale 허용: 30분
- 외부 요청 timeout: 기본 3초
- 캐시 키: `provider + scope + areaCode/providerPlaceId`
- 같은 캐시 키의 동시 요청은 하나의 in-flight Promise를 공유

응답 정책:

| 상태 | 처리 |
|---|---|
| 최신 조회 성공 | 최신값, `stale: false` |
| 조회 실패, 30분 이내 최근값 존재 | 최근값, `stale: true` |
| 조회 실패, 최근값 없음 | `unknown` |
| 키 없음 또는 비활성화 | `unknown` |

혼잡도 실패를 코스 생성 실패 사유로 사용하지 않는다.

## 11. 코스 생성 연결

장소 카드마다 외부 API를 개별 호출하지 않는다.

Backend 처리 순서:

1. 승인 장소 후보 조회
2. 후보의 `crowding_area_code` 수집
3. 중복을 제거한 권역만 캐시를 통해 병렬 조회
4. 결과를 `context.crowdingByArea` 형태로 플래너에 전달
5. 선택된 장소 응답에 `crowding` 추가
6. 교체 후보와 백업 장소에도 동일한 공통 모델 사용

한 코스에 연남동 장소가 여러 곳 있어도 외부 API는 캐시당 한 번만 호출한다.

## 12. `대기 적게` 구조화

기존 `extras`와 `vibe` 호환성을 유지하면서 구조화된 선호값도 Backend에 전달한다.

```json
{
  "preferences": {
    "avoidCrowds": true
  }
}
```

Frontend 조건:

```js
avoidCrowds = condition.extras.includes('대기 적게');
```

Backend는 구조화된 값이 없을 때만 기존 문자열에서 fallback으로 판단한다.

## 13. 추천 점수 반영

현재 추천 엔진은 낮은 점수가 우선이다. 혼잡할수록 음수가 아니라 양수 페널티를 더한다.

```js
const score = existingScore + crowdingPenalty;
```

초기값:

| 혼잡 단계 | 기본 | `대기 적게` 선택 |
|---|---:|---:|
| 여유 | 0 | 0 |
| 보통 | 0 | +200 |
| 약간 붐빔 | 0 | +600 |
| 붐빔 | 0 | +1,000 |
| 정보 없음 | 0 | 0 |

추가 규칙:

- stale 데이터는 페널티 50%
- `대기 적게` 미선택 시 항상 0
- 모든 후보가 같은 권역이면 항상 0
- 혼잡도 때문에 후보를 제거하지 않음
- 세션 중복, 핵심 목적, 영업 여부, 브랜드 제한, 필수 슬롯 유지 우선
- 페널티 값은 환경변수 또는 상수 모듈로 조정 가능

진단 정보:

```json
{
  "crowding": {
    "areaCode": "POI073",
    "level": "busy",
    "penalty": 600,
    "stale": false,
    "source": "seoul"
  }
}
```

## 14. 2차: Frontend 표시

`CoursePlace`에 다음 선택 필드를 추가한다.

```ts
crowding?: CrowdingSnapshot;
```

표시 위치:

- 코스 결과 장소 카드
- 코스 지도
- 장소 상세 화면

권역 데이터 표시 예시:

```text
연남동 주변 · 약간 붐빔
18:35 기준 · 서울시 실시간 인구데이터 기반
```

stale 표시 예시:

```text
연남동 주변 · 약간 붐빔
18:05 최근 확인 · 서울시 실시간 인구데이터 기반
```

상세 안내:

```text
통신 기반 권역 추정치이며 실제 매장 내부 혼잡도와 다를 수 있어요.
```

UI 규칙:

- `scope: area`는 `주변`으로 표시
- `scope: place`만 `매장 혼잡도` 사용
- `unknown`은 미표시하거나 `정보 없음`으로 처리
- 빈 레이아웃 영역을 만들지 않음
- 색상과 텍스트를 함께 사용
- 장소명, 시작 시간, 체류시간을 가리지 않음
- 새로운 필수 질문이나 입력창을 추가하지 않음

## 15. 3차: 표시 후 추천 반영

처음에는 다음 설정으로 실데이터와 화면을 검증한다.

```env
CROWDING_DISPLAY_ENABLED=true
CROWDING_RANKING_ENABLED=false
```

확인할 내용:

- 데이터 누락 빈도
- 잘못된 권역 매핑
- 기준 시각 지연
- stale 발생 빈도
- 사용자 문구 오해 가능성
- 모바일 레이아웃

문제가 없고 세부 권역 간 혼잡도 차이가 실제로 존재할 때 다음을 활성화한다.

```env
CROWDING_RANKING_ENABLED=true
```

추천 반영은 `대기 적게` 선택 시에만 동작한다.

## 16. 4차: SKT/TMAP 무료체험

키가 없을 때:

- SKT Provider 공통 계약 구현
- feature flag 구현
- Mock 응답 및 서울시 fallback 테스트
- 실제 연동 완료로 보고하지 않음

사용자가 Backend 환경변수에 키를 입력한 뒤:

1. 계정에 적용된 상품명과 실제 무료 한도 확인
2. 지원 장소 또는 상권 목록에서 홍대 검색
3. 목록을 NoPlan 승인 DB와 오프라인 매칭
4. 이름만이 아니라 주소와 좌표까지 검증
5. 매칭된 대표 장소 소수만 실시간 호출
6. 같은 장소를 다른 시간에 재조회하여 갱신 확인
7. 미지원 장소와 오류 fallback 확인
8. 호출 전후 대시보드 사용량 확인

무료체험 결과 보고 형식:

```text
가입 상품:
실제 무료 한도:
사용 호출 수:
홍대 지원 상권:
NoPlan 승인 장소 수:
SK 매칭 장소 수:
매칭률:
평균 응답 시간:
실제 갱신 간격:
장소 목록 호출 차감 여부:
예상 월 호출량:
예상 월 비용:
유료 전환 추천 여부:
```

무료체험 중 전체 NoPlan 장소를 하나씩 실시간 호출하지 않는다.

SKT 데이터 실패 또는 미지원 시 서울시 권역 데이터로 fallback한다.

## 17. 기존 Supporters 혼잡도 제보 기능

현재 `server.js`의 `/api/update-status`와 Frontend Supporters 화면은 메모리 기반 초안이다.

이번 1~4차에서는 이 데이터를 주요 혼잡도 공급원으로 사용하지 않는다.

- 서버 재시작 시 소실
- 조회 및 추천 엔진과 미연결
- 정보 제공자 신뢰 정책 없음

공통 모델의 `source: merchant`만 미래 확장용으로 유지한다. 이번 작업에서 이 기능을 무리하게 혼합하지 않는다.

## 18. Backend 테스트

필수 테스트:

- 서울시 단계별 정규화
- 알 수 없는 라벨은 unknown
- 정상 캐시 5분
- 동시 요청 coalescing
- timeout 시 기존 코스 생성 유지
- 30분 이내 최근값 stale 반환
- stale 만료 후 unknown
- 키 없음 또는 기능 비활성화 처리
- `대기 적게` 미선택 시 페널티 0
- 혼잡 단계별 양수 페널티
- stale 페널티 50%
- 모든 후보가 같은 권역이면 페널티 0
- 혼잡한 후보만 있어도 필수 슬롯 유지
- 후보·승인 장소의 권역 필드 저장 및 복사
- SKT 실패 시 서울시 fallback

## 19. Frontend 테스트 및 검증

필수 확인:

- area/place 문구 구분
- 기준 시각 및 출처 표시
- stale 표시
- unknown 안전 처리
- 모바일 장소 카드 레이아웃
- 색상 없이도 단계 구분 가능
- 새 필수 입력 단계 없음
- `대기 적게` 구조화 값 전달
- 기존 저장 코스와 혼잡도 없는 API 응답 호환
- TypeScript 빌드 성공

## 20. 완료 조건

### 1차 완료

- 서울시 Provider, 정규화, 캐시, stale, timeout 구현
- 키 없이 Mock 테스트 통과
- 키가 있으면 `POI073`, `POI055`, `POI007` 실제 응답 검증
- 키가 없으면 실제 검증 대기라고 명확히 보고

### 2차 완료

- 결과 카드, 지도, 상세 화면 표시
- 주변/매장 범위 구분
- 기준 시각, 출처, stale 처리
- Frontend 빌드 성공

### 3차 완료

- `대기 적게` 구조화 전달
- 양수 소프트 페널티
- 기능 플래그로 표시와 추천 반영 분리
- 추천 품질과 필수 슬롯 회귀 테스트 통과

### 4차 완료

- SKT 어댑터와 fallback 구현
- 키가 있으면 무료체험 결과 및 매칭률 보고
- 키가 없으면 Mock까지만 완료하고 실검증 대기 보고
- 유료 전환은 사용자 별도 승인 없이는 진행하지 않음

## 21. 하지 말아야 할 작업

- 비홍대 지역 확장
- 합정역을 현재 추천에 포함
- 정확한 인원수 표시
- 서울시 권역 데이터를 매장 내부 혼잡도로 표시
- 혼잡도 입력창 추가
- 혼잡도 때문에 장소 또는 슬롯 제거
- 외부 키를 프론트에 노출
- 외부 키를 코드, 문서, 로그, Git에 저장
- 실제 응답 검증 없이 실연동 완료 보고
- 사용자 승인 없이 SKT 유료 상품 전환
- 기존 사용자 변경 초기화 또는 덮어쓰기

## 22. 최종 개발 보고 형식

```text
완료한 단계:
변경한 Frontend 파일:
변경한 Backend 파일:
DB 마이그레이션:
Mock 테스트 결과:
실제 서울시 API 검증 결과:
권역별 매핑 장소 수:
Frontend 빌드 결과:
Backend 전체 테스트 결과:
표시 기능 활성화 상태:
추천 반영 활성화 상태:
SKT/TMAP 무료체험 결과:
남은 외부 준비사항:
```
