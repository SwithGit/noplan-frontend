const test = require('node:test');
const assert = require('node:assert/strict');

const { buildTemporaryPasswordMessage } = require('../services/mailer');

test('temporary password email uses the requested OARCH Korean template', () => {
  const previousLoginUrl = process.env.MOMU_LOGIN_URL;
  process.env.MOMU_LOGIN_URL = 'https://mo-cms.com/login';
  try {
    const message = buildTemporaryPasswordMessage('Abc&<123!');
    assert.equal(message.subject, "[O'ARCH] 임시 비밀번호 안내");
    assert.match(message.text, /MO-CMS 비밀번호 재설정 요청/);
    assert.match(message.text, /24시간 동안 한 번만/);
    assert.match(message.text, /O'ARCH 고객지원팀/);
    assert.match(message.html, /https:\/\/mo-cms\.com\/login/);
    assert.match(message.html, /Abc&amp;&lt;123!/);
    assert.doesNotMatch(message.html, /Abc&<123!/);
  } finally {
    if (previousLoginUrl === undefined) delete process.env.MOMU_LOGIN_URL;
    else process.env.MOMU_LOGIN_URL = previousLoginUrl;
  }
});
