const express = require('express');
const db = require('../../../config/db');
const { registerMomuDevice } = require('../../../services/momuDeviceRegistration');
const {
  recordOarchAdminAudit,
  recordOarchAdminAuditBestEffort,
} = require('../../../services/oarchAdminAudit');
const { trimText } = require('./utils');

const router = express.Router();

function normalizeSerialNumber(value) {
  return trimText(value, 64).toUpperCase();
}

function validateSerialRequest(body) {
  const customerId = trimText(body?.customerId, 191);
  const serialNumber = normalizeSerialNumber(body?.serialNumber);
  const siteName = trimText(body?.siteName, 100);
  const memo = trimText(body?.memo, 500);

  if (!customerId) return { error: '고객사를 선택해 주세요.' };
  if (!serialNumber || !/^[A-Z0-9-]{1,64}$/.test(serialNumber)) {
    return { error: 'Serial은 영문, 숫자, 하이픈으로 64자 이내로 입력해 주세요.' };
  }
  if (!siteName) return { error: '설치 현장명을 입력해 주세요.' };
  return { customerId, serialNumber, siteName, memo };
}

/**
 * @swagger
 * /api/momu/oarch-admin/serials:
 *   post:
 *     summary: 고객사에 OARCH Serial 등록
 *     tags: [OARCH Admin]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [customerId, serialNumber, siteName]
 *             properties:
 *               customerId: { type: string }
 *               serialNumber: { type: string, pattern: '^[A-Z0-9-]+$', maxLength: 64 }
 *               siteName: { type: string, maxLength: 100 }
 *               memo: { type: string, maxLength: 500 }
 *     responses:
 *       200: { description: Serial 등록 성공 }
 *       400: { description: 입력 형식 오류 }
 *       404: { description: 고객사 없음 }
 *       409: { description: Serial 중복 }
 */
router.post('/', async (req, res) => {
  const values = validateSerialRequest(req.body);
  if (values.error) {
    await recordOarchAdminAuditBestEffort({
      adminSeq: req.oarchAdmin.adminSeq,
      result: 'FAILURE',
      customerId: trimText(req.body?.customerId, 191) || null,
      serialNumber: normalizeSerialNumber(req.body?.serialNumber) || null,
      siteName: trimText(req.body?.siteName, 100) || null,
      message: 'VALIDATION_ERROR',
    });
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: values.error,
    });
  }

  const { customerId, serialNumber, siteName, memo } = values;
  let connection;
  try {
    connection = await db.promise().getConnection();
    await connection.beginTransaction();

    const [customerRows] = await connection.query(
      'SELECT id, companyName FROM momu_users WHERE id = ? LIMIT 1 FOR SHARE',
      [customerId],
    );
    if (!customerRows[0]) {
      const error = new Error('Customer not found.');
      error.code = 'CUSTOMER_NOT_FOUND';
      throw error;
    }

    const [duplicateRows] = await connection.query(
      'SELECT deviceSeq FROM momu_devices WHERE serialNumber = ? LIMIT 1',
      [serialNumber],
    );
    if (duplicateRows[0]) {
      const error = new Error('Serial already exists.');
      error.code = 'SERIAL_ALREADY_EXISTS';
      throw error;
    }

    const registration = await registerMomuDevice({
      id: customerId,
      deviceName: siteName,
      serialNumber,
      connection,
    });
    await recordOarchAdminAudit({
      adminSeq: req.oarchAdmin.adminSeq,
      result: 'SUCCESS',
      targetDeviceSeq: registration.device.deviceSeq,
      customerId,
      serialNumber,
      siteName,
      message: '등록 완료',
      detail: memo ? { memo } : null,
    }, connection);
    await connection.commit();

    return res.json({
      success: true,
      message: 'OARCH Serial이 등록되었습니다.',
      device: {
        ...registration.device,
        customerId,
        siteName,
      },
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('[OARCH ADMIN] Serial registration rollback failed', {
          code: rollbackError.code || 'ROLLBACK_ERROR',
        });
      }
    }

    const duplicate = error.code === 'SERIAL_ALREADY_EXISTS' || error.code === 'ER_DUP_ENTRY';
    const customerMissing = error.code === 'CUSTOMER_NOT_FOUND';
    const code = duplicate
      ? 'SERIAL_ALREADY_EXISTS'
      : customerMissing
        ? 'CUSTOMER_NOT_FOUND'
        : 'INTERNAL_ERROR';
    await recordOarchAdminAuditBestEffort({
      adminSeq: req.oarchAdmin.adminSeq,
      result: 'FAILURE',
      customerId,
      serialNumber,
      siteName,
      message: code,
      detail: memo ? { memo } : null,
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        code,
        message: '이미 등록된 Serial입니다.',
      });
    }
    if (customerMissing) {
      return res.status(404).json({
        success: false,
        code,
        message: '등록할 고객사를 찾을 수 없습니다.',
      });
    }
    console.error('[OARCH ADMIN] Serial registration failed', {
      code: error.code || 'SERIAL_REGISTRATION_ERROR',
    });
    return res.status(500).json({
      success: false,
      code,
      message: '서버 오류로 Serial 등록에 실패했습니다.',
    });
  } finally {
    connection?.release();
  }
});

module.exports = router;
module.exports.normalizeSerialNumber = normalizeSerialNumber;
module.exports.validateSerialRequest = validateSerialRequest;
