# NoPlan 랜딩페이지 및 `/app` 서비스 이전 개발 전달서

- 작성일: 2026-08-12
- 대상 프로젝트: `D:\VSCode\NoPlan\noplan-web`
- 디자인 참고 이미지: `docs/assets/noplan-landing-reference.png`
- 목적: `noplan.live`를 브랜드 랜딩페이지로 전환하고 기존 서비스를 `noplan.live/app` 아래로 안전하게 이전
- 작업 방식: 랜딩 미리보기부터 구현한 뒤 사용자 승인 후 실제 URL을 전환

## 0. 개발 페이지에 전달할 최상위 요청

이 문서를 처음부터 끝까지 읽고 현재 프론트엔드 코드와 대조한 뒤 구현한다.

이번 작업의 핵심은 단순히 `/` 화면을 교체하는 것이 아니다. 기존 서비스의 로그인, 소셜 인증, 공유 코스, 내부 이동 경로와 이전 URL 호환성을 보존하면서 다음 구조를 만드는 작업이다.

```text
noplan.live                   브랜드 랜딩페이지
noplan.live/app               기존 NoPlan 서비스 홈
noplan.live/app/planner/...   추천 검색 과정
noplan.live/app/explore       탐색
noplan.live/app/course/...    코스
noplan.live/app/mypage        마이페이지
```

`/services`는 사용하지 않는다. 여러 상품을 소개하는 URL처럼 보이므로 실제 제품 진입 주소는 `/app`으로 통일한다.

다음 두 단계를 한꺼번에 운영 반영하지 않는다.

1. 1차: `/landing-preview`에 랜딩페이지를 구현하고 캡처 및 검증 결과를 보고한다.
2. 2차: 사용자가 랜딩을 승인한 뒤 `/`와 `/app`의 실제 라우팅을 전환한다.

사용자 승인 전에는 기존 `/` 서비스를 이동하거나 기존 경로를 바꾸지 않는다.

---

## 1. 확정된 URL 구조

### 공개 브랜드 영역

| URL | 역할 |
|---|---|
| `/` | 승인 이후 공개할 NoPlan 랜딩페이지 |
| `/landing-preview` | 승인 전 랜딩페이지 검수용 임시 경로 |
| `/privacy` | 개인정보처리방침. 기존 경로 유지 |
| `/supporters` | 서포터즈 페이지. 기존 경로 유지 |
| `/admin/places` | 관리자 장소 관리. 기존 경로 유지 |

### 사용자 서비스 영역

| 기존 URL | 신규 URL | 화면 |
|---|---|---|
| `/` | `/app` | `PlannerHome` |
| `/planner/chat` | `/app/planner/chat` | `ChatStart` |
| `/planner/condition` | `/app/planner/condition` | `ConditionConfirm` |
| `/planner/searching` | `/app/planner/searching` | `SearchingScreen` |
| `/planner/result` | `/app/planner/result` | `ResultScreen` |
| `/explore` | `/app/explore` | `ExploreTab` |
| `/course/map` | `/app/course/map` | `CourseMapScreen` |
| `/course/place/:index` | `/app/course/place/:index` | `PlaceDetailScreen` |
| `/course/replace/:index` | `/app/course/replace/:index` | `ReplacementCandidates` |
| `/mypage` | `/app/mypage` | `MyPageView` |
| `/chatbot` | `/app/planner/chat` | 기존 별칭 리다이렉트 |
| `/login` | `/app/login` | 로그인 |
| `/signup` | `/app/signup` | 일반 회원가입 |
| `/kakao-signup` | `/app/kakao-signup` | 카카오 추가정보 입력 |
| `/naver-signup` | `/app/naver-signup` | 네이버 추가정보 입력 |
| `/google-signup` | `/app/google-signup` | 구글 추가정보 입력 |

### 소셜 로그인 콜백

다음 콜백 URL은 외부 개발자 콘솔에 등록된 주소와 연결되므로 루트 경로를 그대로 유지한다.

```text
/auth/kakao/callback
/auth/naver/callback
/auth/google/callback
```

이번 작업에서는 카카오·네이버·구글 개발자 콘솔에 등록된 redirect URI를 변경하지 않는다. 콜백 처리 완료 후 프론트엔드에서 이동하는 목적지만 `/app` 또는 `/app/*-signup`으로 변경한다.

---

## 2. 단계별 구현 및 승인 게이트

## Phase 1 — 랜딩 미리보기 구현

Phase 1에서는 아래 작업만 수행한다.

- `LandingPage` 신규 구현
- `/landing-preview` 라우트 추가
- 참고 이미지의 시각적 방향을 현재 NoPlan 브랜드에 맞춰 재현
- 데스크톱 및 모바일 반응형 구현
- 랜딩의 `노플랜 시작하기` CTA는 현재 서비스 홈 `/`으로 연결
- 랜딩 내부 메뉴 스크롤 구현
- 아직 `/`와 기존 서비스 경로는 변경하지 않음
- 기존 서비스와 로그인 흐름에 회귀가 없는지 확인

Phase 1 완료 후 다음 자료를 제공하고 멈춘다.

- 데스크톱 1440px 전체 페이지 캡처
- 모바일 390px 전체 페이지 캡처
- 모바일 첫 화면 390px 캡처
- Hero 덮기 전환, scroll reveal과 `발견 / 선택 / 연결` 이미지 교체가 보이는 짧은 화면 녹화 또는 GIF
- 구현 파일 목록
- 랜딩에서 사용한 실제 문구 목록
- 미구현 기능처럼 보이거나 사실 확인이 필요한 문구 목록
- 빌드 및 lint 결과

사용자가 명시적으로 랜딩을 승인하기 전에는 Phase 2를 진행하지 않는다.

## Phase 2 — 공개 랜딩 및 `/app` 이전

사용자 승인 후에만 다음을 수행한다.

