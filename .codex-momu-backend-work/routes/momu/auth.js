const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../../config/db');
const { createRateLimiter, positiveInteger } = require('../../middleware/rateLimit');
const { requireMomuAdmin, requireMomuAuth } = require('../../middleware/momuAuth');
const { createAccessToken } = require('../../services/authToken');
const {
  hashPassword,
  isTemporaryPasswordUsable,
  validateNewPassword,
  verifyStoredPassword,
} = require('../../services/passwordSecurity');

const GENERIC_TEMPORARY_PASSWORD_RESPONSE = {
  success: true,
  message: 'If matching account information exists, a temporary password will be sent by email.',
};
const DUMMY_PASSWORD_HASH = '$2b$12$TCEEHDzF/zuFH3V.QUAIBeyrS.khQ7pTgPVpkmd1tF4/MSLBbC5sK';

const temporaryPasswordIpLimiter = createRateLimiter({
  windowMs: positiveInteger(process.env.TEMP_PASSWORD_RATE_WINDOW_MS, 15 * 60 * 1000),
  max: positiveInteger(process.env.TEMP_PASSWORD_IP_RATE_LIMIT, 20),
  message: '요청 횟수를 초과했습니다. 잠시 후 다시 시도해 주세요.',
});

function normalizeId(value) {
  return String(value || '').trim();
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

function securityHash(value) {
  const secret = String(process.env.AUTH_TOKEN_SECRET || '');
  if (secret.length < 32) {
    const error = new Error('AUTH_TOKEN_SECRET must contain at least 32 characters.');
    error.code = 'AUTH_TOKEN_SECRET_INVALID';
    throw error;
  }
  return crypto.createHmac('sha256', secret).update(String(value)).digest('hex');
}

function sanitizedUser(user) {
  const result = { ...user };
  result.mustChangePassword = Boolean(result.must_change_password);
  delete result.pw;
  delete result.password_hash;
  delete result.auth_version;
  delete result.must_change_password;
  delete result.temporary_password_expires_at;
  delete result.temporary_password_used_at;
  delete result.seq;
  return result;
}

function minimumResponseDelay(startedAt) {
  const minimumMs = positiveInteger(process.env.TEMP_PASSWORD_MIN_RESPONSE_MS, 400);
  const remaining = minimumMs - (Date.now() - startedAt);
  return remaining > 0 ? new Promise((resolve) => setTimeout(resolve, remaining)) : Promise.resolve();
}

async function recordAuthAudit({ eventType, outcome, lookupHash, ipHash, errorCode = null }, connection = db.promise()) {
  await connection.query(`
    INSERT INTO momu_auth_audits
      (eventType, outcome, lookupHash, ipHash, errorCode)
    VALUES (?, ?, ?, ?, ?)
  `, [eventType, outcome, lookupHash, ipHash, errorCode]);
}

async function temporaryPasswordRateExceeded(lookupHash, ipHash) {
  const windowMs = positiveInteger(process.env.TEMP_PASSWORD_RATE_WINDOW_MS, 15 * 60 * 1000);
  const accountLimit = positiveInteger(process.env.TEMP_PASSWORD_ACCOUNT_RATE_LIMIT, 3);
  const ipLimit = positiveInteger(process.env.TEMP_PASSWORD_IP_RATE_LIMIT, 20);
  const cutoff = new Date(Date.now() - windowMs);
  const [rows] = await db.promise().query(`
    SELECT
      SUM(lookupHash = ?) AS accountAttempts,
      SUM(ipHash = ?) AS ipAttempts
    FROM momu_auth_audits
    WHERE eventType = 'temporary_password'
      AND outcome = 'accepted'
      AND createdAt >= ?
  `, [lookupHash, ipHash, cutoff]);
  return Number(rows[0]?.accountAttempts || 0) >= accountLimit || Number(rows[0]?.ipAttempts || 0) >= ipLimit;
}

const getMomuCompanyLogoAssetSeq = (companyLogo) => {
  const value = String(companyLogo || '').trim();
  const match = value.match(
    /\/api\/momu\/upload\/file\/(\d+)(?:[?#].*)?$/
  );
  return match ? Number(match[1]) : null;
};

const validateCompanyLogoReference = (
  id,
  companyLogo,
  callback
) => {
  const assetSeq = getMomuCompanyLogoAssetSeq(companyLogo);
  if (!assetSeq) {
    // 기존 Bubble CDN 등 외부 URL은 이전과 같이 허용합니다.
    return callback(null, true);
  }

  const sql = `
    SELECT assetSeq
    FROM momu_assets
    WHERE assetSeq = ?
      AND id = ?
      AND category = 'company-logo'
      AND status = 'completed'
    LIMIT 1
  `;
  return db.query(sql, [assetSeq, id], (error, rows) => {
    if (error) return callback(error);
    return callback(null, rows.length > 0);
  });
};

function validateCompanyLogoReferenceAsync(id, companyLogo) {
  return new Promise((resolve, reject) => {
    validateCompanyLogoReference(id, companyLogo, (error, valid) => {
      if (error) reject(error);
      else resolve(valid);
    });
  });
}


/**
 * @swagger
 * /api/momu/auth/login:
 *   post:
 *     summary: 모뮤 파트너 로그인
 *     description: 로그인 성공 시 액세스 토큰과 비밀번호 강제변경 여부를 반환합니다.
 *     tags: [Momu Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id, pw]
 *             properties:
 *               id:
 *                 type: string
 *                 example: admin2
 *               pw:
 *                 type: string
 *                 format: password
 *                 example: TemporaryPassword!42
 *     responses:
 *       200:
 *         description: 로그인 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [success, accessToken, mustChangePassword, user]
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 로그인 성공
 *                 accessToken:
 *                   type: string
 *                   description: 이후 인증 API의 Bearer 토큰으로 사용합니다.
 *                 mustChangePassword:
 *                   type: boolean
 *                   description: true이면 프로필을 조회하지 말고 비밀번호 변경 화면으로 이동해야 합니다.
 *                   example: true
 *                 user:
 *                   type: object
 *                   description: 비밀번호 및 인증 내부값을 제외한 사용자 정보
 *       400:
 *         description: 아이디 또는 비밀번호 누락
 *       401:
 *         description: 아이디 또는 비밀번호 불일치, 임시 비밀번호 만료 또는 재사용
 *       500:
 *         description: 서버 내부 오류
 */
router.post('/login', async (req, res) => {
  const id = normalizeId(req.body?.id);
  const pw = String(req.body?.pw || '');
  if (!id || !pw) {
    return res.status(400).json({ success: false, message: '아이디와 비밀번호를 입력해 주세요.' });
  }

  try {
    const [rows] = await db.promise().query(
      'SELECT * FROM momu_users WHERE id = ? LIMIT 1',
      [id],
    );
    const user = rows[0];
    const verification = user
      ? await verifyStoredPassword(pw, user)
      : await verifyStoredPassword(pw, { password_hash: DUMMY_PASSWORD_HASH });

    if (!user || !verification.matches) {
      return res.status(401).json({ success: false, message: '아이디나 비밀번호가 일치하지 않습니다.' });
    }

    if (user.must_change_password) {
      if (!isTemporaryPasswordUsable(user)) {
        return res.status(401).json({
          success: false,
          code: 'TEMPORARY_PASSWORD_EXPIRED_OR_USED',
          message: '임시 비밀번호가 만료되었거나 이미 사용되었습니다. 다시 발급해 주세요.',
        });
      }
      const [consumeResult] = await db.promise().query(`
        UPDATE momu_users
        SET temporary_password_used_at = NOW()
        WHERE id = ?
          AND must_change_password = 1
          AND temporary_password_used_at IS NULL
          AND temporary_password_expires_at > NOW()
      `, [id]);
      if (consumeResult.affectedRows !== 1) {
        return res.status(401).json({
          success: false,
          code: 'TEMPORARY_PASSWORD_EXPIRED_OR_USED',
          message: '임시 비밀번호가 만료되었거나 이미 사용되었습니다. 다시 발급해 주세요.',
        });
      }
      user.temporary_password_used_at = new Date();
    }

    if (verification.legacy) {
      const upgradedHash = await hashPassword(pw);
      await db.promise().query(`
        UPDATE momu_users
        SET password_hash = ?, pw = NULL, password_changed_at = COALESCE(password_changed_at, NOW())
        WHERE id = ? AND password_hash IS NULL
      `, [upgradedHash, id]);
      user.password_hash = upgradedHash;
      user.pw = null;
    }

    const mustChangePassword = Boolean(user.must_change_password);
    const accessToken = createAccessToken(user);
    return res.json({
      success: true,
      message: '로그인 성공',
      accessToken,
      mustChangePassword,
      user: sanitizedUser(user),
    });
  } catch (error) {
    console.error('[MOMU AUTH] login failed', { code: error.code || 'LOGIN_ERROR' });
    return res.status(500).json({ success: false, message: '서버 오류로 로그인에 실패했습니다.' });
  }
});

/**
 * @swagger
 * /api/momu/auth/temporary-password:
 *   post:
 *     summary: 등록 이메일로 임시 비밀번호 발급
 *     tags: [Momu Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id, email]
 *             properties:
 *               id: { type: string }
 *               email: { type: string, format: email }
 *     responses:
 *       202:
 *         description: 계정 일치 여부를 노출하지 않는 접수 응답
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message:
 *                   type: string
 *                   example: If matching account information exists, a temporary password will be sent by email.
 *       400: { description: 요청 형식 오류 }
 *       429: { description: 계정 또는 IP 요청 횟수 초과 }
 *       500: { description: 서버 내부 처리 실패 }
 */
router.post('/temporary-password', temporaryPasswordIpLimiter, async (req, res) => {
  const startedAt = Date.now();
  const id = normalizeId(req.body?.id);
  const email = normalizeEmail(req.body?.email);
  if (!id || id.length > 191 || !validEmail(email)) {
    await minimumResponseDelay(startedAt);
    return res.status(400).json({ success: false, message: '아이디와 올바른 이메일을 입력해 주세요.' });
  }

  let lookupHash;
  let ipHash;
  try {
    lookupHash = securityHash(id.toLowerCase());
    ipHash = securityHash(req.ip || 'unknown');
    if (await temporaryPasswordRateExceeded(lookupHash, ipHash)) {
      await recordAuthAudit({
        eventType: 'temporary_password',
        outcome: 'rate_limited',
        lookupHash,
        ipHash,
      });
      await minimumResponseDelay(startedAt);
      return res.status(429).json({ success: false, message: '요청 횟수를 초과했습니다. 잠시 후 다시 시도해 주세요.' });
    }

    const connection = await db.promise().getConnection();
    try {
      await connection.beginTransaction();
      await connection.query(`
        INSERT INTO momu_password_reset_jobs
          (requestedId, requestedEmail, lookupHash, ipHash)
        VALUES (?, ?, ?, ?)
      `, [id, email, lookupHash, ipHash]);
      await recordAuthAudit({
        eventType: 'temporary_password',
        outcome: 'accepted',
        lookupHash,
        ipHash,
      }, connection);
      await connection.commit();
      await minimumResponseDelay(startedAt);
      return res.status(202).json(GENERIC_TEMPORARY_PASSWORD_RESPONSE);
    } catch (error) {
      try {
        await connection.rollback();
      } catch (_rollbackError) {
        // The original error is more useful and contains no password material.
      }
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('[MOMU AUTH] temporary password request failed', { code: error.code || 'RESET_ERROR' });
    await minimumResponseDelay(startedAt);
    return res.status(500).json({ success: false, message: '서버 내부 처리에 실패했습니다.' });
  }
});

/**
 * @swagger
 * /api/momu/auth/change-password:
 *   post:
 *     summary: 로그인 사용자의 비밀번호 변경
 *     tags: [Momu Auth]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newPassword, confirmPassword]
 *             properties:
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 10
 *                 maxLength: 128
 *                 example: NewStrongPassword!42
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *                 example: NewStrongPassword!42
 *     responses:
 *       200:
 *         description: 변경 완료 및 기존 토큰 무효화
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: 비밀번호가 변경되었습니다. 새 비밀번호로 다시 로그인해 주세요. }
 *       400: { description: 값 누락, 확인값 불일치 또는 비밀번호 정책 위반 }
 *       401: { description: 액세스 토큰 검증 실패 }
 *       500: { description: 서버 내부 오류 }
 */
router.post('/change-password', requireMomuAuth, async (req, res) => {
  const newPassword = String(req.body?.newPassword || '');
  const confirmPassword = String(req.body?.confirmPassword || '');
  const forcedChange = Boolean(req.auth.mustChangePassword);
  const passwordError = validateNewPassword(newPassword);
  if (passwordError || newPassword !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: passwordError || '새 비밀번호와 확인 값이 일치하지 않습니다.',
    });
  }

  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      'SELECT * FROM momu_users WHERE id = ? LIMIT 1 FOR UPDATE',
      [req.auth.userId],
    );
    const user = rows[0];
    if (!user || Number(user.auth_version || 1) !== req.auth.authVersion) {
      await connection.rollback();
      return res.status(401).json({ success: false, message: '로그인 정보가 만료되었습니다.' });
    }
    if (forcedChange && !user.must_change_password) {
      await connection.rollback();
      return res.status(401).json({ success: false, message: '비밀번호 변경 로그인이 만료되었습니다.' });
    }

    const reusedPassword = await verifyStoredPassword(newPassword, user);
    if (reusedPassword.matches) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: '새 비밀번호는 현재 비밀번호와 달라야 합니다.' });
    }

    const newHash = await hashPassword(newPassword);
    await connection.query(`
      UPDATE momu_users
      SET pw = NULL,
          password_hash = ?,
          must_change_password = 0,
          password_changed_at = NOW(),
          temporary_password_expires_at = NULL,
          temporary_password_used_at = NULL,
          auth_version = auth_version + 1
      WHERE id = ?
    `, [newHash, req.auth.userId]);
    await recordAuthAudit({
      eventType: 'password_change',
      outcome: 'changed',
      lookupHash: securityHash(req.auth.userId.toLowerCase()),
      ipHash: securityHash(req.ip || 'unknown'),
    }, connection);
    await connection.commit();
    return res.json({
      success: true,
      message: '비밀번호가 변경되었습니다. 새 비밀번호로 다시 로그인해 주세요.',
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch (_rollbackError) {
      // Keep the original error.
    }
    console.error('[MOMU AUTH] password change failed', { code: error.code || 'PASSWORD_CHANGE_ERROR' });
    return res.status(500).json({ success: false, message: '서버 오류로 비밀번호를 변경하지 못했습니다.' });
  } finally {
    connection.release();
  }
});

