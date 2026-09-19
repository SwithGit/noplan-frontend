export type LocationMode = 'named' | 'current' | 'context' | 'unspecified';
const relative = /^(?:내|제|우리|이)?\s*(?:주변|근처|근방|현재\s*위치|현\s*위치|여기|이곳|이쪽|가까운\s*곳|주위|동네)$/;
export function isNamedTextLocation(value: string) {
  if (/(?:우리\s*집|집|회사|직장|숙소|호텔|학교)\s*(?:근처|주변|앞|옆|에서)/.test(value)) return false;
  return value.length >= 2 && !relative.test(value) && !/^(친구들?|가족|혼자|연인|맛집|카페|술집|오늘|내일|지금|저녁|점심|아침|오후|오전|갈\s*곳|어디|위치|집|회사|숙소|호텔|학교)$/.test(value) && !/(?:놀기|먹기|가기|보기|하기|만나기)(?:로)?$/.test(value);
}
export function inferNamedTextLocation(text: string) {
  for (const match of text.matchAll(/([가-힣A-Za-z0-9]+)\s*(?:에서|근처|주변|쪽)(?!\s*(?:말고|아니고|제외))/g)) {
    if (isNamedTextLocation(match[1])) return match[1];
  }
  return '';
}
export function resolveTextLocation(text: string, candidate: string | null | undefined, mode?: LocationMode) {
  if (mode === 'current' || mode === 'context') return { mode, location: '' };
  if (candidate && isNamedTextLocation(candidate)) return { mode: 'named' as const, location: candidate };
  if (/(?:우리\s*집|집|회사|직장|숙소|호텔|학교)\s*(?:근처|주변|앞|옆|에서)/.test(text)) return { mode: 'context' as const, location: '' };
  if (/(?:근처|주변|근방|주위|현재\s*위치|현\s*위치|여기|이곳|이쪽|가까운\s*곳)/.test(text)) return { mode: 'current' as const, location: '' };
  return { mode: 'unspecified' as const, location: '' };
}
