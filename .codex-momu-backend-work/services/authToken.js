const jwt = require('jsonwebtoken');

function getTokenSecret() {
  const secret = String(process.env.AUTH_TOKEN_SECRET || '');
  if (secret.length < 32) {
    const error = new Error('AUTH_TOKEN_SECRET must contain at least 32 characters.');
    error.code = 'AUTH_TOKEN_SECRET_INVALID';
    throw error;
  }
  return secret;
}

function createAccessToken(user) {
  const mustChangePassword = Boolean(user.must_change_password);
  return jwt.sign(
    {
      av: Number(user.auth_version || 1),
      mcp: mustChangePassword,
      scope: mustChangePassword ? 'password:change' : 'momu:admin',
    },
    getTokenSecret(),
    {
      algorithm: 'HS256',
      expiresIn: process.env.AUTH_TOKEN_TTL || '12h',
      issuer: 'momu-backend',
      subject: String(user.id),
    },
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, getTokenSecret(), {
    algorithms: ['HS256'],
    issuer: 'momu-backend',
  });
}

module.exports = { createAccessToken, verifyAccessToken };