/**
 * @swagger
 * {
 * "/api/momu/auth/check-id": {
 * "post": {
 * "summary": "모뮤 아이디 중복 확인",
 * "tags": ["Momu Auth"],
 * "requestBody": {
 * "required": true,
 * "content": {
 * "application/json": {
 * "schema": {
 * "type": "object",
 * "properties": {
 * "id": { "type": "string", "description": "검사할 아이디" }
 * }
 * }
 * }
 * }
 * },
 * "responses": {
 * "200": { "description": "사용 가능한 아이디" },
 * "409": { "description": "이미 사용 중인 아이디 (회원가입 페이지로 이동)" },
 * "500": { "description": "서버 에러" }
 * }
 * }
 * }
 * }
 */
router.post('/check-id', (req, res) => {
  const { id } = req.body;

  const sql = 'SELECT id FROM momu_users WHERE id = ?';
  
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.log('아이디 중복 확인 중 에러 발생:', err);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }

    // 이미 금고에 같은 아이디가 있다면 프론트에서 에러로 잡고 페이지 이동할 수 있게 409 에러를 줘요!
    if (results.length > 0) {
      console.log('[모뮤] 아이디 중복을 확인했습니다.');
      return res.status(409).json({ success: false, message: '이미 사용 중인 아이디입니다.'});
    }

    // 겹치는 게 없으면 기분 좋게 200 오케이!
    console.log('[모뮤] 사용 가능한 아이디입니다.');
    return res.status(200).json({ success: true, message: '사용 가능한 아이디입니다.' });
  });
});

