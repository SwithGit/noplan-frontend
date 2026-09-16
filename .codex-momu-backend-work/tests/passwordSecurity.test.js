const test = require('node:test');
const assert = require('node:assert/strict');

const {
  generateTemporaryPassword,
  hashPassword,
  isTemporaryPasswordUsable,
  validateNewPassword,
  verifyStoredPassword,
} = require('../services/passwordSecurity');
const { createAccessToken, verifyAccessToken } = require('../services/authToken');

test('temporary passwords use secure policy character groups', () => {
  for (let index = 0; index < 25; index += 1) {
    const password = generateTemporaryPassword();
    assert.equal(password.length, 14);
    assert.match(password, /[A-Z]/);
    assert.match(password, /[a-z]/);
    assert.match(password, /\d/);
    assert.match(password, /[^A-Za-z0-9]/);
  }
});

test('password hashes verify without retaining plaintext', async () => {
  const previousRounds = process.env.PASSWORD_BCRYPT_ROUNDS;
  process.env.PASSWORD_BCRYPT_ROUNDS = '10';
  try {
    const hash = await hashPassword('StrongPassword!42');
    assert.notEqual(hash, 'StrongPassword!42');
    assert.equal((await verifyStoredPassword('StrongPassword!42', { password_hash: hash })).matches, true);
    assert.equal((await verifyStoredPassword('wrong-password', { password_hash: hash })).matches, false);
    assert.deepEqual(await verifyStoredPassword('legacy-secret', { pw: 'legacy-secret' }), {
      matches: true,
      legacy: true,
    });
  } finally {
    if (previousRounds === undefined) delete process.env.PASSWORD_BCRYPT_ROUNDS;
    else process.env.PASSWORD_BCRYPT_ROUNDS = previousRounds;
  }
});

test('new password policy requires all character groups', () => {
  assert.equal(validateNewPassword('ValidPassword!42'), null);
  assert.match(validateNewPassword('short'), /10자/);
  assert.match(validateNewPassword('alllowercase123!'), /대문자/);
});

test('temporary password is usable only once and before its expiry', () => {
  const now = Date.now();
  assert.equal(isTemporaryPasswordUsable({
    must_change_password: 1,
    temporary_password_used_at: null,
    temporary_password_expires_at: new Date(now + 60_000),
  }, now), true);
  assert.equal(isTemporaryPasswordUsable({
    must_change_password: 1,
    temporary_password_used_at: new Date(now),
    temporary_password_expires_at: new Date(now + 60_000),
  }, now), false);
  assert.equal(isTemporaryPasswordUsable({
    must_change_password: 1,
    temporary_password_used_at: null,
    temporary_password_expires_at: new Date(now - 1),
  }, now), false);
});

test('access tokens carry password-change scope and auth version', () => {
  const previousSecret = process.env.AUTH_TOKEN_SECRET;
  process.env.AUTH_TOKEN_SECRET = 'test-only-secret-that-is-longer-than-thirty-two-characters';
  try {
    const token = createAccessToken({ id: 'admin2', auth_version: 7, must_change_password: 1 });
    const payload = verifyAccessToken(token);
    assert.equal(payload.sub, 'admin2');
    assert.equal(payload.av, 7);
    assert.equal(payload.mcp, true);
    assert.equal(payload.scope, 'password:change');
  } finally {
    if (previousSecret === undefined) delete process.env.AUTH_TOKEN_SECRET;
    else process.env.AUTH_TOKEN_SECRET = previousSecret;
  }
});