- `/landing-preview`의 승인된 랜딩을 `/`에 배치
- 기존 `PlannerHome`을 `/app`으로 이동
- 모든 사용자 서비스 내부 경로를 `/app/*`로 통일
- 기존 URL 호환 리다이렉트 추가
- 로그인 및 소셜 가입 완료 후 `/app`으로 이동
- 공유 코스 구형 링크와 신규 링크를 모두 지원
- 하단 내비게이션과 각 화면의 홈 이동을 `/app`으로 수정
- 검증이 끝나면 `/landing-preview`를 제거하거나 개발 환경에서만 노출

---

## 3. 랜딩페이지 디자인 기준

참고 이미지:

```text
docs/assets/noplan-landing-reference.png
```

참고 이미지를 픽셀 단위로 복제하지 않는다. 구성과 분위기를 참고하되 현재 NoPlan 서비스가 실제 제공하는 기능과 이미지에 맞춰 구현한다.

### 원하는 인상

- 신뢰할 수 있는 지역 추천 서비스
- 20대 사용자가 부담 없이 사용할 수 있는 세련되고 부드러운 인상
- 라벤더를 중심으로 하되 지나치게 귀엽거나 유아적이지 않은 화면
- 여백이 충분하고 콘텐츠가 빠르게 이해되는 화면
- 실제 서비스가 이미 작동하고 있다는 신뢰가 느껴지는 화면
- 파트너가 보더라도 서비스 목적과 협업 가능성을 이해할 수 있는 화면

### 기본 색상

```css
--landing-brand: #D0C5F8;
--landing-brand-soft: #F5F2FF;
--landing-brand-strong: #5A4799;
--landing-brand-pressed: #49377F;
--landing-bg: #FAF9FC;
--landing-surface: #FFFFFF;
--landing-ink: #1C1B29;
--landing-text: #322F3E;
--landing-muted: #706B7D;
--landing-border: #E4DFEC;
```

- `#D0C5F8` 위에는 흰 글자를 사용하지 않는다.
- 중요한 CTA는 `#5A4799` 배경과 흰 글자를 사용한다.
- 라벤더는 배경 강조, 배지, 아이콘 배경과 그래픽에 사용한다.
- 넓은 면적을 진한 보라색으로 채우지 않는다.
- 실제 장소 사진의 색을 보라색 필터로 덮지 않는다.
- 성공, 경고, 오류 같은 의미 색상을 보라색으로 통일하지 않는다.
- 기존 사용자 서비스의 파란 테마를 이번 Phase 1에서 변경하지 않는다. 랜딩 스타일은 랜딩 전용으로 격리한다.

### 레이아웃

- 데스크톱 최대 콘텐츠 폭: 약 1180~1240px
- 상단 내비게이션은 간결하게 유지
- 모바일 320px부터 정상 동작
- 랜딩에서는 기존 서비스의 `AppFrame`, 휴대폰 프레임, 하단 내비게이션을 사용하지 않음
- 섹션마다 과도한 카드와 장식 요소를 추가하지 않음
- 데스크톱에서만 성립하는 배치가 되지 않도록 모바일 우선으로 설계
- 애니메이션은 가벼운 등장과 CTA 상태 변화 정도로 제한하고 `prefers-reduced-motion`을 존중

---

## 4. 랜딩페이지 정보 구조와 확정 문구

페이지가 지나치게 길어지지 않도록 다음 7개 영역으로 제한한다.

### 4.1 상단 내비게이션

왼쪽:

- NoPlan 로고 또는 `noplan` 워드마크
- 클릭 시 랜딩 최상단으로 이동

오른쪽:

- `서비스` → `#how-it-works`
- `지역 콘텐츠` → `#local-content`
- `파트너십` → `#partnership`
- `노플랜 시작하기` → Phase 1에서는 `/`, Phase 2에서는 `/app`

참고 이미지의 `앱 다운로드`는 사용하지 않는다. 실제 네이티브 앱 다운로드가 준비되지 않은 상태에서 앱 다운로드를 표시하지 않는다.

모바일에서는 로고, `노플랜 시작하기`, 메뉴 버튼만 표시하고 나머지 항목은 접근 가능한 모바일 메뉴로 제공한다.

### 4.2 Hero

권장 문구:

```text
내 취향에 맞는 홍대 코스 추천

갈 만한 곳,
노플랜이 다 찾아드릴게요.

무엇을 할지, 누구와 가는지 알려주세요.
홍대의 장소를 취향과 동선에 맞는 코스로 연결해드려요.
```

CTA:

- Primary: `빠른 추천 받기`
- Secondary: `서비스 알아보기`

동작:

- `빠른 추천 받기`: Phase 1 `/`, Phase 2 `/app`
- `서비스 알아보기`: `#how-it-works`로 부드럽게 스크롤

Hero 오른쪽은 실제 NoPlan 모바일 화면을 사용한다.

- 현재 서비스에서 실제로 존재하는 홈, 추천 결과, 코스 지도 화면 캡처를 우선 사용
- 기능이 구현된 것처럼 보이는 가짜 화면을 새로 만들지 않음
- 이미지가 준비되지 않았다면 임시 placeholder임을 코드와 보고서에 명확히 표시
- 참고 이미지처럼 2~3개의 모바일 화면을 겹칠 수 있으나 모바일에서는 한 화면만 보여도 됨

### 4.3 문제와 해결 방식

제목:

```text
저장한 장소는 많은데,
막상 어디 갈지는 어렵습니다.
```

핵심 문제는 최대 3개만 표시한다.

- 장소 정보가 여러 검색과 SNS에 흩어져 있습니다.
- 인기순 추천은 지금의 목적과 취향을 충분히 반영하지 못합니다.
- 여러 장소를 직접 조합해 이동 동선을 짜야 합니다.

`SNS 데이터를 자동 수집한다`, `실시간으로 모든 지역을 분석한다`와 같이 현재 구현 범위를 넘어서는 표현은 사용하지 않는다.

### 4.4 작동 방식

섹션 ID: `how-it-works`

제목:

```text
장소를 찾고, 이해하고, 연결합니다.
```

3단계:

1. `발견` — 홍대의 장소와 공개 코스를 탐색합니다.
2. `선택` — 상황, 취향, 인원과 원하는 분위기를 반영합니다.
3. `연결` — 선택한 장소를 실제로 이동할 수 있는 코스로 확인합니다.

참고 시안의 복잡한 일러스트를 그대로 제작하지 않아도 된다. 실제 서비스 화면, 간단한 아이콘과 작은 설명으로 충분하다.

### 4.5 기존 검색과 NoPlan 비교

제목:

```text
인기순이 아니라,
나와 장소의 적합도를 봅니다.
```

비교 내용:

```text
기존 검색
- 검색어와 평점 중심
- 장소를 하나씩 확인
- 이동 순서를 직접 구성

NoPlan
- 상황과 취향을 함께 반영
- 홍대의 장소와 공개 코스를 탐색
- 여러 장소를 하나의 코스로 연결
```

NoPlan이 실제로 계산하거나 제공하지 않는 수치, 정확도, AI 성능을 표시하지 않는다.

### 4.6 지역 콘텐츠

섹션 ID: `local-content`

제목:

```text
추천하기 전에,
먼저 지역을 들여다봅니다.
```

설명:

```text
홍대에서 직접 확인하고 등록한 장소와 코스를 바탕으로
사용자의 상황에 맞는 선택지를 연결합니다.
```

현재 DB에는 홍대 권역만 있으므로 다른 지역을 지원하는 것처럼 표시하지 않는다.

- 실제 DB에 등록된 홍대 장소 사진을 사용
- 사진 출처와 사용 권한을 확인
- 장소가 삭제되거나 사진이 없을 때 레이아웃이 깨지지 않게 fallback 제공
- 인스타그램 UI, 캐릭터, 로고를 모방했다는 표현은 사용하지 않음

### 4.7 파트너십 CTA와 Footer

섹션 ID: `partnership`

제목:

```text
지역의 좋은 공간이
더 잘 발견되는 방법을 함께 만듭니다.
```

설명:

```text
공간, 상권, 지역 콘텐츠와 데이터 분야의 파트너를 기다립니다.
```

CTA:

- `파트너십 문의`
- 실제 문의 주소나 폼이 준비되지 않았다면 클릭되지 않는 가짜 버튼을 만들지 않음
- 준비 전에는 `문의 준비 중`을 표시하거나 사용자에게 문의 수단을 확인한 뒤 연결
- `사업 미팅 신청`은 실제 신청 수단이 확정된 경우에만 노출

Footer:

- NoPlan 워드마크
- 서비스 소개
- 이용약관 링크가 실제 존재할 때만 노출
- 개인정보처리방침 `/privacy`
- 문의하기
- 소셜 링크는 실제 운영 계정만 노출
- 저작권 연도는 `new Date().getFullYear()`로 자동 표시

---

## 4-A. 랜딩페이지 모션 및 슬라이드 애니메이션 명세

### 4-A.1 참고 사이트와 적용 원칙

모션 참고 사이트:

```text
https://triple.guide/intro?pid=itineraries_web&is_retargeting=true&af_dp=triple%3A%2F%2F%2Fmain
```

참고 사이트에서 확인된 핵심 동작은 다음 세 가지다.

1. 첫 Hero를 뒤에 유지하면서 다음 흰색 섹션이 둥근 패널처럼 위로 올라와 덮는 전환
2. 섹션의 텍스트와 이미지가 아래에서 위로 이동하며 나타나는 1회성 scroll reveal
3. 사용자가 항목을 선택하면 기존 이미지가 내려가며 사라지고 신규 이미지가 올라오며 나타나는 교차 슬라이드

NoPlan은 위 동작 원리를 참고하되 해당 사이트의 코드, 이미지, 문구와 레이아웃을 복제하지 않는다. NoPlan의 라벤더 색상, 실제 서비스 캡처와 확정 문구로 구현한다.

모션의 목적은 서비스를 이해시키는 것이다. 단순 장식, 무한 반복, 긴 대기와 과도한 패럴랙스는 사용하지 않는다.

### 4-A.2 공통 모션 토큰

랜딩 전용 CSS 범위 안에 다음과 같은 의미 기반 토큰을 정의한다. 정확한 변수명은 현재 코드 규칙에 맞게 조정할 수 있지만 값의 역할은 유지한다.

```css
.landing-page {
  --landing-motion-fast: 180ms;
  --landing-motion-base: 560ms;
  --landing-motion-slow: 720ms;
  --landing-motion-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --landing-motion-distance-sm: 24px;
  --landing-motion-distance-md: 40px;
  --landing-motion-distance-lg: 60px;
  --landing-motion-stagger: 90ms;
}
```

- 버튼 hover와 작은 상태 변화: 160~200ms
- 일반적인 텍스트 및 이미지 등장: 520~650ms
- Hero와 이미지 세트 교체처럼 큰 전환: 650~750ms
- 한 섹션의 전체 지연 시간: 300ms 이하
- 한 화면에서 동시에 움직이는 큰 요소: 최대 3개

프로젝트에는 현재 애니메이션 전용 라이브러리가 없다. 이번 랜딩만을 위해 무거운 라이브러리를 추가하지 않는다. CSS transition, `IntersectionObserver`, 필요한 경우 `requestAnimationFrame`으로 구현한다. 외부 패키지가 반드시 필요하다고 판단하면 먼저 필요성과 번들 증가량을 보고하고 승인받는다.

### 4-A.3 Hero 최초 진입

페이지를 처음 열었을 때 다음 순서로 한 번만 등장한다.

```text
0ms      Hero 라벨과 핵심 제목 시작
80ms     설명 문구 시작
160ms    Primary / Secondary CTA 시작
220ms    첫 번째 서비스 화면 이미지 시작
320ms    두 번째 서비스 화면 이미지 시작
420ms    세 번째 서비스 화면 이미지 시작
```

각 요소의 기본 동작:

```text
초기: opacity 0, translateY(24px)
완료: opacity 1, translateY(0)
시간: 560~650ms
```

