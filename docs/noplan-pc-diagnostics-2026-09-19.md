# PC 검색·코스 진단 로그

## 배포

이번 변경은 **백엔드와 프론트엔드를 모두 배포**해야 한다. DB 변경이나 신규 API 키는 없다.

백엔드 변경 파일:
- `middleware/pcDiagnostics.js` (신규)
- `server.js`
- `routes/tourism/router.js`
- `routes/tourism/dayRoute.js`
- `tests/pcDiagnostics.test.js` (검증용)
- `scripts/preview-ulsan-tourism.cjs` (로컬 미리보기용)

백엔드 코드를 EC2에 반영한 다음 실행:

```sh
pm2 restart noplan-backend
pm2 logs noplan-backend --lines 200
```

프론트엔드도 빌드·배포 후 새로고침해야 브라우저 안에서 실행되는 카카오 검색과 노피 추천 결과가 전달된다. 기존 배포 절차를 사용한다. 이 문서는 운영 배포 완료를 의미하지 않는다.

PC 관련 로그만 보기:

```sh
pm2 logs noplan-backend --lines 200 --raw | grep --line-buffered -E '\[pc-(request|result|event|provider)\]'
```

## 로그 종류

| 태그 | 내용 |
| --- | --- |
| `[pc-request]` | 관광지·행사·여행 API 요청, 검색어·분류·정렬·페이지 또는 이동수단·경로 구간 수 |
| `[pc-result]` | HTTP 상태, 처리시간, 결과 수, 빈 결과, 경로별 거리·시간·조회 실패 |
| `[pc-event]` | 브라우저에서 실행된 노피 추천, 카카오 직접 검색, 주소 검색의 시작·성공·실패·취소·시간 초과 |
| `[pc-provider]` | 경로 서비스 연결 실패, 설정 누락, 제공기관 HTTP 오류 등 |

`loggedAt`은 서버 수신 시각(UTC), `elapsedMs`는 처리시간이다.
`requestId`로 API 요청과 응답을 묶고, `operationId`로 한 번의 노피 추천에서 발생한 여러 경로 조회와 최종 결과를 묶는다.
노피 추천에는 이동수단, 권역, 목적, 시작·종료 시각, 후보 수, 제외 장소 수, 거리 제한, 최종 장소 수와 공개 관광지 ID, 총 이동거리가 기록된다. 사용자의 성별·생년월일은 기록하지 않는다.

주요 실패 코드:
- `insufficient_nearby_places`: 거리·시간 조건에 맞는 가까운 후보 부족
- `distance_limit`: 실제 경로가 거리/시간 기준을 넘어서 구성 불가
- `route_unavailable`: 실제 경로 확인 불가. 같은 작업 ID의 `pc-provider` 확인
- `service_unavailable`: 경로 서비스 키 또는 활성화 설정 확인 필요
- `provider_unavailable`: 제공기관 연결 실패
- `http_error`, `provider_http`, `rate_limited`: 제공기관 HTTP 상태 확인 (401/403 인증, 429 한도 등)
- `sdk_error`, `sdk_timeout`: 브라우저 카카오 검색 오류 또는 시간 초과
- `invalid_time_window`: 자동 코스의 3~14시간 조건 위반

경로 일부 실패는 HTTP 200이어도 `status: partial`, `unavailableCount`, `legs[].reason`에 남는다. 결과 0건은 `empty`로 구분한다.

## 기록 범위와 제한

- 비밀번호, 쿠키, 인증 헤더, 사용자 ID, 생년월일·성별, 여행 초대 토큰, 원본 오류 메시지, 전체 여행 문서, 정확한 좌표를 기록하지 않는다.
- 이름 검색어는 최대 80자. 이메일·전화번호·URL·인증값으로 보이는 내용은 가린다. 주소 검색은 주소 원문 대신 결과 수와 성공 여부만 기록한다.
- 브라우저 로그는 `source: browser-reported`로 구분하며, 허용된 필드와 값만 기록한다. 사용자별 또는 IP별 분당 120건 제한을 둔다.
- 변경 없는 협업 동기화 폴링은 생략한다. 변경·실패는 기록한다.
- 로그 전송 실패가 검색·추천을 방해하지 않는다. 전송은 최대 4초, 재시도하지 않는다. 네트워크 단절, CORS 차단, 광고 차단, 탭 강제 종료 시 브라우저 결과 로그가 유실될 수 있다. 시작만 있고 종료가 없는 로그는 이 가능성도 확인한다.
- PM2 stdout을 사용하며 별도 DB 저장은 하지 않는다. 보관·회전은 운영 서버의 기존 PM2 로그 정책을 따른다.

## 검증

- 서버 진단·관광지·상세·일일 경로·울산 카탈로그 테스트 26개 통과.
- 프론트 진단 테스트: 동일 작업 ID 및 종료 중복 방지, 전송 전 민감 검색어 마스킹, 네트워크 실패 격리, URL/토큰 제외 검증.
- 로컬 브라우저에서 실제 관광공사 검색과 카카오 직접 검색의 서버 로그 확인.
- 노피 추천 시작 → 실제 차량 경로 요청 → 성공 결과를 같은 작업 ID로 확인. 네트워크 접근이 차단된 검증 환경에서 제공기관 연결 실패 → 추천 실패 로그도 확인.
