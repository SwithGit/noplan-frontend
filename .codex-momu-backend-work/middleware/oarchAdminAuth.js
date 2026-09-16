const db = require('../config/db');
const { verifyOarchAdminAccessToken } = require('../services/oarchAdminToken');

function extractBearerToken(req) {
  const match = String(req.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

async function requireOarchAdmin(req, res, next) {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: '관리자 로그인이 필요합니다.',
    });
  }

  let payload;
  try {
    payload = verifyOarchAdminAccessToken(token);
  } catch (_error) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: '관리자 로그인 정보가 유효하지 않습니다.',
    });
  }

  try {
    const [rows] = await db.promise().query(`
      SELECT adminSeq, email, name, role, isActive, auth_version
      FROM momu_admin_users
      WHERE adminSeq = ?
      LIMIT 1
    `, [payload.sub]);
    const admin = rows[0];
    if (!admin || Number(admin.auth_version || 1) !== Number(payload.av || 1)) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: '관리자 로그인 정보가 만료되었습니다.',
      });
    }
    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: '사용할 수 없는 관리자 계정입니다.',
      });
    }

    req.oarchAdmin = {
      adminSeq: Number(admin.adminSeq),
      email: String(admin.email),
      name: String(admin.name),
      role: String(admin.role),
      authVersion: Number(admin.auth_version || 1),
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { requireOarchAdmin };