- 텍스트 한 글자 또는 한 줄 단위 애니메이션 금지
- 라벨, 제목, 설명을 각각 지나치게 잘게 쪼개지 않음
- 첫 화면의 핵심 제목은 200ms 이상 완전히 보이지 않는 상태로 두지 않음
- 휴대폰 화면은 2~3개를 사용할 수 있지만 모바일에서는 대표 화면 하나를 우선 표시
- 서비스 화면 이미지는 작은 scale 효과를 함께 쓰지 말고 이동과 fade만 사용
- Hero CTA가 나타날 때 클릭 영역의 위치가 바뀌지 않도록 최초 레이아웃 공간을 확보

### 4-A.4 Hero에서 다음 섹션으로 넘어가는 덮기 전환

Hero 다음의 문제 제시 섹션은 일반적인 직선 구분선 대신 둥근 흰색 패널 형태로 Hero 위를 덮는다.

권장 구조:

```text
landing-hero-stage
  landing-hero-background
  landing-hero-content

landing-main
  landing-problem-panel
  나머지 섹션
```

동작:

- Hero는 92~100svh 높이의 첫 화면을 구성
- Hero 배경 또는 그래픽은 첫 구간 동안만 뒤에 머무르게 함
- 다음 문제 제시 섹션은 `position: relative`와 높은 z-index를 사용해 Hero 위로 올라오게 함
- 문제 제시 섹션 상단 모서리는 데스크톱 40~56px, 모바일 24~32px 범위
- 스크롤 초반 Hero 콘텐츠는 데스크톱 최대 60px, 모바일 최대 32px까지만 위로 이동
- Hero 콘텐츠 opacity는 완전히 사라지게 하지 않아도 되며 패널에 가려지는 방식이 우선
- 흰색 패널이 Hero 위로 올라오는 동안 레이아웃 높이가 바뀌거나 화면이 튀지 않아야 함

구현 시 `background-attachment: fixed`에 의존하지 않는다. 모바일 성능 문제를 줄이기 위해 sticky 또는 제한된 transform 기반으로 구성한다.

스크롤 이벤트마다 React state를 직접 갱신하지 않는다. 연속 스크롤 값을 사용해야 한다면 `requestAnimationFrame`으로 프레임당 한 번만 DOM style을 갱신하고 컴포넌트 unmount 시 listener를 정리한다.

### 4-A.5 공통 scroll reveal

Hero 이후의 섹션에는 공통 reveal 방식을 사용한다.

기본 상태:

```css
opacity: 0;
transform: translateY(32px);
```

활성 상태:

```css
opacity: 1;
transform: translateY(0);
transition:
  opacity 480ms var(--landing-motion-ease),
  transform 620ms var(--landing-motion-ease);
```

구현 규칙:

- `IntersectionObserver`를 사용
- 약 10~20%가 보이거나 viewport 하단보다 약간 안쪽으로 들어왔을 때 시작
- 한 번 등장한 요소는 다시 숨기지 않음
- 사용자가 위로 스크롤해도 애니메이션을 반복하지 않음
- 제목 그룹, 설명 그룹, 이미지 그룹처럼 의미 단위로 적용
- 한 글자, 한 단어, 장소 사진 한 장마다 observer를 만들지 않음
- observer 대상은 페이지 전체에서 관리하거나 재사용 가능한 hook으로 구현
- unobserve 및 cleanup 처리

JS가 실패하거나 비활성화되어도 콘텐츠가 영구적으로 `opacity: 0`이 되면 안 된다. 기본 HTML/CSS는 보이는 상태로 렌더링하고, 클라이언트가 준비된 뒤 랜딩 최상위에 motion-ready 성격의 클래스를 붙여 아직 등장하지 않은 대상만 초기 상태로 전환한다.

권장 묶음:

| 랜딩 영역 | Reveal 단위 |
|---|---|
| 문제 제시 | 제목·설명 1개 그룹, 문제 항목 1개 그룹 |
| 작동 방식 | 섹션 제목 1개 그룹, 단계 선택부 1개 그룹, 서비스 화면 1개 그룹 |
| 기존 검색 비교 | 섹션 제목 1개 그룹, 기존 검색 1개 그룹, NoPlan 1개 그룹 |
| 지역 콘텐츠 | 제목·설명 1개 그룹, 장소 사진 모음 1개 그룹 |
| 파트너십 | CTA 영역 전체 1개 그룹 |

### 4-A.6 카드 순차 등장

`발견 / 선택 / 연결` 카드나 장소 카드가 여러 개일 때만 짧은 stagger를 사용한다.

- 카드 간 시작 차이: 80~100ms
- 카드 수가 4개를 초과하면 모든 카드에 계속 delay를 증가시키지 않음
- 최대 delay: 300ms
- 카드 이동 거리: 데스크톱 24~32px, 모바일 16~24px
- 카드마다 서로 다른 방향에서 날아오게 하지 않음
- 이미지 로딩 전후에 카드 높이가 달라지지 않도록 aspect-ratio 유지

모바일 장소 사진은 사용자가 직접 좌우로 스와이프할 수 있어도 되지만 자동 무한 슬라이드는 사용하지 않는다.

### 4-A.7 `발견 / 선택 / 연결` 인터랙티브 서비스 화면

작동 방식 섹션은 정적인 카드 세 장만 나열하지 말고 사용자가 직접 눌러볼 수 있는 서비스 설명부로 구현한다.

선택 항목:

```text
발견 — 홍대의 장소와 공개 코스를 탐색합니다.
선택 — 상황, 취향, 인원과 원하는 분위기를 반영합니다.
연결 — 선택한 장소를 실제로 이동할 수 있는 코스로 확인합니다.
```

각 항목은 현재 서비스에서 실제로 존재하는 화면과 연결한다.

| 선택 | 표시할 실제 화면 예시 |
|---|---|
| 발견 | `/app/explore`에 해당하는 탐색 화면 캡처 |
| 선택 | 검색 조건 또는 질문 선택 화면 캡처 |
| 연결 | 코스 지도 또는 코스 결과 화면 캡처 |

