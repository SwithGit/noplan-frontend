function parsePositiveInteger(value, fallback, maximum = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
}

function parsePagination(query) {
  const page = parsePositiveInteger(query.page, 1);
  const pageSize = parsePositiveInteger(query.pageSize, 20, 100);
  return { page, pageSize, offset: (page - 1) * pageSize };
}

function parseDate(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return undefined;
  const timestamp = Date.parse(`${normalized}T00:00:00Z`);
  return Number.isFinite(timestamp) ? normalized : undefined;
}

function trimText(value, maximumLength) {
  return String(value || '').trim().slice(0, maximumLength);
}

module.exports = { parseDate, parsePagination, trimText };
