export const STAMP_IDS = [1, 2, 3, 4, 5] as const;
export const stampImage = (id: number) => `/images/stamp-event/stamp-${id}.webp`;
export const guideSteps = [
  { title: '리플렛에서 노피 찾기', description: '리플렛 뒷면의 ‘노피를 찾아라’에서 숨어 있는 노피를 확인해 보세요.' },
  { title: '행사장에서 스티커 찾기', description: '리플렛 속 위치를 참고해 ‘강동해변으로 가요’ 행사장에서 실제 노피 스티커를 찾아보세요.' },
  { title: 'QR 찍고 스탬프 적립!', description: '노피 스티커의 QR코드를 찍으면 해당 노피의 스탬프가 적립돼요. 같은 노피는 한 번만 적립돼요.' },
  { title: '5개 모으면 미션 클리어!', description: '다섯 노피의 스탬프를 모두 모으면 미션 클리어! 완성된 스탬프 카드를 확인해 주세요.' },
  { title: '부스로 돌아와 확인받기', description: '노플랜 부스에서 스탬프 완료 화면을 보여주고, 직원 확인 후 경품 뽑기에 참여해 보세요.' },
];
export function scannedStampId(text: string): number | null {
  try {
    const url = new URL(text);
    if (url.protocol !== 'https:' || !['www.noplan.live', 'noplan.live'].includes(url.hostname) || url.port || url.username || url.password) return null;
    const match = /^\/event\/([1-5])\/?$/.exec(url.pathname);
    return match ? Number(match[1]) : null;
  } catch { return null; }
}