Phase 1에서는 아직 `/app` 이전 전이므로 화면 캡처만 신규 구조를 예상해서 표시하고 CTA 경로는 현재 서비스 경로를 사용한다.

#### 이미지 교체 모션

서비스 화면 stage는 높이와 너비를 고정하고 모든 화면 layer를 같은 위치에 겹친다. 화면 교체 때문에 아래 콘텐츠가 밀리면 안 된다.

정규화된 동작:

```text
기존 화면:
opacity 1, translateY(0)
→ opacity 0, translateY(40px)

신규 화면:
opacity 0, translateY(40px)
→ opacity 1, translateY(0)

시간: 650~720ms
easing: var(--landing-motion-ease)
```

- 신규 화면이 기존 화면보다 높은 z-index를 갖도록 전환
- 입력을 연속으로 눌러도 화면과 selected 상태가 어긋나지 않아야 함
- 전환 중 버튼을 완전히 막지 않아도 되지만 현재 진행 중인 animation을 정리하고 최종 선택으로 수렴시켜야 함
- 자동 재생 금지
- 마우스 hover만으로 선택을 변경하지 않음
- 기본값은 `발견`
- 이미지 alt는 선택된 기능을 설명
- 숨겨진 layer가 키보드 탐색 또는 스크린리더에 중복 노출되지 않도록 처리

#### 선택 버튼 접근성

- 가능하면 `role="tablist"`, `role="tab"`, `role="tabpanel"` 패턴 사용
- `aria-selected`와 연결된 panel id 제공
- 키보드 방향키 또는 Tab/Enter 조작 가능
- 선택 상태는 색상뿐 아니라 아이콘, 숫자 또는 굵기로도 표현
- 선택된 버튼은 `#D0C5F8` 배경과 진한 텍스트 사용

모바일에서는 버튼을 위쪽의 3개 탭 또는 세로 목록으로 배치하고 서비스 화면을 아래에 둔다. 좁은 화면에서 좌우 2단 레이아웃을 억지로 유지하지 않는다.

### 4-A.8 기존 검색 VS NoPlan 비교 애니메이션

비교 영역은 양쪽 패널을 서로 반대 방향에서 빠르게 날려 보내지 않는다.

권장 순서:

1. 섹션 제목과 설명 fade-up
2. 기존 검색 패널 fade-up
3. 90ms 뒤 NoPlan 패널 fade-up
4. 마지막에 가운데 `VS` 또는 연결 표시가 작은 fade로 등장

- 기존 검색을 사라지게 만들지 않음
- NoPlan 패널만 과도하게 확대하거나 흔들지 않음
- 두 패널이 모두 보인 상태에서 사용자가 내용을 비교할 수 있어야 함
- 모바일에서는 기존 검색 다음에 NoPlan을 세로로 배치하고 동일한 순서로 reveal

### 4-A.9 장소 사진과 카드 미세 인터랙션

- 스크롤 등장: 카드 묶음 단위 fade-up
- 데스크톱 hover: 카드 전체를 최대 2px 위로 이동
- 사진 hover: 선택적으로 최대 `scale(1.02)` 적용 가능
- hover transition: 180~220ms
- 모바일과 touch 환경에서는 hover scale 비활성화
- 사진을 계속 확대·축소하는 반복 애니메이션 금지
- 장소 사진에 보라색 필터나 과도한 blur를 적용하지 않음

### 4-A.10 헤더 전환

Hero 위의 헤더는 투명 또는 Hero와 어울리는 상태로 시작할 수 있다. 흰색 콘텐츠 영역으로 넘어오면 읽기 쉬운 흰색 헤더로 전환한다.

- 배경색, 글자색과 얇은 border 변화만 사용
- 전환 시간 180~240ms
- header 높이가 변하지 않음
- 스크롤 중 로고가 점프하지 않음
- 모바일 메뉴가 열려 있을 때는 항상 불투명한 surface 사용

### 4-A.11 모션 감소 환경

`prefers-reduced-motion: reduce`에서는 다음처럼 처리한다.

```css
@media (prefers-reduced-motion: reduce) {
  .landing-page *,
  .landing-page *::before,
  .landing-page *::after {
    scroll-behavior: auto;
  }
}
```

위 예시만 넣고 끝내지 말고 랜딩의 실제 motion class를 대상으로 다음을 보장한다.

- reveal 요소가 즉시 최종 상태로 표시
- Hero parallax 비활성화
- 이미지 교체는 위치 이동 없이 짧은 fade 또는 즉시 전환
- stagger delay 제거
- 자동 애니메이션은 원래도 사용하지 않음
- 기능과 정보가 그대로 접근 가능

### 4-A.12 성능 및 구현 금지사항

- 애니메이션 속성은 원칙적으로 `transform`과 `opacity`만 사용
- scroll 중 `top`, `left`, `width`, `height`, `margin` 연속 변경 금지
- scroll handler 안에서 매번 React state 갱신 금지
- 모든 요소에 항상 `will-change` 지정 금지
- 동작 직전 또는 실제로 필요한 큰 stage에만 제한적으로 사용
- 서로 다른 IntersectionObserver를 컴포넌트마다 무분별하게 생성하지 않음
- 대형 이미지가 로딩되기 전 stage 크기를 확보해 CLS 방지
- 화면 밖 이미지 lazy loading
- 모션을 위해 동일한 고해상도 이미지를 여러 번 중복 렌더링하지 않음
- 모바일에서 fixed background와 무거운 blur 조합 금지
- 스크롤을 강제로 특정 섹션에 붙이는 scroll hijacking 금지
- 무한 marquee, 자동 carousel, 자동 탭 전환 금지
- 글자 단위 등장, 회전, 튕김, 흔들림 효과 금지

### 4-A.13 모션 완료 조건

Phase 1 완료 시 다음을 모두 확인한다.