/**
 * @swagger
 * {
 * "/api/momu/auth/signup": {
 * "post": {
 * "summary": "모뮤 파트너 회원가입",
 * "tags": ["Momu Auth"],
 * "requestBody": {
 * "required": true,
 * "content": {
 * "application/json": {
 * "schema": {
 * "type": "object",
 * "properties": {
 * "id": { "type": "string", "description": "아이디" },
 * "pw": { "type": "string", "description": "비밀번호" },
 * "companyName": { "type": "string", "description": "회사/기관명" },
 * "companyAddress": { "type": "string", "description": "회사/기관 주소" },
 * "managerName": { "type": "string", "description": "담당자 이름" },
 * "managerPhone": { "type": "string", "description": "담당자 연락처" },
 * "managerEmail": { "type": "string", "description": "담당자 이메일" },
 * "companyLogo": { "type": "string", "description": "회사/기관 로고 (이미지 경로 또는 URL)" }
 * }
 * }
 * }
 * }
 * },
 * "responses": {
 * "200": { "description": "회원가입 성공" },
 * "500": { "description": "서버 에러" }
 * }
 * }
 * }
 * }
 */
router.post('/signup', async (req, res) => {
  const { 
    id, pw, companyName, companyAddress, 
    managerName, managerPhone, managerEmail, companyLogo 
  } = req.body;
  const normalizedId = normalizeId(id);
  const normalizedManagerEmail = normalizeEmail(managerEmail);
  const passwordError = validateNewPassword(pw);
  if (!normalizedId || normalizedId.length > 191 || !validEmail(normalizedManagerEmail) || passwordError) {
    return res.status(400).json({
      success: false,
      message: passwordError || '아이디와 올바른 담당자 이메일을 입력해 주세요.',
    });
  }

  try {
    const validLogo = await validateCompanyLogoReferenceAsync(normalizedId, companyLogo);
    if (!validLogo) {
      return res.status(400).json({
        success: false,
        message: '완료된 본인 소유의 회사 로고 업로드가 아닙니다.',
      });
    }

    const passwordHash = await hashPassword(pw);
    await db.promise().query(`
      INSERT INTO momu_users
        (id, pw, password_hash, must_change_password, password_changed_at,
         companyName, companyAddress, managerName, managerPhone, managerEmail, companyLogo)
      VALUES (?, NULL, ?, 0, NOW(), ?, ?, ?, ?, ?, ?)
    `, [
      normalizedId,
      passwordHash,
      companyName,
      companyAddress,
      managerName,
      managerPhone,
      normalizedManagerEmail,
      companyLogo,
    ]);
    return res.json({ success: true, message: '회원가입이 성공적으로 완료되었습니다.' });
  } catch (error) {
    console.error('[MOMU AUTH] signup failed', { code: error.code || 'SIGNUP_ERROR' });
    return res.status(500).json({ success: false, message: '서버 오류로 회원가입에 실패했습니다.' });
  }
});

