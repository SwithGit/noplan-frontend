# NoPlan 성수권 4개 거점 장소 확장 구현·실데이터 결과

- 실행일: 2026-08-18
- 기준 문서: `docs/east-seoul-four-hub-place-collection-development-handoff.md`
- Frontend: `D:\VSCode\NoPlan\noplan-web`
- Backend: `D:\Backend\NoPlan`
- DB 대상 권역: `region_key='seongsu'`
- 현재 상태: 구현·DB 마이그레이션·표본 검증·승인 반영·실제 코스 검증 완료, 전체 수집은 Apify 결제 주기 사용 한도로 중단되어 재개 대기

## 1. 구현 결과

### 권역·분류·품질 정책

- `seongsu`를 성수역·서울숲역·건대입구역·뚝섬역 4개 거점의 단일 서비스 권역으로 확장했다.
- 39개 소분류와 문서의 검색어를 Backend 공통 정의로 구현했다.
- Frontend도 동일한 39개 목록을 `placeCatalog.ts`에서 사용한다.
- A: 별점 3.5 이상·리뷰 10개 이상·1,200m, B: 별점 3.0 이상·1,200m, C: 별점 3.0 이상·1,800m 순서로 부족한 조합만 완화한다.
- 장소 행은 Kakao 장소 ID로 전역 중복 방지하며, 좌표상 최단 거점을 `nearest_station`에 저장한다.
- 한 장소가 여러 거점 반경 안이면 장소 행은 하나만 유지하고 각 거점 커버리지에는 포함한다.

### 네이버 검증·메뉴·승인

- 네이버 자동 매칭은 ID/URL 일치, 전화+호환 이름, 정확한 이름+주소, 정확한 이름+100m 이내만 허용한다.
- 음식·카페·술집은 네이버 상세 조회와 메뉴 정규화를 같은 수집 조합 안에서 연속 실행한다.
- 네이버 존재 확인은 `apify_naver_place`, 메뉴 결과는 기존 `apify_naver_menu`에 기록한다.
- `naverMenuProvider`의 `성수역` 하드코딩을 실제 `nearest_station` 기반 검색어로 변경했다.
- 자동 승인은 품질 단계·좌표·분류·네이버 존재 확인을 통과해야 하며, 음식·카페·술집은 메뉴 상태가 `matched`여야 한다.
- 기존 승인 장소의 이미지·메뉴는 삭제하거나 덮어쓰지 않는다. 새 승인 장소에만 후보 미디어를 복사한다.
- 승인 배치 ID를 후보와 승인 장소에 저장해 배치 단위 추적이 가능하다.

### 재개 가능한 수집

- `scripts/collectSeongsuAreaCatalog.js`를 추가했다.
- 실행 단위는 `거점 × 소분류 × 품질 단계`이며 체크포인트, `--resume`, 최대 동시 4개, 후보별 오류 격리, 429/5xx 재시도, Actor run/dataset ID와 원본·탈락 통계를 지원한다.
- 이미 목표를 달성한 조합과 같은 거점·소분류에서 발견한 Kakao ID는 다시 검증하지 않는다.
- `scripts/reportSeongsuCollection.js`로 DB 수량·커버리지·체크포인트·Apify 사용 결과를 다시 출력할 수 있다.

### 관리자 Frontend

- 지역명을 `성수역`에서 `성수권`으로 변경했다.
- `전체 | 성수역 | 서울숲역 | 건대입구역 | 뚝섬역` 필터를 추가했다.
- 커버리지에 거점, 소분류, A/B/C, 승인 수, 부족 수, 검색 소진 여부를 표시한다.
- 후보 카드에 A/B/C, 최단 거점, 완화 사유를 표시한다.
- 공공데이터 보강 버튼과 Redtable·상가업소·일반음식점 연결/동기화 UI 및 API 호출을 제거했다.
- 네이버 존재·메뉴 매칭만 외부 데이터 확인 영역에 표시한다.

### 공공데이터 3종 비활성화

- 관리자 라우트에서 공공데이터 상태/보강 API와 Provider 서비스 import를 제거해 호출 불가능하게 했다.
- 기존 `syncSeongsuPlaceData.js`, `validateSeongsuPlaceData.js`는 retired 메시지와 함께 즉시 종료한다.
- Redtable·상가업소·일반음식점 Provider 파일은 런타임 등록과 라우트가 없는 비활성 상태로 남겨 롤백 가능성을 보존했다.
- 기존 공통 Apify 실행기, 네이버 메뉴 Provider/Service, `noplan_candidate_external_matches`는 유지했다.

### 코스 생성

- `CATALOG_REGIONS.seongsu`와 성수역·서울숲·뚝섬·건대/화양/자양 힌트를 추가했다.
- 홍대 문자열 단독 차단을 `Boolean(CATALOG_REGIONS[requestedRegionKey])` 방식의 지원 권역 검사로 변경했다.
- 성수권 요청은 `region_key='seongsu'` 승인 장소를 요청 거점 앵커 기준 실제 거리로 필터링한다.

## 2. DB 마이그레이션과 기존 데이터 보존

애플리케이션의 idempotent schema initializer로 다음을 반영했다.

- 후보·승인 장소: `quality_tier`, `quality_exception_reason`, `approval_batch_id`
- 수집 이력: `noplan_place_candidate_discoveries`
- 재개 체크포인트: `noplan_place_collection_checkpoints`
- 품질·커버리지 조회 인덱스

마이그레이션 직전/직후 확인:

| 항목 | 기존 | 사전 보정 후 |
|---|---:|---:|
| 성수 후보 | 69 | 69 |
| 활성 네이버 메뉴 | 1,248 | 1,248 |

