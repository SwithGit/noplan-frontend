const jwt = require('jsonwebtoken');

const OARCH_ADMIN_AUDIENCE = 'oarch-admin';
const OARCH_ADMIN_SCOPE = 'oarch:admin';

function getOarchAdminTokenSecret() {
  const secret = String(process.env.OARCH_ADMIN_TOKEN_SECRET || '');
  if (secret.length < 32) {
    const error = new Error('OARCH_ADMIN_TOKEN_SECRET must contain at least 32 characters.');
    error.code = 'OARCH_ADMIN_TOKEN_SECRET_INVALID';
    throw error;
  }
  return secret;
}

function createOarchAdminAccessToken(admin) {
  return jwt.sign(
    {
      av: Number(admin.auth_version || 1),
      role: String(admin.role || 'ADMIN'),
      scope: OARCH_ADMIN_SCOPE,
    },
    getOarchAdminTokenSecret(),
    {
      algorithm: 'HS256',
      audience: OARCH_ADMIN_AUDIENCE,
      expiresIn: process.env.OARCH_ADMIN_TOKEN_TTL || '12h',
      issuer: 'momu-backend',
      subject: String(admin.adminSeq),
    },
  );
}

function verifyOarchAdminAccessToken(token) {
  const payload = jwt.verify(token, getOarchAdminTokenSecret(), {
    algorithms: ['HS256'],
    audience: OARCH_ADMIN_AUDIENCE,
    issuer: 'momu-backend',
  });
  if (payload.scope !== OARCH_ADMIN_SCOPE) {
    const error = new Error('Invalid OARCH admin token scope.');
    error.code = 'OARCH_ADMIN_TOKEN_SCOPE_INVALID';
    throw error;
  }
  return payload;
}

module.exports = {
  createOarchAdminAccessToken,
  verifyOarchAdminAccessToken,
};
