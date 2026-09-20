# 노플랜 한국어·중국어·일본어·영어

## 적용 사항

- GNB 오른쪽 지구본 메뉴: 한국어, 중국어 간체, 일본어, 영어. 모바일에는 상단 언어 메뉴가 표시됩니다.
- `noplan.locale`에 언어 저장, 새로고침 및 다른 탭에서 유지. HTML `lang`과 날짜 표시도 변경됩니다.
- 화면 번역은 `src/i18n/messages.ts`, `mobileMessages.ts`, `siteMessages.ts`, `reviewedMessages.ts`의 검수 가능한 사전 방식입니다. 무료 외부 번역기로 사용자 입력이나 여행 메모를 보내지 않습니다.
- 내비게이션, 여행 조건, 일정 편집, 장소 검색·상세, 모바일 주요 메뉴를 연결했습니다. 사전에 없는 문구, 사용자 작성 내용, 약관 원문, 외부 지도·후기 내용은 원문을 유지합니다. 모든 자유 텍스트를 자동 번역하는 기능은 아닙니다.
- 언어를 바꿔도 폼의 원래 값, 일정 ID, 관광지 ID, 추천 조건, 도보 1km/차량 7km 정책은 그대로 유지합니다.

## 관광공사 언어별 정보

백엔드 `routes/tourism/multilingual.js`에서 언어를 허용 목록으로 제한하여 아래 서비스에 연결합니다.

| 선택 | 서비스 |
| --- | --- |
| 한국어 | KorService2 (기존) |
| English | EngService2 |
| 中文（简体） | ChsService2 |
| 日本語 | JpnService2 |

- `GET /api/tourism/search?...&locale=en`: 기존 한국어 장소 목록에 대응하는 공식 번역을 덧붙입니다. 번역된 이름·주소로 검색할 수 있고 저장할 때에는 한국어 원본 ID를 사용합니다.
- `GET /api/tourism/:id?type=12&locale=en`: 언어별 실제 콘텐츠 ID로 공식 상세정보를 요청합니다.
- `GET /api/tourism/translations?ids=...&locale=en`: 일정·검색 카드의 이름과 주소에 사용할 번역을 최대 100개씩 조회합니다.
- 외국어 제목의 괄호 안 또는 괄호 앞 한국어 이름, 장소 분류, 100m 이내 좌표를 모두 대조합니다. 중복/모호한 대응은 사용하지 않습니다. 가까운 다른 장소를 번역으로 붙이지 않습니다.
- 번역이 없거나 확인할 수 없는 경우 한국어 정보를 유지하고 상세 화면에 안내합니다. 관광공사 외국어 자료가 국문 전체와 일대일 대응하지 않으므로 번역되지 않는 장소가 있을 수 있습니다. 외국어 여행코스(국문 분류 25)는 현재 원문으로 안내합니다.
- 언어·지역별 캐시와 동시 요청 합치기, 오류 재호출 제한을 적용했습니다. 키와 제공기관 오류 본문을 프론트로 전달하지 않습니다.

## 배포 전 필요한 작업

**프론트와 백엔드를 모두 배포해야 합니다.**

2026-09-20 활용신청 반영 후 영문·중문 간체·일문 모두 HTTP 200 / resultCode 0000을 확인했습니다. 관광공사 키는 서버의 PUBLIC_DATA_SERVICE_KEY에만 설정합니다.

### 공개 행사·코스 번역

- 정적 UI 문구는 빌드된 사전으로 표시하여 방문할 때마다 API 요금이 발생하지 않습니다. 랜딩의 휴대폰 예시도 선택 언어로 표시합니다.
- 공개 행사 이름·설명과 공개 공유 코스는 서버에서 공개 여부를 확인한 뒤 OpenAI로 번역합니다. 클라이언트가 임의 텍스트를 제출하는 API는 없습니다. 사용자 프로필, 개인 일정, 여행 메모는 번역 대상에 넣지 않습니다.
- GET /api/events/:id/translations?locale=en 및 GET /api/course/explore/public-translations/:id?locale=en. 일본어 ja, 중국어 zh-CN도 지원합니다.
- EC2에 기존 OPENAI_API_KEY가 필요합니다. 모델은 PUBLIC_TRANSLATION_MODEL → OPENAI_MODEL 순서로 선택하며 기본값은 gpt-5.6-luna입니다. 공개 콘텐츠의 최초 번역에는 API 요금이 발생합니다.
- 번역 캐시는 30일이며 data/public-translation-cache.json에 저장됩니다. 배포 시 이 파일을 유지하고 서버 프로세스가 data 디렉터리에 쓸 수 있게 합니다. 프로세스별 일일 입력 문자 제한은 PUBLIC_TRANSLATION_DAILY_CHARS(기본 150000), 동시 요청은 3개입니다. 재시작하면 메모리의 일일 사용량은 초기화되므로 계정의 과금 한도와 별도로 관리합니다.
- 영어·중국어·일본어 공개 샘플을 실제 API로 확인했습니다. 번역 실패 시 원문과 안내를 보여주며 일정 원본 이름·ID를 변경하지 않습니다.
- 공식 포스터 이미지 안의 한글, 사용자 작성 원문, 약관, 외부 지도는 이 번역 범위에 포함되지 않습니다. 관광공사 자료가 없는 장소는 위 원문 대체 정책을 따릅니다.

프론트 빌드 배포 후 백엔드 변경 파일도 배포하고 프로세스를 재시작해야 합니다. 운영 사이트에 자동 배포한 것은 아닙니다.

## 검증

- `npm run build`
- `node scripts/test-i18n.cjs`
- 백엔드: `node --test tests/multilingualTourism.test.js tests/tourismDetails.test.js tests/tourism.test.js tests/publicTranslations.test.js`
- 브라우저: 한/영/중/일 전환, 새로고침 후 언어 유지, 동행·날짜·교통 선택 유지 및 언어 메뉴 접근성을 확인합니다.
- 전체 lint에는 작업 전부터 있던 `dev-preview/course-cards.tsx`, `src/components/MapBoard.tsx` 오류가 남아 있습니다.