기존 69곳은 좌표로 최단 거점과 거리만 보정했고, 기존 네이버 메뉴와 승인 상태를 유지했다.

Redtable 활성 메뉴 수:

| 테이블 | 활성 행 |
|---|---:|
| 후보 메뉴 | 0 |
| 승인 장소 메뉴 | 0 |

따라서 네이버 메뉴가 있는 후보만 골라 제거할 Redtable 활성 데이터는 없었다. 수동·팀·점주·네이버 메뉴는 삭제하지 않았다.

## 3. 5곳 표본 검증

배치 ID: `seongsu-sample-20260818`

| 장소 | 분류 | 단계 | 최단 거점 | 승인 메뉴 |
|---|---|---|---|---:|
| 어촌횟집 | 해산물 | A | 성수역 | 7 |
| 푸른바다횟집 | 해산물 | A | 성수역 | 8 |
| 싱싱횟집 | 해산물 | A | 성수역 | 5 |
| 시원 | 해산물 | A | 뚝섬역 | 9 |
| 어구어구 건대본점 | 해산물 | A | 건대입구역 | 28 |

5곳 모두 Kakao 품질·거리, 네이버 존재·지점, 네이버 메뉴, 자동 승인 게이트를 통과했다.

## 4. 전체 실행의 현재 실데이터 결과

배치 ID: `seongsu-full-20260818`

Apify가 결제 주기 사용 한도에 도달하기 전까지 반영된 현재 DB 수량:

| 항목 | 수량 |
|---|---:|
| 성수 후보 | 349 |
| 활성 네이버 후보 메뉴 | 5,480 |
| 활성 승인 장소 | 293 |
| 기존 대비 신규 후보 | 280 |
| 기존 대비 네이버 메뉴 증가 | 4,232 |

완료 체크포인트 집계:

| 단계 | 완료 조합 | Kakao 원본 | 통과 처리 | 네이버 미확인 | 메뉴 성공 | Apify run | 결과 항목 |
|---|---:|---:|---:|---:|---:|---:|---:|
| A | 16 | 3,753 | 249 | 92 | 240 | 31 | 4,125 |
| B | 7 | 1,393 | 65 | 28 | 61 | 14 | 1,514 |
| C | 4 | 602 | 23 | 20 | 20 | 8 | 640 |
| 합계 | 27 | 5,748 | 337 | 140 | 321 | 53 | 6,279 |

성수역 기준 확인된 예시:

- A만으로 30곳: 고기, 한식, 일식, 중식, 양식, 커피
- B에서 30곳: 분식, 기타 음식, 베이커리
- C까지 소진 후 부족: 해산물 29, 디저트 26, 브런치 0, 방탈출 4
- 진행 중 중단: 공방/체험 B, 기타 카페 B, 보드게임 B

중단 원문:

```text
Actor aborted. You've reached the maximum usage for your current billing cycle.
```

이는 코드/DB 오류가 아니라 Apify 계정 한도다. 완료 체크포인트는 보존되고 `running` 조합은 완료로 간주하지 않으므로, 한도 증액 또는 다음 결제 주기 후 아래 명령으로 이어서 실행할 수 있다.

```bash
node scripts/collectSeongsuAreaCatalog.js --resume --approve --batch-id=seongsu-full-20260818 --concurrency=3 --raw-limit=300
```

## 5. 실제 성수권 코스 생성 검증

로컬 Backend의 실제 `POST /api/course/generate/generate-course`를 호출했고, 네 요청 모두 HTTP 200과 `regionKey='seongsu'`를 반환했다.

| 요청 위치 | 실제 승인 장소 반환 |
|---|---|
| 성수역 | 조조칼국수 성수점 → 에르제 성수 → 원산면옥 |
| 서울숲역 | 비사벌 전주콩나물국밥 → 호과당 → 고공 성수본점 |
| 건대입구역 | 카페드라이 → 아웃오브오더 |
| 뚝섬역 | 대낚식당 성수직영점 → 따우전드 성수점 → 성수동간판없는집 |

각 장소는 `provider='kakao_local'`과 실제 `catalogPlaceId`를 포함했다. 건대입구는 검증 가능한 슬롯만 남기는 기존 부분 성공 정책에 따라 2곳을 반환했다.

## 6. 테스트·빌드

- Frontend `npm run build`: 성공
- 이번 Frontend 변경 파일 ESLint: 성공
- Backend `node --test tests/*.test.js`: 73/73 성공
- Backend 변경 스크립트/라우트 `node --check`: 성공
- 실제 DB 스키마·보존 수량·표본 승인·전체 부분 수집 검증: 성공
- 실제 4개 거점 코스 API: 4/4 HTTP 200

전체 `npm run lint`는 이번 변경과 무관한 기존 파일에서 11개 오류가 남아 실패한다.

- `src/components/ExploreFeed.tsx`: 2개
- `src/components/MapBoard.tsx`: 9개

이번에 수정한 `PlaceAdmin.tsx`, `adminPlacesApi.ts`, `placeCatalog.ts`는 개별 ESLint를 통과했다.

## 7. 배포·운영 주의

- Frontend와 Backend를 모두 배포해야 한다.
- Backend 배포 후 서버 시작 시 schema initializer가 새 컬럼·테이블을 idempotent하게 생성한다.
- 이미 연결된 운영 DB에는 이번 실행으로 스키마와 실데이터가 반영돼 있다.
- Apify 한도 갱신 후 위 `--resume` 명령을 한 번 실행해야 4개 거점×39개 소분류 전체 소진 결과가 완성된다.
- 임의 commit/push는 하지 않았다.

