const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../../../config/db');
const { requireOarchAdmin } = require('../../../middleware/oarchAdminAuth');
const { createRateLimiter, positiveInteger } = require('../../../middleware/rateLimit');
const { createOarchAdminAccessToken } = require('../../../services/oarchAdminToken');

const router = express.Router();
const DUMMY_PASSWORD_HASH = '$2b$12$TCEEHDzF/zuFH3V.QUAIBeyrS.khQ7pTgPVpkmd1tF4/MSLBbC5sK';

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

function publicAdmin(admin) {
  return {
    adminSeq: Number(admin.adminSeq),
    email: String(admin.email),
    name: String(admin.name),
    role: String(admin.role),
  };
}

const loginLimiter = createRateLimiter({
  windowMs: positiveInteger(process.env.OARCH_ADMIN_LOGIN_RATE_WINDOW_MS, 15 * 60 * 1000),
  max: positiveInteger(process.env.OARCH_ADMIN_LOGIN_RATE_LIMIT, 10),
  keyGenerator(req) {
    return `${req.ip || 'unknown'}:${normalizeEmail(req.body?.email)}`;
  },
  message: '로그인 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
});

/**
 * @swagger
 * /api/momu/oarch-admin/auth/login:
 *   post:
 *     summary: MOMU 직원 관리자 로그인
 *     tags: [OARCH Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *     responses:
 *       200: { description: 로그인 성공 }
 *       400: { description: 입력 형식 오류 }
 *       401: { description: 이메일 또는 비밀번호 불일치 }
 *       429: { description: 로그인 요청 횟수 초과 }
 */
router.post('/login', loginLimiter, async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || '');
  if (!validEmail(email) || !password || password.length > 128) {
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: '관리자 이메일과 비밀번호를 입력해 주세요.',
    });
  }

  try {
    const [rows] = await db.promise().query(`
      SELECT adminSeq, email, password_hash, name, role, isActive, auth_version
      FROM momu_admin_users
      WHERE email = ?
      LIMIT 1
    `, [email]);
    const admin = rows[0];
    const passwordMatches = await bcrypt.compare(
      password,
      admin?.password_hash || DUMMY_PASSWORD_HASH,
    );
    if (!admin || !passwordMatches || !admin.isActive) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: '이메일 또는 비밀번호를 확인해 주세요.',
      });
    }

    const accessToken = createOarchAdminAccessToken(admin);
    await db.promise().query(
      'UPDATE momu_admin_users SET lastLoginAt = NOW() WHERE adminSeq = ?',
      [admin.adminSeq],
    );
    return res.json({
      success: true,
      message: '로그인되었습니다.',
      accessToken,
      admin: publicAdmin(admin),
    });
  } catch (error) {
    console.error('[OARCH ADMIN] login failed', {
      code: error.code || 'LOGIN_ERROR',
    });
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_ERROR',
      message: '서버 오류로 로그인에 실패했습니다.',
    });
  }
});

/**
 * @swagger
 * /api/momu/oarch-admin/auth/me:
 *   get:
 *     summary: 로그인한 MOMU 관리자 정보 확인
 *     tags: [OARCH Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: 관리자 정보 조회 성공 }
 *       401: { description: 인증 실패 }
 */
router.get('/me', requireOarchAdmin, (req, res) => res.json({
  success: true,
  admin: {
    adminSeq: req.oarchAdmin.adminSeq,
    email: req.oarchAdmin.email,
    name: req.oarchAdmin.name,
    role: req.oarchAdmin.role,
  },
}));

module.exports = router;
