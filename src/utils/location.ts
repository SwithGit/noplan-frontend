const DONG_PATTERN = /([가-힣0-9]+동)(?=\s|$|[,()])/u;
const LOCALIZED_NEIGHBORHOODS: Record<string, string> = {
  'yeonnam-dong': '연남동', 'yeonnam': '연남동', '延南洞': '연남동', 'ヨンナムドン': '연남동', '延南洞（ヨンナムドン）': '연남동',
  'seongsu-dong': '성수동', 'seongsu': '성수동', '圣水洞': '성수동', '聖水洞': '성수동', 'ソンスドン': '성수동',
  'sangam-dong': '상암동', 'sangam': '상암동', '上岩洞': '상암동', 'サンアムドン': '상암동',
};

export function extractDongFromText(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const match = String(value || '').trim().match(DONG_PATTERN);
    if (match?.[1]) return match[1];
  }

  return '';
}

export function normalizeDongInput(value: string) {
  return LOCALIZED_NEIGHBORHOODS[value.trim().toLowerCase()] || extractDongFromText(value) || (/^[가-힣0-9]+동$/u.test(value.trim()) ? value.trim() : '');
}
