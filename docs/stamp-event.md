# 노피 모바일 스탬프 이벤트

## 화면

- `/event`: 행사 안내 및 비회원/로그인 시작 선택. 홈 배너에서 진입한다.
- `/event/1`~`/event/5`: 인쇄 QR 주소. 접속한 번호를 서버에 저장하고 `/event/stamps`로 이동한다. 번호 순서와 무관하며 중복 적립하지 않는다.
- `/event/stamps`: 0~5개 진행 상태, 카메라 QR 스캔, 참여 방법 5단계 모달, 로그인해서 기록 보관, 완료/경품 수령 상태.
- 5개 완료 화면: 부스 직원이 참가자 휴대폰의 **수령 완료** 버튼을 한 번 누른다. 별도 운영자 화면/키/로그인은 없다. 서버 저장 후 버튼 대신 수령 완료 상태를 표시한다.

비회원은 같은 브라우저에서 이어 모은다. 이벤트에서 로그인하면 스탬프 화면으로 복귀한다. 다른 경로에서 로그인해도 이전 이벤트 참여 표시가 있으면 비회원 쿠키 기록을 서버에 합치며, 실패 시 이벤트 화면 진입 때 재시도한다. 소셜 로그인·신규 가입도 기존 홈 복귀 경로를 통해 이벤트로 돌아온다.

서버 확인이 성공한 적립만 화면에 반영한다. 통신 실패 시 다시 시도할 수 있고, 마지막 QR URL은 적립이 성공하기 전까지 유지한다. QR 스캔은 `@zxing/browser`를 버튼 클릭 때 지연 로딩한다. 카메라를 닫거나 인식에 성공하면 스트림을 종료한다. 카메라 사용이 불가능하면 기본 카메라와 같은 브라우저 이용을 안내한다.

## 디자인 원본

사용자 제공 `화면 소스들 및 이미지` 폴더의 스탬프 5종, 모달 5종, 이벤트 메인/스탬프 화면의 노피를 사용한다. 그림을 다시 생성하지 않았다. 스탬프는 표시 크기에 맞게 WebP로 저장하고, 모달·상단 일러스트는 원본 그림 영역을 잘라 사용했다. 제목·본문·버튼·진행률은 실제 HTML이다.

`scripts/prepareStampEventAssets.cjs <원본 폴더>`로 재생성할 수 있다. 이 개발용 도구에는 `sharp`가 필요하며 런타임 의존성은 아니다. 최종 웹 자산은 `public/images/stamp-event`에 포함한다.

## 검증 명령

```text
npm run build
npx eslint src/features/stampEvent src/api/stampEventApi.ts src/App.tsx
node --test tests/stampEvent.test.cjs
```

브라우저 통합 테스트는 실제 이벤트 라우터와 메모리 DB만 사용한다. 운영 서버나 유료 API에 접속하지 않는다.

```powershell
$env:VITE_APP_API_URL='http://127.0.0.1:3189'
npm run dev -- --host 127.0.0.1 --port 5181 --strictPort
# 별도 터미널: playwright를 사용할 수 있는 NODE_PATH와 백엔드 경로 지정
$env:NOPLAN_BACKEND_ROOT='D:/Backend/NoPlan'
node tests/stampEvent.browser.cjs
```

운영 반영 전 백엔드 `docs/stamp-event.md`의 환경변수/DB/리다이렉트/HTTPS 조건을 확인한다. 현재 캠페인 ID는 `find-nopi-2026`. 경품 추첨 자체는 현장에서 운영하며 웹은 스탬프와 수령 완료 여부만 기록한다.