- [ ] Hero 문구와 서비스 화면이 정해진 순서로 한 번만 등장
- [ ] Hero 뒤에서 문제 제시 패널이 둥글게 덮여 올라오는 효과가 자연스러움
- [ ] 스크롤 reveal은 한 번만 실행되고 다시 숨지 않음
- [ ] reveal 시작 전에도 JS 실패 시 콘텐츠가 보임
- [ ] `발견 / 선택 / 연결`을 누르면 실제 서비스 화면이 교차 슬라이드로 전환
- [ ] 전환 중 빠르게 다른 탭을 눌러도 마지막 선택과 화면이 일치
- [ ] 이미지 stage 높이가 변하지 않아 아래 콘텐츠가 움직이지 않음
- [ ] 모바일에서 탭과 화면이 세로로 재배치되고 잘리지 않음
- [ ] 320px에서 가로 overflow 없음
- [ ] 키보드로 서비스 화면 탭을 변경할 수 있음
- [ ] reduced motion 환경에서 이동 애니메이션이 제거됨
- [ ] 기존 `/` 사용자 서비스에는 랜딩 모션 CSS와 observer가 적용되지 않음
- [ ] 애니메이션 중 의미 있는 layout shift가 없음
- [ ] 스크롤 중 눈에 띄는 끊김이 없음

결과 보고에는 정지 캡처만 제공하지 말고 다음 구간이 보이는 15~30초 길이의 짧은 화면 녹화 또는 GIF도 제공한다.

1. Hero에서 다음 섹션으로 넘어가는 구간
2. 일반 섹션 reveal
3. `발견 / 선택 / 연결`을 직접 눌러 이미지가 교체되는 구간
4. 모바일 390px에서 동일 동작

화면 녹화가 환경상 불가능하면 각 전환의 시작·중간·완료 캡처와 불가능한 이유를 보고한다.

---

## 5. 랜딩 구현 구조

기존 `PlannerScreens.tsx` 안에 랜딩을 추가하지 않는다. 랜딩은 서비스 기능 화면과 분리한다.

권장 구조:

```text
src/pages/landing/LandingPage.tsx
src/pages/landing/LandingHeader.tsx
src/pages/landing/LandingHero.tsx
src/pages/landing/LandingSections.tsx
src/pages/landing/LandingFooter.tsx
src/pages/landing/landing.css
src/assets/landing/
```

컴포넌트가 짧다면 파일 수를 줄여도 된다. 하지만 다음 조건은 지킨다.

- 랜딩 스타일은 `.landing-*` 또는 랜딩 최상위 scope 아래로 격리
- 기존 `.home-*`, `.screen`, `.phone-frame`, `.bottom-nav` 스타일을 덮어쓰지 않음
- 랜딩 때문에 기존 사용자 서비스 색상과 여백이 달라지지 않음
- 텍스트를 이미지 안에 구워 넣지 않음
- 핵심 이미지에는 적절한 `alt` 제공
- 장식 이미지는 빈 `alt` 사용
- 모든 CTA는 키보드로 접근 가능
- 섹션 anchor 이동 시 고정 헤더에 제목이 가려지지 않도록 `scroll-margin-top` 적용

---

## 6. `/app` 라우팅 이전 구현 지침

이 절은 Phase 2 승인 이후에만 적용한다.

### 6.1 라우트 상수 사용

문자열 경로를 여러 파일에 직접 반복하지 않도록 라우트 상수를 만든다.

권장 예시:

```ts
export const ROUTES = {
  landing: '/',
  appHome: '/app',
  plannerChat: '/app/planner/chat',
  plannerCondition: '/app/planner/condition',
  plannerSearching: '/app/planner/searching',
  plannerResult: '/app/planner/result',
  explore: '/app/explore',
  courseMap: '/app/course/map',
  myPage: '/app/mypage',
  login: '/app/login',
  signup: '/app/signup',
} as const;
```

동적 경로는 작은 함수로 제공한다.

```ts
export const coursePlaceRoute = (index: number | string) => `/app/course/place/${index}`;
export const courseReplaceRoute = (index: number | string) => `/app/course/replace/${index}`;
```

예시는 방향을 설명하기 위한 것이며 현재 프로젝트 타입과 구조에 맞게 구현한다.

### 6.2 AppFrame 분리

랜딩페이지에 사용자 서비스의 `AppFrame`과 `BottomNav`가 나타나면 안 된다.

- `/`와 `/landing-preview`는 일반 전체 폭 페이지
- `/app/*`는 기존 `AppFrame` 사용
- 인증, 개인정보처리방침, 서포터즈와 관리자는 현재의 full-page 동작 유지
- `location.pathname.startsWith('/app/planner')` 등 신규 경로 기준으로 내비게이션 숨김 조건 수정
- 동적 상세 경로에서도 기존과 동일하게 하단 내비게이션 숨김

현재 `fullPagePaths.includes(location.pathname)`처럼 정확한 문자열 비교만 사용하면 동적·중첩 경로에서 누락될 수 있다. 라우트 계층 또는 명시적인 prefix 판단으로 안전하게 정리한다.

### 6.3 하단 내비게이션

다음 경로로 변경한다.

```text
홈   → /app
탐색 → /app/explore
코스 → /app/course/map
마이 → /app/mypage
```

`/app` 홈은 하위 경로까지 항상 active가 되면 안 된다. 홈은 pathname이 정확히 `/app`일 때만 활성화한다.

### 6.4 로그인과 회원가입

반드시 다음을 수정한다.

- 일반 로그인 성공 → `/app`
- 일반 회원가입 완료 → `/app/login` 또는 현재 정책에 맞는 `/app`
- 카카오 기존 회원 로그인 성공 → `/app`
- 구글 기존 회원 로그인 성공 → `/app`
- 네이버 기존 회원 로그인 성공 → `/app`
- 신규 카카오 회원 → `/app/kakao-signup`
- 신규 구글 회원 → `/app/google-signup`
- 신규 네이버 회원 → `/app/naver-signup`
- 인증 실패 → `/app/login`
- 추가정보 입력 완료 → `/app`
- 로그인 페이지의 회원가입 이동 → `/app/signup`

외부 OAuth redirect URI 자체는 기존 `/auth/*/callback`을 유지한다.

