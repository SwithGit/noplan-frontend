const DONG_PATTERN = /([가-힣0-9]+동)(?=\s|$|[,()])/u;

export function extractDongFromText(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const match = String(value || '').trim().match(DONG_PATTERN);
    if (match?.[1]) return match[1];
  }

  return '';
}

export function normalizeDongInput(value: string) {
  return extractDongFromText(value) || (/^[가-힣0-9]+동$/u.test(value.trim()) ? value.trim() : '');
}