/**
 * @swagger
 * {
 * "/api/momu/auth/profile": {
 * "post": {
 * "summary": "모뮤 파트너 회원정보 조회",
 * "tags": ["Momu Auth"],
 * "security": [{ "bearerAuth": [] }],
 * "responses": {
 * "200": { "description": "회원정보 조회 성공" },
 * "401": { "description": "액세스 토큰 누락 또는 만료" },
 * "403": { "description": "비밀번호 강제변경 필요" },
 * "404": { "description": "회원을 찾을 수 없음" },
 * "500": { "description": "서버 에러" }
 * }
 * }
 * }
 * }
 */
router.post('/profile', requireMomuAdmin, (req, res) => {
  const id = req.auth.userId;

  console.log('[모뮤] 회원 정보 조회 요청을 받았습니다.');

  // 금고에서 해당 아이디의 정보를 싹 다 가져옵니다
  const sql = 'SELECT * FROM momu_users WHERE id = ?';
  
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.log('회원정보 조회 중 에러 발생:', err);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }

    if (results.length > 0) {
      // 프론트엔드 명세서에 맞춰서, 비밀번호 같은 민감한 정보는 싹 빼고 줍니다
      const user = sanitizedUser(results[0]);
      delete user.created_at;
      
      console.log('[모뮤] 회원 정보 조회에 성공했습니다.');
      res.json({ success: true, user: user });
    } else {
      console.log('[모뮤] 회원 정보를 찾지 못했습니다.');
      res.status(404).json({ success: false, message: '회원정보를 찾을 수 없습니다.' });
    }
  });
});

