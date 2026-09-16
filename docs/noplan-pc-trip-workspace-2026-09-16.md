# PC 여행 계획 화면 및 여행 저장 — 3단계 구현

작성일: 2026-09-16. 사용자 요청에 따라 모바일 개편(2단계)보다 PC 여행 계획(3단계)을 먼저 구현했다. 로컬 개발 및 검증 완료, 운영 배포·커밋·푸시 없음.

## 화면과 경로

- `/app`: 1024px 이상에서는 관광 이미지와 목적지·날짜·교통·동행 입력이 있는 PC 홈. 그 미만에서는 기존 모바일 추천 홈. 크기 변경 시 입력 중인 내용과 추천 상태를 유지한다.
- `/app/trips`: 여행 생성 및 내 여행 목록. 로그인 전 작성한 초안을 로그인 후 명시적으로 이어서 작성할 수 있다.
- `/app/trips/:id`: 날짜 목록 / 시간 구간 타임라인 / 노피 일정 도우미의 PC 3열 편집 화면. 모바일에서는 날짜 탭과 타임라인을 먼저 보여주고 구간을 선택하면 상세 영역으로 이동한다.
- `/app/quick`: 기존 주변 코스 추천. PC에서도 채팅형·버튼 선택형 추천을 사용할 수 있다.
- 모바일 홈과 마이에 ‘내 여행 노트’ 진입을 추가했다. 모바일의 배너 순서·카테고리·찜 화면 등 2단계 개편은 이번 범위가 아니다.

## 사용할 수 있는 기능

1. 1~14일 여행 생성. 당일치기·숙박 여행을 기간에서 계산한다. 여행지까지 이동과 현지 이동을 별도 선택한다.
2. 날짜별 오전·오후·저녁 기본 구간 생성. 구간 추가, 제목·지역·시각·메모 수정, 다른 날짜로 이동, 삭제. 같은 날짜의 겹치는 구간은 저장하지 않는다.
3. 장소 직접 추가, 주소·체류 시간 수정, 순서 변경, 고정·해제, 삭제. 고정한 장소는 순서 변경과 삭제를 막고 추천 적용 시 유지한다.
4. 선택 구간 안에서 기존 추천 API 호출 → 변경 미리보기 → 명시적으로 적용. 기존 장소 뒤에 추가하며 다른 구간은 수정하지 않는다.
5. 추천 요청 중 일정이 바뀌거나 추천 후 조건을 바꾸면 오래된 결과를 적용하지 못한다. API 실패 시 예시 장소를 실제 추천으로 넣지 않는다.
6. 여행 이름·목적지·동행·교통·여행 날짜 수정. 날짜 변경 시 DAY 순서대로 내용을 유지하며, 기간 단축은 제외되는 날짜를 안내한다.
7. 최근 20회 편집 되돌리기. 브라우저 초안 자동 보관, 계정에 명시적 저장. 저장 충돌 시 최신 내용 열기 또는 현재 작업본을 새 여행으로 복사.
8. 추천 장소 좌표를 지도에서 표시. 직접 입력한 장소는 카카오맵 검색 링크 제공. 장소 이름·주소를 수정하면 기존 좌표를 제거해 잘못된 위치가 표시되지 않게 한다.

## 저장 및 백엔드

백엔드 저장소: `D:/Backend/NoPlan`.

- `GET /api/trips`: 로그인 계정의 최근 여행 100개.
- `GET /api/trips/:id`: 해당 계정 소유 여행 조회.
- `PUT /api/trips/:id`: `{ version, document }` 저장. 신규는 version 0, 저장 성공마다 증가.
- 소유자는 요청 body가 아닌 기존 서명 세션의 `req.auth.userId`로 결정한다.
- UPDATE는 id + owner_id + version 조건을 모두 확인한다. 최신 버전과 다르면 409를 반환하며 기존 내용을 덮어쓰지 않는다.
- 날짜·중복 식별자·시간 겹침·문자 길이·좌표·URL 프로토콜·개수 제한을 서버에서도 확인한다.
- `noplan_trips` 테이블은 첫 여행 API 사용 시 `CREATE TABLE IF NOT EXISTS`로 준비한다. MySQL JSON 지원 및 해당 DB 사용자의 테이블 생성 권한이 필요하다. 준비 실패 시 다음 요청에서 재시도한다. 이번 작업에서는 실제 DB에 연결하거나 DDL을 실행하지 않았다.
- 기존 추천 API 및 사용량 제한은 그대로 사용한다.

