# NoPlan 성수 장소·메뉴 데이터 개발 결과 및 기획 전달서

- 작성일: 2026-08-18
- 개발 기준: `docs/seongsu-place-menu-data-development-handoff.md`
- 대상: 관리자 장소 수집·검수 화면과 외부 공공데이터 보강 기능
- 대상 권역: 성수역 기준 반경 1.8km
- 상태: 1차 구현·배포·실데이터 수집 완료, Redtable 설명 데이터 일부 동기화 및 메뉴 커버리지 개선 필요

## 1. 기획 페이지에 전달할 핵심 결론

성수 장소 후보 수집과 외부 공공데이터를 이용한 실재 업소·주소·영업상태 교차검증 기능은 구현되고 실제 데이터로 동작하는 것을 확인했다.

다만 메뉴 자동 확보는 서울관광재단 Redtable에 해당 장소가 매칭될 때만 가능하다. 실제 관리자 화면에서 일반음식점과 소상공인 상가정보가 97%로 매칭된 식당도 Redtable에 없으면 메뉴는 0개였다. 따라서 현재 결과는 다음처럼 평가해야 한다.

| 목표 | 현재 결과 |
|---|---|
| 성수 후보 수집 | 동작함 |
| 카카오 후보의 네이버 존재 확인 | 동작함 |
| SBIZ 상가정보로 업소·주소 교차검증 | 동작함 |
| 행정안전부 일반음식점으로 인허가 업소 교차검증 | 동작함 |
| 폐업·영업종료 경고 기반 마련 | 동작함 |
| Redtable 메뉴 자동 반영 | Redtable 매칭 장소에 한해 동작 |
| 성수의 다수 카페·식당 메뉴 자동 확보 | 현재 데이터 소스만으로는 충족하지 못함 |

즉, 이번 개발은 장소 검증 기반으로는 유효하지만, `대부분의 성수 장소에 메뉴를 자동으로 채운다`는 목표로 보면 추가 데이터 전략이 필요하다.

## 2. 실제 구현 범위

### Frontend

- 관리자 지역 선택에 `성수역` 추가
- 성수 기본 수집값 적용: 반경 1.8km, 최소 별점 3.5, 최소 후기 10
- 홍대와 성수 전환 시 페이지·선택 후보·알림 상태 초기화
- 성수 공공데이터 연결 및 동기화 상태 표시
- 후보 한 건의 `공공데이터 보강` 실행
- 공급자별 `일치`, `확인 필요`, `not_found` 상태 표시
- 애매한 외부 장소의 수동 확정·거절 UI
- 폐업·영업종료 경고
- Redtable 메뉴의 출처·신뢰도·최근 확인일 표시
- 자동 메뉴 수정 시 수동 메뉴로 전환

### Backend

- 성수 지역값이 홍대로 잘못 정규화되던 오류 수정
- 성수 Apify 수집 반경 1.8km와 최소 후기 10 적용
- Redtable, SBIZ, 일반음식점 Provider 분리 및 오류 격리
- 외부 장소와 후보의 신뢰도 기반 매칭
- Redtable 자동 메뉴의 중복 없는 반영과 수동·팀·점주 메뉴 보호
- 후보 승인 시 메뉴 출처 정보 복사
- 동기화 CLI, dry-run, 페이지 지정, 재개 기능 제공
- 페이지별 진행상태 DB 기록
- 동기화 완료·실패 후 MySQL 연결 종료
- 공공데이터포털 Encoding/Decoding 키 모두 처리
- API 키·토큰 오류 로그 마스킹
- EPSG:5174 좌표를 WGS84로 오인하지 않도록 처리
- `null` 좌표가 `(0, 0)`으로 계산되어 일반음식점이 전부 제외되던 오류 수정

## 3. DB 변경 결과

다음 테이블을 idempotent 방식으로 추가했다.

```text
noplan_external_places
noplan_external_menu_items
noplan_candidate_external_matches
noplan_external_sync_status
```

후보·승인 메뉴 테이블에는 다음 출처 필드를 추가했다.