/**
 * @swagger
 * {
 * "/api/momu/auth/update-profile": {
 * "post": {
 * "summary": "모뮤 파트너 회원정보 수정",
 * "tags": ["Momu Auth"],
 * "security": [{ "bearerAuth": [] }],
 * "requestBody": {
 * "required": true,
 * "content": {
 * "application/json": {
 * "schema": {
 * "type": "object",
 * "properties": {
 * "companyName": { "type": "string" },
 * "companyAddress": { "type": "string" },
 * "managerName": { "type": "string" },
 * "managerPhone": { "type": "string" },
 * "managerEmail": { "type": "string" },
 * "companyLogo": { "type": "string" }
 * }
 * }
 * }
 * }
 * },
 * "responses": {
 * "200": { "description": "회원정보 수정 성공" },
 * "400": { "description": "요청 형식 또는 담당자 이메일 오류" },
 * "401": { "description": "액세스 토큰 누락 또는 만료" },
 * "403": { "description": "비밀번호 강제변경 필요" },
 * "404": { "description": "수정할 회원을 찾을 수 없음" },
 * "500": { "description": "서버 에러" }
 * }
 * }
 * }
 * }
 */
router.post('/update-profile', requireMomuAdmin, (req, res) => {
  const { 
    companyName, companyAddress,
    managerName, managerPhone, managerEmail, companyLogo 
  } = req.body;
  const id = req.auth.userId;
  const normalizedManagerEmail = normalizeEmail(managerEmail);
  if (!validEmail(normalizedManagerEmail)) {
    return res.status(400).json({ success: false, message: '올바른 담당자 이메일을 입력해 주세요.' });
  }
  
  console.log('[모뮤] 회원 정보 수정 요청을 받았습니다.');

  validateCompanyLogoReference(
    id,
    companyLogo,
    (logoError, validLogo) => {
      if (logoError) {
        console.error('회사 로고 검증 중 에러:', logoError);
        return res.status(500).json({
          success: false,
          message: '회사 로고 정보를 확인하지 못했습니다.'
        });
      }
      if (!validLogo) {
        return res.status(400).json({
          success: false,
          message:
            '완료된 본인 소유의 회사 로고 업로드가 아닙니다.'
        });
      }

      const updateFields = [
        'companyName = ?',
        'companyAddress = ?',
        'managerName = ?',
        'managerPhone = ?',
        'managerEmail = ?',
        'companyLogo = ?'
      ];
      const values = [
        companyName,
        companyAddress,
        managerName,
        managerPhone,
        normalizedManagerEmail,
        companyLogo
      ];

      values.push(id);
      const sql = `
        UPDATE momu_users
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `;

      return db.query(sql, values, (err, result) => {
        if (err) {
          console.log('회원정보 수정 중 금고 에러 발생:', err);
          return res.status(500).json({
            success: false,
            message: '서버 오류로 정보 수정에 실패했습니다.'
          });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({
            success: false,
            message: '수정할 회원정보를 찾을 수 없습니다.'
          });
        }

        console.log('[모뮤] 회원정보 업데이트 완벽하게 대성공!! ✨');
        return res.json({
          success: true,
          message: '회원정보가 수정되었습니다.'
        });
      });
    }
  );
});

module.exports = router;