### 6.5 로그아웃

로그아웃 뒤에는 마케팅 랜딩 `/`이 아니라 비로그인 상태의 서비스 홈 `/app`으로 이동한다. 사용자가 다시 추천을 시작할 수 있어야 한다.

### 6.6 홈으로 이동하는 모든 코드

현재 코드에서 다음 형태를 전부 검색하여 의미를 확인한다.

```text
navigate('/')
window.location.href = '/'
<NavLink to="/">
<Link to="/">
href="/"
```

- 서비스 안의 홈 이동은 `/app`
- 로고 등 랜딩으로 가야 하는 링크만 `/`
- 문자열을 무조건 일괄 치환하지 않음

현재 확인된 주요 위치는 다음과 같다.

```text
src/App.tsx
src/components/ui/BottomNav.tsx
src/features/course/CourseScreens.tsx
src/features/planner/PlannerScreens.tsx
src/pages/auth/KakaoCallback.tsx
src/pages/auth/GoogleCallback.tsx
src/pages/auth/NaverCallback.tsx
src/pages/auth/KakaoSignup.tsx
src/pages/auth/GoogleSignup.tsx
src/pages/auth/NaverSignup.tsx
```

구현 시 다시 전체 검색하여 누락을 확인한다.

---

## 7. 기존 URL 호환 정책

### 7.1 일반 구형 경로

기존 사용자의 북마크와 공유 링크를 깨뜨리지 않는다.

다음 경로는 React Router의 `Navigate replace` 또는 동일한 효과의 명시적 redirect route로 신규 주소에 연결한다.

```text
/planner/chat             → /app/planner/chat
/planner/condition        → /app/planner/condition
/planner/searching        → /app/planner/searching
/planner/result           → /app/planner/result
/explore                  → /app/explore
/course/map               → /app/course/map
/course/place/:index      → /app/course/place/:index
/course/replace/:index    → /app/course/replace/:index
/mypage                   → /app/mypage
/chatbot                  → /app/planner/chat
/login                    → /app/login
/signup                   → /app/signup
/kakao-signup             → /app/kakao-signup
/naver-signup             → /app/naver-signup
/google-signup            → /app/google-signup
```

리다이렉트 시 query string과 필요한 state가 유실되지 않게 한다.

### 7.2 과거 `/` 공유 코스 링크

현재 앱은 `/`의 query string에서 `seq`와 `type`을 읽어 공유 코스를 불러올 수 있다. 랜딩 전환 후에도 다음 형태가 깨지면 안 된다.

```text
https://noplan.live/?seq=123&type=saved
```

`/`에 `seq`가 존재하면 일반 랜딩을 보여주지 말고 신규 앱 공유 코스 진입으로 연결한다.

권장 동작:

```text
/?seq=123&type=saved
→ /app/course/map?seq=123&type=saved
```

신규 공유 URL은 가능하면 처음부터 다음 형식으로 생성한다.

```text
/app/course/map?seq=123&type=saved
```

공유 코스 로딩 effect는 랜딩을 포함한 모든 경로에서 무조건 실행하지 말고 앱 경로 또는 legacy share redirect 처리에만 한정한다.

유효하지 않은 `seq`, 삭제된 코스, API 오류 시 랜딩으로 조용히 보내지 말고 앱 안에서 이해 가능한 오류와 재시도 또는 홈 이동을 제공한다.

### 7.3 알 수 없는 경로

모든 `*` 경로를 무조건 `/` 랜딩으로 보내면 잘못된 앱 링크를 알아차리기 어렵다.

권장 정책:

- `/app/*`에서 알 수 없는 경로 → `/app` 또는 앱 전용 404
- 공개 영역의 알 수 없는 경로 → `/` 또는 공개 404
- 잘못된 링크를 무한 redirect하지 않음

---

## 8. 데이터와 문구의 사실성

랜딩은 현재 기능보다 앞서 나간 약속을 하면 안 된다.

### 사용할 수 있는 표현

- 홍대의 장소를 탐색한다.
- 사용자의 상황과 취향을 입력받는다.
- 여러 장소를 코스로 연결한다.
- 저장한 코스와 최근 본 코스를 확인한다.
- 공개 코스를 탐색할 수 있다.

### 구현 또는 근거 확인 전 사용 금지

- 전국 또는 서울 전 지역을 지원한다.
- SNS 장소를 자동으로 실시간 수집한다.
- 실시간 인구 혼잡도를 정확하게 제공한다.
- AI가 모든 장소를 자동 검증한다.
- 업계 최고, 정확도 1위 등의 비교 우위
- 네이티브 앱을 다운로드할 수 있다.
- 특정 제휴사와 협업 중이라는 표현
- 사용자 수, 매장 수, 추천 성공률 등 근거 없는 수치

AI라는 표현을 사용한다면 현재 추천 로직과 실제 제공 범위를 확인하고 과장하지 않는다.

---

## 9. 접근성 및 SEO

### 접근성

- 일반 텍스트 명암비 4.5:1 이상
- 큰 텍스트와 핵심 UI도 충분한 명암 확보
- 키보드만으로 메뉴와 CTA 사용 가능
- 모바일 메뉴 열림 상태와 버튼에 적절한 ARIA 속성 제공
- focus outline 제거 금지
- 색상만으로 선택과 상태를 전달하지 않음
- 이미지 대체 텍스트 제공
- 움직임 감소 설정 존중

### SEO와 공유 정보

랜딩 `/`에 다음을 설정한다.

- 고유한 document title
- 서비스 설명 meta description
- Open Graph title, description, image
- canonical URL `https://noplan.live/`
- 적절한 H1 하나와 순차적인 heading 구조
- 실제 공개할 OG 이미지가 없으면 임시 이미지를 운영 배포에 넣지 말고 보고

React SPA에서 경로별 meta를 처리하는 기존 방식이 없다면 최소한 랜딩 기준의 정적 meta를 먼저 적용하고, 앱 페이지 SEO는 별도 작업으로 보고한다.

---