```text
source_place_id
source_menu_id
match_confidence
last_verified_at
```

마이그레이션은 동일 DB에 두 번 실행해도 오류 없이 완료되는 것을 확인했다. 별도의 추가 수동 SQL은 현재 필요하지 않다.

## 4. 성수 Apify 실데이터 결과

### 맛집 수집

```text
카카오 원본: 500건
네이버 원본: 240건
네이버 확인 시도: 174건
최종 수집: 50건
주요 제외: 낮은 별점 50, 낮은 후기 21, 네이버 미확인 124
```

### 카페 수집

```text
카카오 원본: 300건
네이버 원본: 150건
네이버 확인 시도: 119건
최종 수집: 19건
주요 제외: 낮은 별점 99, 낮은 후기 81, 네이버 미확인 100, 중복 1
```

### 최종 성수 대기 후보

```text
총 69건
맛집 47
카페 18
놀거리 3
술집 1
성수역 기준 거리 39~591m
```

초기 검증 중 `seongsu`가 `hongdae`로 정규화되어 잘못 생성된 후보 14건을 정확한 ID 범위로 확인한 뒤 제거했다. 사용자 생성 데이터는 삭제하지 않았다.

## 5. 외부 데이터 동기화 결과

### Redtable 식당

```text
전체 원본: 167,659건
성수 조건 통과·저장: 2,169건
제외: 165,490건
오류: 0건
상태: completed
```

### Redtable 메뉴

```text
전체 원본: 573,965건
성수 식당 ID에 연결된 메뉴: 2,873건
제외: 571,092건
오류: 0건
상태: completed
```

### Redtable 메뉴 설명

```text
1~255페이지까지 부분 처리
256페이지 요청부터 HTTP 429
원인: 정해진 사용량 또는 요청 한도 초과
재개 지점: 256페이지
상태: 미완료
```

한도 초기화 후 실행할 명령:

```bash
node scripts/syncSeongsuPlaceData.js --provider=redtable --resource=descriptions --resume --max-pages=700
```

### 소상공인 상가정보(SBIZ)

```text
전체 원본: 14,680건
성수 반경 조건 통과·저장: 9,588건
제외: 5,092건
오류: 0건
상태: completed
```

### 행정안전부 일반음식점

```text
성동구 원본: 8,878건
성수 주소 조건 통과·저장: 4,127건
제외: 4,751건
오류: 0건
상태: completed
```

일반음식점 첫 실행에서는 좌표가 없는 장소를 `(0, 0)`으로 계산하는 오류 때문에 처리 건수가 0이었다. 좌표 유효성 판정을 수정한 뒤 다시 실행하여 4,127건이 정상 저장됐다.

## 6. 관리자 웹 화면 실측 결과

`공공데이터 보강`은 전체 외부 데이터를 후보 목록에 추가하는 기능이 아니다. 현재 선택한 후보 한 건을 세 외부 원천과 비교하는 기능이다.

| 후보 | Redtable | SBIZ | 일반음식점 | 메뉴 결과 |
|---|---|---|---|---|
| 레이지요거트 | 미발견 | 미발견 | 미발견 | 0개 |
| 마아트커피브루어스 | 미발견 | 미발견 | 미발견 | 0개 |
| 어퍼룸 | 미발견 | 97% 일치 | 미발견 | 0개 |
| 코노미스시 성수 | 미발견 | 97% 일치 | 97% 일치 | 0개 |

이 결과로 확인된 내용:

1. 외부 장소 매칭 기능 자체는 실제 웹에서 동작한다.
2. SBIZ와 일반음식점은 장소 존재·주소·인허가 검증에 실제로 사용된다.
3. SBIZ와 일반음식점은 메뉴를 제공하지 않는다.
4. 메뉴는 Redtable 매칭이 성공한 장소에만 자동 반영된다.
5. 테스트한 네 장소에서는 Redtable 매칭이 한 건도 나오지 않았다.
6. 카페는 일반음식점이 아니라 휴게음식점으로 분류될 수 있어 현재 일반음식점 Provider로는 검증 범위가 제한된다.

