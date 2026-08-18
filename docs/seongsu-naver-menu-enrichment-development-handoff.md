# NoPlan 네이버 플레이스 메뉴 자동수집 개발 전달서

- 문서 상태: 개발 실행 기준
- 작성일: 2026-08-18
- Frontend: `D:\VSCode\NoPlan\noplan-web`
- Backend: `D:\Backend\NoPlan`
- 대상: 성수 관리자 후보의 메뉴명·가격 자동수집
- 이 문서 하나를 이번 수정의 개발 기준으로 사용한다.

## 1. 개발 페이지에 전달할 요청

Frontend와 Backend의 현재 코드 및 `git status`를 먼저 확인하고 기존 사용자 변경을 보존한 상태에서 이 문서대로 실제 구현한다.

현재 구현된 Apify 카카오 후보 수집, 네이버 존재 교차검증, Redtable·SBIZ·일반음식점 연동은 제거하지 않는다.

현재 네이버 교차검증에 사용하는 Apify Actor는 메뉴 상세수집을 지원하지만 `scrapePlaceDetails: false`로 실행 중이다. 교차검증을 통과해 NoPlan 후보가 된 장소만 같은 Actor로 다시 상세 조회하여 네이버 플레이스의 메뉴명과 가격을 후보 메뉴에 자동 저장한다.

설명이나 계획만 작성하지 말고 다음을 완료한다.

- Backend 네이버 메뉴 Provider 구현
- 후보 단건 및 선택 일괄 메뉴 보강 API
- 메뉴 정규화·중복 방지·수동 메뉴 보호
- 관리자 메뉴 수집 버튼과 결과 표시
- 성수 후보 전체 메뉴 보강 실행
- 실제 메뉴 확보율과 가격 확보율 집계
- 자동 테스트와 전체 테스트
- Frontend 빌드

사용자가 요청하지 않는 한 커밋하거나 푸시하지 않는다.

## 2. 이번 작업의 핵심 목표

현재 성수 후보는 69개지만 후보에 자동 연결된 메뉴는 0개다. 이번 작업은 장소 검증이 아니라 실제 메뉴 확보가 목표다.

완료 결과는 다음 형태여야 한다.

```text
후보 69개 중 네이버 상세조회 성공 N개
메뉴 1개 이상 확보 M개
저장한 전체 메뉴 K개
가격 포함 메뉴 P개
메뉴 미제공 또는 상세조회 실패 Q개
```

메뉴가 실제 후보에 저장되지 않았다면 구현 완료로 보고하지 않는다.

## 3. 기존 흐름에서 유지할 부분

현재 후보 수집 단계의 네이버 Actor 설정은 그대로 유지한다.

```js
actorId: 'delicious_zebu~naver-map-search-results-scraper'
scrapePlaceDetails: false
```

이 호출은 카카오 후보가 네이버에도 존재하는지 빠르게 확인하기 위한 것이다. 원본 후보 수백 건을 모두 상세 조회하도록 `true`로 바꾸지 않는다.

변경 후 흐름:

```text
Apify 카카오 후보 수집
→ 네이버 검색 결과로 존재 교차검증
→ 검수 후보 저장
→ 통과 후보만 네이버 상세 재조회
→ MenuItems 정규화
→ 후보 메뉴에 저장
→ 관리자 확인
→ 장소 승인 시 승인 메뉴로 복사
```

## 4. 사용할 Actor와 입력

기존 Actor를 재사용한다.

```text
delicious_zebu~naver-map-search-results-scraper
```

우선 입력 방식:

1. 기존 네이버 교차검증 결과에 네이버 장소 URL이 있으면 `urls`로 조회
2. URL이 없으면 `성수역 + 후보명 + 도로명주소`를 `keywords`로 조회
3. 단건 조회는 결과를 3~5건 이내로 제한

권장 입력 예시:

```json
{
  "urls": ["https://map.naver.com/p/entry/place/{NAVER_PLACE_ID}"],
  "scrapePlaceDetails": true,
  "maxResultsPerKeyword": 5
}
```

URL이 없을 때:

```json
{
  "keywords": ["성수역 코노미스시 성수 서울특별시 성동구 ..."],
  "scrapePlaceDetails": true,
  "maxResultsPerKeyword": 5
}
```

Actor의 최신 Input schema가 위 필드와 다르면 Apify 공식 Actor 문서의 현재 필드명을 우선하되, 기존 검색 호출을 깨지 않는다.

## 5. Backend 권장 구조

현재 외부 데이터 구조에 Provider를 추가한다.

```text
routes/admin/placeData/providers/naverMenuProvider.js
routes/admin/placeData/naverMenuService.js
```

기존 `places.js`의 Apify 실행 코드를 복사해 서로 다른 구현을 만들지 않는다. 가능하면 공통 Apify 실행 함수를 작은 모듈로 분리해 카카오·네이버 수집과 메뉴 보강에서 재사용한다.

Provider 계약 예시:

```js
async function fetchMenus(candidate) {
  return {
    matched: true,
    naverPlaceId: '1234567890',
    naverPlaceUrl: 'https://map.naver.com/p/entry/place/1234567890',
    matchConfidence: 0.98,
    menus: [
      {
        sourceMenuId: 'stable-hash',
        name: '아메리카노',
        price: 4500,
        priceText: null,
        isSignature: true
      }
    ],
    warnings: []
  };
}
```

## 6. 네이버 상세 장소 매칭

네이버 상세 결과를 이름만 보고 선택하지 않는다.

우선순위:

1. 네이버 장소 ID 또는 URL 완전일치
2. 전화번호 완전일치 + 상호명 호환
3. 상호명 완전일치 + 도로명주소 일치
4. 상호명 완전일치 + 좌표 100m 이내
5. 나머지는 자동 메뉴 저장하지 않고 `review_required`

프랜차이즈는 지점명·주소·전화번호 중 하나가 확실히 일치해야 한다.

다른 장소의 메뉴가 붙을 가능성이 있으면 메뉴 0개보다 위험하므로 자동 저장하지 않는다.

## 7. 메뉴 응답 정규화

Actor 버전별 필드 차이를 허용한다.

메뉴 배열 후보:

```text
MenuItems
menuItems
menus
menu
```

메뉴명 후보:

```text
Name
name
title
MenuName
menuName
```

가격 후보:

```text
Price
price
priceText
amount
```

가격 규칙:

- `4,500원`, `4500`, `₩4,500`은 `4500`으로 저장
- `변동`, `시가`, `가격 문의`는 `price=NULL`, 원문은 `price_text`에 저장
- 0원·음수·비정상 값은 숫자 가격으로 저장하지 않는다.
- 메뉴명이 없는 항목은 저장하지 않는다.
- 같은 이름·같은 가격의 중복 메뉴는 하나로 합친다.

메뉴 이미지 URL은 응답에 있어도 이번 작업에서는 자동 게시하거나 후보 이미지 테이블에 저장하지 않는다.

## 8. 메뉴 ID와 출처

자동 메뉴 source:

```text
apify_naver_menu
```

네이버 메뉴에 안정적인 메뉴 ID가 없으면 다음 값으로 SHA-256 기반 ID를 만든다.

```text
naverPlaceId
+ 정규화 메뉴명
+ 정규화 가격 또는 priceText
```

예시:

```js
sourceMenuId = sha256(`${naverPlaceId}|${normalizedName}|${normalizedPrice}`)
```

기존 메뉴 컬럼을 사용한다.

```text
source
source_place_id
source_menu_id
match_confidence
last_verified_at
```

## 9. 메뉴 병합 우선순위

```text
관리자 직접 확인(manual/team_upload)
→ 점주 제공(merchant_upload/owner_upload)
→ 네이버 메뉴(apify_naver_menu)
→ Redtable(redtable_seoul)
```