## 10. 성능 기준

참고 이미지처럼 큰 화면 캡처 여러 장을 원본 크기로 그대로 로드하지 않는다.

- 랜딩 이미지는 용도에 맞게 WebP 또는 AVIF로 최적화
- 모바일용 `srcset` 또는 적절한 responsive image 사용
- 첫 화면 Hero 이미지 크기 최적화
- 아래쪽 이미지 lazy loading
- 레이아웃 이동 방지를 위해 이미지 width/height 또는 aspect-ratio 지정
- 사용하지 않는 대형 UI 라이브러리를 랜딩 하나 때문에 추가하지 않음
- 외부 폰트 추가 시 로딩 비용과 라이선스 확인
- 가능하면 기존 프로젝트 폰트 사용

성능을 위해 참고 이미지 전체를 페이지 이미지로 표시하는 방식은 금지한다.

---

## 11. 테스트 체크리스트

### Phase 1

- [ ] `/landing-preview` 직접 접속 정상
- [ ] 랜딩에 `AppFrame`과 하단 내비게이션이 나타나지 않음
- [ ] 랜딩 CTA가 현재 `/` 서비스로 이동
- [ ] 상단 anchor 메뉴 정상
- [ ] 모바일 메뉴 정상
- [ ] 320, 360, 390, 430px에서 가로 넘침 없음
- [ ] 768, 1024, 1440px에서 레이아웃 정상
- [ ] 기존 `/` 서비스 화면과 기능 변화 없음
- [ ] 기존 `/planner/*`, `/explore`, `/course/*`, `/mypage` 정상
- [ ] 로그인 및 소셜 콜백 동작에 회귀 없음
- [ ] 관리자 페이지에 스타일 회귀 없음

### Phase 2

- [ ] `/`에서 랜딩 표시
- [ ] `/app`에서 기존 서비스 홈 표시
- [ ] `/app/planner/*` 전체 흐름 정상
- [ ] `/app/explore` 정상
- [ ] `/app/course/*` 상세 및 교체 화면 정상
- [ ] `/app/mypage` 정상
- [ ] 하단 내비게이션 4개 경로와 active 상태 정상
- [ ] 일반 로그인 성공 후 `/app`
- [ ] 일반 회원가입 흐름 정상
- [ ] 카카오 기존/신규 회원 흐름 정상
- [ ] 구글 기존/신규 회원 흐름 정상
- [ ] 네이버가 비활성 상태라면 비활성 상태 유지, 관련 코드는 신규 경로와 일관성 확보
- [ ] 로그아웃 후 `/app`
- [ ] 구형 `/planner/*`, `/explore`, `/course/*`, `/mypage` 링크 호환
- [ ] `/?seq=...&type=...` 공유 링크 호환
- [ ] 신규 `/app/course/map?seq=...&type=...` 공유 링크 정상
- [ ] 잘못된 공유 코스 오류 처리 정상
- [ ] 브라우저 새로고침으로 중첩 경로 직접 접속 정상
- [ ] Vercel SPA rewrite 정상
- [ ] 랜딩에서 개인정보처리방침 링크 정상
- [ ] 랜딩과 앱 사이 뒤로가기 동작 자연스러움
- [ ] localStorage 로그인 세션 유지
- [ ] API 계약 및 백엔드 변경 없음

---

## 12. 빌드 및 결과 보고

각 Phase 완료 시 다음을 수행한다.

```text
npm run build
npm run lint
```

- build는 반드시 통과해야 한다.
- lint 오류가 있다면 기존 오류와 이번 변경으로 추가된 오류를 구분한다.
- 이번 작업으로 새로운 lint 오류를 만들지 않는다.
- 테스트를 통과하지 못한 상태에서 완료라고 보고하지 않는다.

최종 보고 형식:

```text
1. 완료한 Phase
2. 변경한 파일 목록
3. 구현한 랜딩 섹션
4. 신규 및 호환 URL 목록
5. 인증/공유 링크 검증 결과
6. 반응형 캡처
7. build/lint 결과
8. 남은 사용자 결정 또는 외부 설정
9. 되돌리는 방법
```

---

## 13. 금지사항

- 사용자 승인 없이 Phase 2 진행 금지
- 기존 `/` 서비스를 먼저 제거한 뒤 랜딩을 만드는 작업 금지
- `/services` 사용 금지
- 백엔드 API URL 또는 계약 변경 금지
- OAuth redirect URI를 임의로 변경 금지
- 기존 공유 코스 링크 폐기 금지
- 랜딩 시안을 하나의 긴 이미지로 넣는 방식 금지
- 현재 기능보다 앞선 허위·과장 문구 금지
- 네이티브 앱이 없는데 `앱 다운로드` 표시 금지
- 문의 수단 없이 작동하지 않는 문의 버튼 노출 금지
- 랜딩 CSS로 기존 앱 스타일을 전역 덮어쓰기 금지
- 기존 사용자 앱 구조, 검색 로직, 탐색, 코스, 마이 UX 재설계 금지
- 관리자 페이지 변경 금지
- unrelated 파일 정리 또는 대규모 리팩터링 금지

---

## 14. 최종 완료 정의

다음 조건을 모두 충족해야 전체 작업이 완료된 것으로 본다.

1. 사용자가 승인한 랜딩이 `noplan.live/`에 표시된다.
2. 기존 NoPlan 서비스가 `noplan.live/app`에서 기능 손실 없이 작동한다.
3. 로그인, 소셜 인증, 회원가입과 로그아웃이 올바른 앱 경로로 돌아온다.
4. 기존 서비스 URL과 공유 코스 URL이 끊기지 않는다.
5. 랜딩 문구가 현재 홍대 기반 서비스의 실제 기능과 일치한다.
6. 모바일과 데스크톱에서 랜딩이 정상적으로 보인다.
7. 앱과 랜딩의 스타일이 서로 오염되지 않는다.
8. build가 통과하고 이번 변경으로 발생한 lint 오류가 없다.
9. 백엔드와 데이터 계약은 변경되지 않는다.