## 7. 현재 기능의 실질적 가치

현재 수집한 공공데이터는 다음 용도로 유효하다.

- Apify 후보가 실제 업소인지 교차검증
- 주소가 같은지 확인
- 일반음식점 인허가 데이터 확인
- 폐업·영업종료 데이터가 있을 때 관리자 경고
- 외부 공급자 ID와 매칭 신뢰도 기록
- 관리자가 승인 전 오매칭을 확인할 근거 제공

다음 용도로는 충분하지 않다.

- 대부분의 성수 식당·카페 메뉴 자동 입력
- 현재 판매 메뉴와 가격의 폭넓은 최신성 확보
- 카페·디저트 업소의 인허가 데이터 전체 검증

## 8. 확인된 한계와 원인

### 메뉴 공급자가 사실상 Redtable 하나임

SBIZ와 일반음식점은 메뉴를 제공하지 않는다. Redtable에 없는 장소는 외부 검증이 성공해도 메뉴가 0개다.

### Redtable 장소 커버리지가 제한적임

성수 조건으로 2,169개 식당을 확보했지만 실제 관리자 표본 네 곳은 모두 Redtable에서 발견되지 않았다. 표본 수가 작아 전체 매칭률로 일반화할 수는 없지만, 현재 표본에서는 메뉴 자동화 효과가 확인되지 않았다.

### 외부 후보 선조회가 이름 중심임

현재 외부 후보를 먼저 찾는 SQL은 정규화 상호명 중심이다. 공공데이터가 법인명·이전 상호·다른 지점명으로 저장돼 있으면 주소나 전화번호가 같아도 후보군에 들어오지 못할 수 있다.

### 카페 인허가 데이터가 빠져 있음

레이지요거트와 마아트커피브루어스 같은 카페는 일반음식점이 아니라 휴게음식점일 수 있다. 현재 연동한 행정안전부 일반음식점 API만으로는 이 범위를 채울 수 없다.

### Redtable 호출 한도

식당·메뉴·설명 전체 목록을 페이지 순회해야 하며, 약 1,000회 누적 호출 지점에서 HTTP 429가 발생했다. 설명 데이터는 호출 한도 초기화 후 이어받아야 한다.

## 9. 다음 기획 결정이 필요한 항목

### 우선순위 A: 장소 검증 기능을 실사용할 경우

1. 외부 후보 검색에 전화번호 완전일치 추가
2. 도로명주소 동일·접두 일치 후보 추가
3. 이름이 달라도 주소가 같으면 자동 확정하지 않고 `확인 필요`로 노출
4. 공급자 이름을 `general_restaurant` 대신 `일반음식점`, `sbiz` 대신 `상가정보`로 한글 표시
5. 현재의 단건 보강 외에 현재 페이지 후보 일괄 보강 UI 제공

### 우선순위 B: 카페 검증 범위를 넓힐 경우

행정안전부 `식품_휴게음식점 조회서비스` Provider 추가를 검토한다. 이 데이터도 메뉴 공급원은 아니며, 카페의 인허가·영업상태 검증 범위를 넓히는 역할이다.

### 우선순위 C: 메뉴 자동화를 실제 목표로 둘 경우

Redtable 하나에 의존해서는 목표 달성이 어렵다. 다음 중 하나 이상이 필요하다.

1. 점주·가맹점 직접 메뉴 등록
2. 팀 운영자가 공식 메뉴판을 확인해 입력하는 흐름
3. 계약 가능한 메뉴/POS 데이터 공급자 확보
4. 이용약관과 수집 가능 범위를 검토한 별도 메뉴 데이터 소스 확보
5. 메뉴가 없는 장소도 추천에 사용할지, 메뉴 확보 장소를 우선할지 상품 정책 결정

## 10. 아직 완료하지 못한 검증

