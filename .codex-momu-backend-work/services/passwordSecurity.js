const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const DEFAULT_BCRYPT_ROUNDS = 12;
const MINIMUM_PASSWORD_LENGTH = 10;
const MAXIMUM_PASSWORD_LENGTH = 128;

function getBcryptRounds() {
  const configured = Number.parseInt(process.env.PASSWORD_BCRYPT_ROUNDS || '', 10);
  if (!Number.isInteger(configured)) return DEFAULT_BCRYPT_ROUNDS;
  return Math.min(14, Math.max(10, configured));
}

function isBcryptHash(value) {
  return /^\$2[aby]\$\d{2}\$/.test(String(value || ''));
}

async function hashPassword(password) {
  return bcrypt.hash(String(password), getBcryptRounds());
}

function constantTimeTextEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ''), 'utf8');
  const rightBuffer = Buffer.from(String(right || ''), 'utf8');
  if (leftBuffer.length !== rightBuffer.length) {
    crypto.timingSafeEqual(leftBuffer, Buffer.alloc(leftBuffer.length));
    return false;
  }
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

async function verifyStoredPassword(candidate, user) {
  if (isBcryptHash(user?.password_hash)) {
    return {
      matches: await bcrypt.compare(String(candidate || ''), user.password_hash),
      legacy: false,
    };
  }

  return {
    matches: constantTimeTextEqual(candidate, user?.pw),
    legacy: true,
  };
}

function randomCharacter(characters) {
  return characters[crypto.randomInt(0, characters.length)];
}

function secureShuffle(values) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = crypto.randomInt(0, index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function generateTemporaryPassword(length = 14) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%&*+-=?';
  const all = `${upper}${lower}${digits}${symbols}`;
  const safeLength = Math.max(12, Math.min(32, Number(length) || 14));
  const characters = [
    randomCharacter(upper),
    randomCharacter(lower),
    randomCharacter(digits),
    randomCharacter(symbols),
  ];

  while (characters.length < safeLength) {
    characters.push(randomCharacter(all));
  }
  return secureShuffle(characters).join('');
}

function validateNewPassword(password) {
  if (typeof password !== 'string') {
    return '새 비밀번호를 입력해 주세요.';
  }
  if (password.length < MINIMUM_PASSWORD_LENGTH || password.length > MAXIMUM_PASSWORD_LENGTH) {
    return `비밀번호는 ${MINIMUM_PASSWORD_LENGTH}자 이상 ${MAXIMUM_PASSWORD_LENGTH}자 이하여야 합니다.`;
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return '비밀번호에는 영문 대문자, 소문자, 숫자, 특수문자가 각각 하나 이상 필요합니다.';
  }
  return null;
}

function isTemporaryPasswordUsable(user, now = Date.now()) {
  if (!user?.must_change_password || user.temporary_password_used_at) return false;
  const expiresAt = new Date(user.temporary_password_expires_at).getTime();
  return Number.isFinite(expiresAt) && expiresAt > now;
}

module.exports = {
  generateTemporaryPassword,
  hashPassword,
  isBcryptHash,
  isTemporaryPasswordUsable,
  validateNewPassword,
  verifyStoredPassword,
};
