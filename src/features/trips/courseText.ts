// Hide old generated statistics too, without modifying the user's saved notes.
export function courseDisplayText(value: string) {
  return value.split('\n').map(line => line.split(' · ').filter(part => !/^(?:선택 성·연령 방문 비중|성·연령 방문 비중|\d+대(?: 이하| 이상)?(?: 여성| 남성)? 방문 비중|방문 통계 없음|거리·분류 기준|관광지 검색 인기 반영)/.test(part.trim())).join(' · ').trim()).filter(Boolean).join('\n');
}
