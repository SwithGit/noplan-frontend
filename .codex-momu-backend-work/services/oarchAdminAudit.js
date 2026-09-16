const db = require('../config/db');

async function recordOarchAdminAudit({
  adminSeq,
  result,
  targetDeviceSeq = null,
  customerId = null,
  serialNumber = null,
  siteName = null,
  message = null,
  detail = null,
}, connection = db.promise()) {
  await connection.query(`
    INSERT INTO momu_oarch_admin_audits
      (
        adminSeq,
        actionType,
        result,
        targetDeviceSeq,
        customerId,
        serialNumber,
        siteName,
        message,
        detail
      )
    VALUES (?, 'SERIAL_REGISTER', ?, ?, ?, ?, ?, ?, ?)
  `, [
    adminSeq,
    result,
    targetDeviceSeq,
    customerId,
    serialNumber,
    siteName,
    message,
    detail === null ? null : JSON.stringify(detail),
  ]);
}

async function recordOarchAdminAuditBestEffort(payload) {
  try {
    await recordOarchAdminAudit(payload);
  } catch (error) {
    console.error('[OARCH ADMIN] audit write failed', {
      code: error.code || 'AUDIT_WRITE_ERROR',
    });
  }
}

module.exports = {
  recordOarchAdminAudit,
  recordOarchAdminAuditBestEffort,
};
