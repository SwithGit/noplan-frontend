const crypto = require('crypto');
const db = require('../config/db');

const DEFAULT_LINK_TTL_SECONDS = 15 * 60;
const MIN_LINK_TTL_SECONDS = 60;
const MAX_LINK_TTL_SECONDS = 24 * 60 * 60;
const QR_TOKEN_PATTERN = /^[A-Za-z0-9_-]{22}$/;

function qrLinkTtlSeconds() {
  const configured = Number.parseInt(
    process.env.MOMU_QR_LINK_TTL_SECONDS || '',
    10,
  );
  if (!Number.isInteger(configured)) return DEFAULT_LINK_TTL_SECONDS;
  return Math.min(
    MAX_LINK_TTL_SECONDS,
    Math.max(MIN_LINK_TTL_SECONDS, configured),
  );
}

function createQrToken() {
  return crypto.randomBytes(16).toString('base64url');
}

function hashQrToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function isValidQrToken(token) {
  return QR_TOKEN_PATTERN.test(String(token || ''));
}

function publicQrUrl(token) {
  const configured = String(
    process.env.MOMU_QR_BASE_URL ||
      process.env.MOMU_PUBLIC_API_BASE_URL ||
      'https://api.mo-cms.com',
  ).trim();
  const baseUrl = new URL(configured);
  if (!['http:', 'https:'].includes(baseUrl.protocol)) {
    throw new Error('MOMU_QR_BASE_URL must use HTTP or HTTPS.');
  }
  baseUrl.search = '';
  baseUrl.hash = '';
  baseUrl.pathname = `${baseUrl.pathname.replace(/\/+$/, '')}/q/${token}`;
  return baseUrl.toString();
}

async function createQrDownloadLink({ objectKey, downloadName, contentType }) {
  const ttlSeconds = qrLinkTtlSeconds();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const token = createQrToken();
    try {
      await db.promise().query(`
        INSERT INTO momu_qr_download_links
          (tokenHash, objectKey, downloadName, contentType, expiresAt)
        VALUES (?, ?, ?, ?, TIMESTAMPADD(SECOND, ?, NOW()))
      `, [hashQrToken(token), objectKey, downloadName, contentType, ttlSeconds]);
      return {
        qrUrl: publicQrUrl(token),
        expiresInSeconds: ttlSeconds,
      };
    } catch (error) {
      if (error.code !== 'ER_DUP_ENTRY' || attempt === 2) throw error;
    }
  }

  throw new Error('Could not create a unique QR download token.');
}

module.exports = {
  createQrDownloadLink,
  createQrToken,
  hashQrToken,
  isValidQrToken,
  publicQrUrl,
  qrLinkTtlSeconds,
};
