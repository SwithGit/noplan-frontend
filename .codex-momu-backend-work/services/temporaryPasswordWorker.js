const db = require('../config/db');
const { sendTemporaryPasswordEmail } = require('./mailer');
const { generateTemporaryPassword, hashPassword } = require('./passwordSecurity');

let workerTimer;
let workerBusy = false;

async function insertAudit(connection, { outcome, lookupHash, ipHash, errorCode = null }) {
  await connection.query(`
    INSERT INTO momu_auth_audits
      (eventType, outcome, lookupHash, ipHash, errorCode)
    VALUES ('temporary_password', ?, ?, ?, ?)
  `, [outcome, lookupHash, ipHash, errorCode]);
}

async function claimNextJob(pool) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(`
      SELECT *
      FROM momu_password_reset_jobs
      WHERE (
          status IN ('pending', 'retry')
          AND nextAttemptAt <= NOW()
        ) OR (
          status = 'processing'
          AND lockedAt < DATE_SUB(NOW(), INTERVAL 10 MINUTE)
        )
      ORDER BY jobSeq
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `);
    const job = rows[0];
    if (!job) {
      await connection.commit();
      return null;
    }
    await connection.query(`
      UPDATE momu_password_reset_jobs
      SET status = 'processing', lockedAt = NOW(), attempts = attempts + 1
      WHERE jobSeq = ?
    `, [job.jobSeq]);
    await connection.commit();
    return { ...job, attempts: Number(job.attempts || 0) + 1 };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function markJobFailure(connection, job, error) {
  const maxAttempts = Math.max(1, Number.parseInt(process.env.TEMP_PASSWORD_MAIL_MAX_ATTEMPTS || '3', 10));
  const terminal = job.attempts >= maxAttempts;
  const retryDelaySeconds = Math.min(3600, 30 * (2 ** Math.max(0, job.attempts - 1)));
  try {
    await connection.beginTransaction();
    await connection.query(`
      UPDATE momu_password_reset_jobs
      SET status = ?,
          nextAttemptAt = DATE_ADD(NOW(), INTERVAL ? SECOND),
          lockedAt = NULL,
          lastErrorCode = ?,
          requestedId = IF(?, NULL, requestedId),
          requestedEmail = IF(?, NULL, requestedEmail),
          completedAt = IF(?, NOW(), NULL)
      WHERE jobSeq = ?
    `, [
      terminal ? 'failed' : 'retry',
      retryDelaySeconds,
      String(error.code || 'MAIL_SEND_FAILED').slice(0, 80),
      terminal,
      terminal,
      terminal,
      job.jobSeq,
    ]);
    await insertAudit(connection, {
      outcome: terminal ? 'mail_failed' : 'mail_retry',
      lookupHash: job.lookupHash,
      ipHash: job.ipHash,
      errorCode: String(error.code || 'MAIL_SEND_FAILED').slice(0, 80),
    });
    await connection.commit();
  } catch (auditError) {
    await connection.rollback();
    throw auditError;
  }
}

async function processClaimedJob(pool, job, sendEmail = sendTemporaryPasswordEmail) {
  const connection = await pool.getConnection();
  let temporaryPassword;
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(`
      SELECT id, managerEmail
      FROM momu_users
      WHERE id = ?
      LIMIT 1
      FOR UPDATE
    `, [job.requestedId]);
    const user = rows[0];
    const matches = user
      && String(user.managerEmail || '').trim().toLowerCase()
        === String(job.requestedEmail || '').trim().toLowerCase();

    if (!matches) {
      await connection.query(`
        UPDATE momu_password_reset_jobs
        SET status = 'no_match', requestedId = NULL, requestedEmail = NULL,
            lockedAt = NULL, completedAt = NOW()
        WHERE jobSeq = ?
      `, [job.jobSeq]);
      await insertAudit(connection, {
        outcome: 'no_match',
        lookupHash: job.lookupHash,
        ipHash: job.ipHash,
      });
      await connection.commit();
      return 'no_match';
    }

    temporaryPassword = generateTemporaryPassword();
    const temporaryHash = await hashPassword(temporaryPassword);
    await sendEmail({ to: user.managerEmail, temporaryPassword });
    await connection.query(`
      UPDATE momu_users
      SET pw = NULL,
          password_hash = ?,
          must_change_password = 1,
          password_changed_at = NOW(),
          temporary_password_expires_at = DATE_ADD(NOW(), INTERVAL 24 HOUR),
          temporary_password_used_at = NULL,
          auth_version = auth_version + 1
      WHERE id = ?
    `, [temporaryHash, user.id]);
    await connection.query(`
      UPDATE momu_password_reset_jobs
      SET status = 'sent', requestedId = NULL, requestedEmail = NULL,
          lockedAt = NULL, lastErrorCode = NULL, completedAt = NOW()
      WHERE jobSeq = ?
    `, [job.jobSeq]);
    await insertAudit(connection, {
      outcome: 'issued',
      lookupHash: job.lookupHash,
      ipHash: job.ipHash,
    });
    await connection.commit();
    return 'sent';
  } catch (error) {
    await connection.rollback();
    await markJobFailure(connection, job, error);
    return 'retry';
  } finally {
    temporaryPassword = null;
    connection.release();
  }
}

async function processNextTemporaryPasswordJob({
  pool = db.promise(),
  sendEmail = sendTemporaryPasswordEmail,
} = {}) {
  const job = await claimNextJob(pool);
  if (!job) return false;
  await processClaimedJob(pool, job, sendEmail);
  return true;
}

function startTemporaryPasswordWorker() {
  if (workerTimer) return;
  const pollIntervalMs = Math.max(1000, Number.parseInt(process.env.TEMP_PASSWORD_WORKER_INTERVAL_MS || '5000', 10));
  const run = async () => {
    if (workerBusy) return;
    workerBusy = true;
    try {
      while (await processNextTemporaryPasswordJob()) {
        // Drain queued jobs one at a time to keep password hashing memory bounded.
      }
    } catch (error) {
      console.error('[MOMU PASSWORD WORKER] processing failed', { code: error.code || 'WORKER_ERROR' });
    } finally {
      workerBusy = false;
    }
  };
  workerTimer = setInterval(run, pollIntervalMs);
  workerTimer.unref?.();
  run();
  console.log('[MOMU PASSWORD WORKER STARTED]', { pollIntervalMs });
}

module.exports = {
  processNextTemporaryPasswordJob,
  startTemporaryPasswordWorker,
};