브라우저 초안은 `noplan.trip.draft.v1:<userId 또는 guest>`에 최대 30개 보관한다. 초안은 기기별이며, 계정 저장을 해야 다른 기기에서 조회할 수 있다. 브라우저 저장 실패와 서버 저장 실패는 편집 내용을 유지하면서 화면에 안내한다. 새로고침 시 history의 최초 생성 정보보다 최신 초안을 우선한다.

## 현재 추천 범위와 후속 기능

여행 계획 자체는 자유롭게 작성할 수 있지만 AI 추천은 현재 서울·도보 일정에 한정한다. 구간의 남은 시간과 다음 구간 시작 시각을 상한으로 사용한다. 장소 사이 이동 여유는 편집기에서 15분으로 임시 계산한다. 다음 구간의 도착 지점까지 실제 이동 가능성을 보장하는 전체 여행 경로 최적화는 아직 구현하지 않았다. 예약 시각·교통시간은 사용자가 확인하도록 화면에 표시한다.

친구 초대, 멤버 권한, 실시간 동시 편집은 4단계 후속 기능이다. 이번 버전의 충돌 검사는 실시간 협업 기능을 의미하지 않는다. 항공·숙박 예약·결제 및 전국 추천 확장도 이번 구현 범위에 포함하지 않는다.

## 디자인 자산

기존 노피 아이콘과 보라색 브랜드를 유지하고, 넓은 관광 이미지·얇은 경계·여백·차분한 색으로 PC 화면을 구성했다.

- 생성 방식: 내장 `image_gen` 도구, 신규 이미지 생성.
- 원본: `D:/VSCode/NoPlan/noplan-web/src/assets/travel/coastal-escape.png`
- 실제 웹 표시: `D:/VSCode/NoPlan/noplan-web/src/assets/travel/coastal-escape.webp` (1536×1024, 약 289KB). 생성 원본을 WebP로 인코딩했다.
- 실제 특정 관광지의 사진으로 표시하지 않으며 대체 텍스트에 여행 일러스트임을 명시했다.
- 사용한 최종 프롬프트:

> Use case: illustration-story. Asset type: wide hero background for Korean tourism and travel itinerary planning website NoPlan. Create a premium editorial travel illustration, sophisticated collage of a Korean coastal escape: blue turquoise sea, curved green coastline, warm ivory sand, small dark volcanic rocks, a quiet walking path and distant green hills. Atmospheric late morning sunlight, subtle fine-grain painterly photographic texture, natural elegant greens and blues with warm cream. Landscape 3:2 composition, landscape detail concentrated in RIGHT TWO THIRDS, left third light soft pale sky/sea negative space to be covered by website text. No people closeups, no text, no typography, no labels, no interface, no border, no brand, no icons, no watermark. This is a conceptual travel illustration not a map or a claim about an exact destination.

## 검증

- 프론트 TypeScript 및 production build 통과.
- 신규 여행 화면·모델·API·PC 메뉴 ESLint 통과.
- 백엔드 전체 테스트 245개 통과. 신규 4개 테스트는 정상 저장, 입력 경계값, 서명 세션 인증, 계정 격리, stale version 거절, 소유자/버전 SQL 조건, 스키마 초기화 재시도를 포함한다.
- Edge 브라우저 320/390/768/1024/1440/1920px 확인: 가로 넘침 없음, PC·모바일 홈 전환과 입력 유지, 여행 생성, 구간 수정, 고정 장소, 새로고침 초안 복원, 추천 시간 상한·미리보기·적용, 장소 체류시간 수정, 저장, 충돌·복사·최신 불러오기, 초안 없는 다른 기기 조회, 모바일 상세·대화상자, 지도 영역, API 실패, 기간 연장·되돌리기.
- 기존 버튼형 추천 주소/시간 입력, 채팅 조건 확인, 탐색 상세, 코스 시작, 지도 resize, 마이·장소 상세도 회귀 확인했다.
- 브라우저 테스트에서는 API와 지도 SDK를 대역으로 사용했다. 실제 MySQL, 외부 추천 공급자, 운영 지도 타일을 대상으로 한 통합 테스트는 실행하지 않았다. 운영 데이터 변경이나 유료 API 호출 없음.

브라우저 검증 스크립트 및 캡처는 이 작업의 로컬 산출물 폴더에 있다:
`C:/Users/user/.codex/visualizations/2026/09/16/01a0a8b8-6814-7db3-a7bd-3d6e48743e54/`

- `verify-trips.cjs`, `verify-existing-flows.cjs`
- `trip-home-desktop.png`, `trip-editor-desktop.png`, `trip-editor-mobile.png`