- Redtable 설명 데이터 256페이지 이후 동기화
- 성수 후보 전체 또는 목표 80건의 일괄 공공데이터 보강
- 공급자별 자동 매칭률·검수 필요율·미발견률 집계
- Redtable 메뉴가 실제 후보에 붙은 장소 수와 가격 보유율 집계
- 무작위 10개 장소의 현재 공개 메뉴와 수동 비교
- Redtable 메뉴가 붙은 후보 1~3건을 승인해 승인 메뉴로 복사되는 실제 운영 검증

따라서 `모든 완료 기준을 충족했다`고 보고하면 안 된다. 기반 구현과 외부 데이터 수집은 완료됐지만 메뉴 커버리지와 최종 운영 검증은 미완료다.

## 11. 환경변수

실제 값은 문서와 Git에 기록하지 않는다.

```env
REDTABLE_SEOUL_API_KEY=
REDTABLE_SEOUL_ENABLED=true
SBIZ_PLACE_DATA_SERVICE_KEY=
SBIZ_PLACE_DATA_ENABLED=true
GENERAL_RESTAURANT_SERVICE_KEY=
GENERAL_RESTAURANT_DATA_ENABLED=true
PLACE_DATA_REQUEST_TIMEOUT_MS=10000
PLACE_DATA_MAX_RETRIES=2
PLACE_DATA_CACHE_TTL_MS=86400000
```

공공데이터 키는 Encoding/Decoding 형식을 코드에서 모두 허용한다. 배포 서버에서는 두 공공데이터 API의 정확한 활용신청 승인을 확인했다.

## 12. 테스트·빌드 결과

2026-08-18 최신 코드 기준:

```text
Backend npm test: 60/60 통과
Frontend npm run build: 통과
Frontend npm run lint: 실패, 기존 파일의 기존 오류 11건
```

전체 lint 오류 위치:

```text
src/components/ExploreFeed.tsx
src/components/MapBoard.tsx
```

이번 성수 관리자 기능 변경 파일에서는 별도 신규 lint 오류를 확인하지 않았다.

## 13. 변경 파일

### Frontend

```text
src/api/adminPlacesApi.ts
src/pages/admin/PlaceAdmin.tsx
src/styles/index.css
```

### Backend

```text
routes/admin/placeCatalogSchema.js
routes/admin/places.js
routes/admin/placeData/collectionPolicy.js
routes/admin/placeData/externalDataService.js
routes/admin/placeData/normalizeExternalPlace.js
routes/admin/placeData/placeMatcher.js
routes/admin/placeData/providers/providerUtils.js
routes/admin/placeData/providers/redtableSeoulProvider.js
routes/admin/placeData/providers/sbizPlaceProvider.js
routes/admin/placeData/providers/generalRestaurantProvider.js
scripts/collectSeongsuApifySample.js
scripts/migratePlaceCatalogSchema.js
scripts/syncSeongsuPlaceData.js
scripts/validateSeongsuPlaceData.js
tests/placeCollectionPolicy.test.js
tests/placeDataProviders.test.js
tests/placeMatcher.test.js
tests/placeMenuMerge.test.js
tests/fixtures/place-data/*
```

## 14. 배포 상태와 운영 메모

- Frontend와 Backend 변경 배포 후 관리자 웹에서 성수 선택·외부 상태·단건 보강 동작을 확인했다.
- MySQL 마이그레이션과 외부 staging 데이터 저장을 완료했다.
- 동기화 스크립트가 완료 후 종료되지 않던 문제를 수정했다.
- 중단 지점을 페이지마다 기록하므로 최신 배포본에서는 `--resume`를 사용할 수 있다.
- 기존 홍대 데이터와 사용자 변경을 보존했다.
- 개발 과정에서 임의 커밋이나 푸시는 수행하지 않았다.

## 15. 기획 판단용 한 문장

> 성수 장소 수집과 실재·주소·영업상태 검증 기반은 마련됐지만, 메뉴 자동화는 Redtable 커버리지에 강하게 제한되므로 메뉴 확보를 핵심 가치로 삼으려면 별도 메뉴 공급 전략이 반드시 필요하다.