규칙:

1. 수동·팀·점주 메뉴를 자동 메뉴가 덮어쓰거나 삭제하지 않는다.
2. 같은 `source + source_menu_id`는 upsert한다.
3. 수동 메뉴와 이름·가격이 같은 자동 메뉴는 중복 추가하지 않는다.
4. 네이버와 Redtable 메뉴가 이름·가격까지 같으면 네이버 메뉴 하나만 노출한다.
5. 네이버 메뉴에 없는 기존 Redtable 메뉴는 자동 삭제하지 않는다.
6. 자동 메뉴를 관리자가 수정하면 수동 override로 전환하되 원본 source ID를 별도 보존한다.
7. 관리자가 자동 메뉴를 삭제하면 다음 보강에서 다시 생기지 않도록 suppression 또는 `is_available=0` 상태를 보존한다.
8. 후보 승인 시 출처·source ID·신뢰도·확인일까지 승인 메뉴로 복사한다.

현재 `replaceCandidateMedia`가 자동 메뉴 수정·삭제 후 재보강 시 원본 메뉴를 다시 추가할 수 있으므로 이 문제도 함께 수정한다.

## 10. Backend API

기존 관리자 인증을 사용한다.

### 10.1 단건 메뉴 수집

```text
POST /api/admin/places/candidates/:id/enrich-naver-menu
```

응답 예시:

```json
{
  "success": true,
  "status": "matched",
  "naverPlaceId": "1234567890",
  "matchConfidence": 0.98,
  "rawMenuCount": 12,
  "importedMenuCount": 10,
  "skippedMenuCount": 2,
  "warnings": []
}
```

상태:

```text
matched
review_required
not_found
no_menu
error
```

### 10.2 선택 일괄 메뉴 수집

```text
POST /api/admin/places/candidates/enrich-naver-menus
```

요청:

```json
{
  "candidateIds": [1, 2, 3]
}
```

- 한 번에 최대 100개
- 후보 하나가 실패해도 나머지 계속 처리
- 같은 네이버 장소는 한 실행에서 한 번만 상세 조회
- 후보별 성공·실패·메뉴 수 반환

긴 작업이 예상되면 최대 10~20개씩 chunk 처리하고 Frontend에서 진행률을 표시한다. 단일 HTTP 요청을 1시간 동안 막아두는 방식은 피한다.

## 11. Frontend 변경

대상:

```text
src/api/adminPlacesApi.ts
src/pages/admin/PlaceAdmin.tsx
src/styles/index.css
```

후보 상세 버튼:

```text
네이버 메뉴 불러오기
```

현재 페이지 또는 선택 후보용 버튼:

```text
선택한 후보 메뉴 일괄 수집
```

실행 결과:

```text
네이버 상세조회 성공
메뉴 12개 확인 · 신규 10개 저장 · 중복 2개 제외
```

메뉴가 없을 때:

```text
네이버 플레이스에 공개된 메뉴가 없습니다.
```

메뉴 출처 배지:

```text
네이버 플레이스 · 최근 확인 2026-08-18
```

현재 후보 목록과 상세 메뉴 source 허용 목록에 `apify_naver_menu`를 추가한다. Provider 내부 이름을 그대로 사용자에게 보여주지 않는다.

## 12. 비용·호출 제어

- 기존 교차검증 원본 전체에는 상세수집을 실행하지 않는다.
- 검수함에 저장된 후보만 상세수집한다.
- 같은 후보를 TTL 안에서 반복 호출하지 않는다.
- 기본 재수집 제한은 24시간으로 한다.
- 관리자 강제 새로고침은 별도 확인 후 허용한다.
- 429 응답은 지수 backoff하고 후보별 오류로 기록한다.
- Apify token을 URL·로그·응답에 노출하지 않는다.

## 13. 테스트

추가 권장 파일:

```text
tests/naverMenuProvider.test.js
tests/naverMenuMerge.test.js
tests/fixtures/place-data/naver-place-with-menus.json
tests/fixtures/place-data/naver-place-no-menu.json
tests/fixtures/place-data/naver-place-ambiguous.json
```

필수 테스트:

- `MenuItems` 메뉴명·숫자 가격 정규화
- 시가·변동 가격의 `price_text` 보존
- 네이버 장소 ID 완전일치
- 이름 같은 다른 지점 오매칭 방지
- 메뉴 없는 장소를 정상 `no_menu` 처리
- 같은 메뉴 재수집 시 중복 없음
- 수동 메뉴 보호
- 수정한 자동 메뉴의 override 유지
- 삭제한 자동 메뉴가 재수집으로 복원되지 않음
- Redtable과 동일 메뉴 중복 노출 방지
- 한 후보 실패 시 일괄 수집 계속
- Apify 키 누락·429·timeout 격리

검증 명령:

```text
Backend: npm test
Frontend: npm run build
Frontend: npm run lint
```

## 14. 성수 실데이터 실행

1. 기존 성수 대기 후보 69개를 대상으로 실행한다.
2. 먼저 5개 후보로 메뉴 수집 형식과 오매칭 여부를 확인한다.
3. 정상 확인 후 10~20개씩 나누어 전체 후보를 실행한다.
4. 메뉴가 붙은 후보 10곳을 사람이 네이버 플레이스와 비교한다.
5. 메뉴가 붙은 후보 1~3개를 승인해 `noplan_place_menu_items` 복사를 확인한다.

반드시 보고할 지표:

```text
전체 후보 수
네이버 상세 장소 매칭 수
메뉴 1개 이상 확보한 후보 수와 비율
전체 저장 메뉴 수
가격 포함 메뉴 수와 비율
no_menu 수
not_found 수
review_required 수
error 수
평균 후보당 메뉴 수
표본 10곳 정확도
대략적인 Apify 사용량과 비용
```

## 15. 완료 기준

다음을 모두 충족해야 완료다.

- 성수 후보에 실제 네이버 메뉴명·가격이 저장된다.
- 메뉴가 붙은 후보 수가 0보다 크다.
- 관리자 화면에서 네이버 메뉴와 출처를 확인할 수 있다.
- 같은 후보를 재수집해도 메뉴가 중복되지 않는다.
- 수동·팀·점주 메뉴가 보호된다.
- 자동 메뉴 수정·삭제가 다음 재수집 후에도 유지된다.
- 다른 지점의 메뉴가 자동으로 붙지 않는다.
- 메뉴가 없는 후보도 오류 없이 `no_menu`로 끝난다.
- 승인 시 네이버 메뉴가 승인 장소 메뉴 테이블로 복사된다.
- 기존 Apify 카카오·네이버 교차검증과 Redtable 연동이 회귀하지 않는다.
- Backend 전체 테스트와 Frontend 빌드가 통과한다.
- 성수 69개 전체의 메뉴 확보율이 수치로 보고된다.

메뉴가 실제로 0개라면 완료로 보고하지 말고 Actor 원본 응답과 입력 형식을 확인해 원인을 수정한 뒤 다시 검증한다.

## 16. 최종 보고 형식

1. 구현 내용
2. 변경 파일
3. 네이버 Actor 실제 입력 형식
4. 원본 메뉴 필드와 정규화 결과
5. 테스트·빌드 결과
6. 성수 69개 메뉴 확보 결과
7. 가격 확보율
8. 표본 정확도
9. 실제 Apify 사용량·비용
10. 남은 한계

API token과 키가 포함된 URL은 보고하지 않는다.

## 17. 참고 링크

- 현재 사용 중인 네이버 Actor: `https://apify.com/delicious_zebu/naver-map-search-results-scraper`
- Actor 기능: `scrapePlaceDetails=true`일 때 `MenuItems` 메뉴명·가격·이미지 포함

