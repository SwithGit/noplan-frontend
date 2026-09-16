const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createQrToken,
  hashQrToken,
  isValidQrToken,
  publicQrUrl,
  qrLinkTtlSeconds,
} = require('../services/qrDownloadLinks');
const { safeDownloadName } = require('../routes/momu/qrDownload');

test('QR links use a short opaque token and the public API host', () => {
  const token = createQrToken();
  assert.equal(token.length, 22);
  assert.equal(isValidQrToken(token), true);
  assert.match(publicQrUrl(token), new RegExp(`/q/${token}$`));
  assert.equal(hashQrToken(token).length, 64);
  assert.equal(hashQrToken(token).includes(token), false);
});

test('QR link TTL is constrained to one minute through one day', () => {
  const previous = process.env.MOMU_QR_LINK_TTL_SECONDS;
  try {
    process.env.MOMU_QR_LINK_TTL_SECONDS = '1';
    assert.equal(qrLinkTtlSeconds(), 60);
    process.env.MOMU_QR_LINK_TTL_SECONDS = '999999';
    assert.equal(qrLinkTtlSeconds(), 86400);
  } finally {
    if (previous === undefined) delete process.env.MOMU_QR_LINK_TTL_SECONDS;
    else process.env.MOMU_QR_LINK_TTL_SECONDS = previous;
  }
});

test('download filenames cannot inject headers or paths', () => {
  assert.equal(
    safeDownloadName('../bad\r\n"name.png'),
    '.._bad___name.png',
  );
});
