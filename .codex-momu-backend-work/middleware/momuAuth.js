const db = require('../config/db');
const { verifyAccessToken } = require('../services/authToken');

function extractBearerToken(req) {
  const match = String(req.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

function requireMomuAuth(req, res, next) {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (_error) {
    return res.status(401).json({ success: false, message: '로그인 정보가 유효하지 않습니다.' });
  }

  const sql = `
    SELECT id, auth_version, must_change_password
    FROM momu_users
    WHERE id = ?
    LIMIT 1
  `;
  db.query(sql, [payload.sub], (error, rows) => {
    if (error) return next(error);
    const user = rows[0];
    if (!user || Number(user.auth_version || 1) !== Number(payload.av || 1)) {
      return res.status(401).json({ success: false, message: '로그인 정보가 만료되었습니다.' });
    }
    req.auth = {
      userId: String(user.id),
      authVersion: Number(user.auth_version || 1),
      mustChangePassword: Boolean(user.must_change_password),
    };
    return next();
  });
  return undefined;
}

function requireMomuAdmin(req, res, next) {
  return requireMomuAuth(req, res, (error) => {
    if (error) return next(error);
    if (req.auth.mustChangePassword) {
      return res.status(403).json({
        success: false,
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: '비밀번호를 변경한 후 이용해 주세요.',
      });
    }
    return next();
  });
}

module.exports = { requireMomuAdmin, requireMomuAuth };
