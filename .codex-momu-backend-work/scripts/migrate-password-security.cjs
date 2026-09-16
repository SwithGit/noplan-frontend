require('dotenv').config();

const mysql = require('mysql2/promise');
const { hashPassword } = require('../services/passwordSecurity');

function hasArgument(name) {
  return process.argv.includes(name);
}

function argumentValue(name) {
  const prefix = `${name}=`;
  const item = process.argv.find((value) => value.startsWith(prefix));
  return item ? item.slice(prefix.length) : null;
}

async function main() {
  const apply = hasArgument('--apply');
  const expectedDatabase = argumentValue('--expected-db');
  if (!expectedDatabase || expectedDatabase !== process.env.DB_NAME) {
    throw new Error('Pass --expected-db with the exact DB_NAME before running this migration.');
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  try {
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'momu_users'
    `, [process.env.DB_NAME]);
    if (!columns.length) throw new Error('momu_users was not found.');

    const byName = new Map(columns.map((column) => [column.COLUMN_NAME, column]));
    const statements = [];
    if (!byName.has('password_hash')) {
      statements.push('ALTER TABLE momu_users ADD COLUMN password_hash VARCHAR(255) NULL AFTER pw');
    }
    if (!byName.has('must_change_password')) {
      statements.push('ALTER TABLE momu_users ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0 AFTER password_hash');
    }
    if (!byName.has('password_changed_at')) {
      statements.push('ALTER TABLE momu_users ADD COLUMN password_changed_at DATETIME NULL AFTER must_change_password');
    }
    if (!byName.has('temporary_password_expires_at')) {
      statements.push('ALTER TABLE momu_users ADD COLUMN temporary_password_expires_at DATETIME NULL AFTER password_changed_at');
    }
    if (!byName.has('temporary_password_used_at')) {
      statements.push('ALTER TABLE momu_users ADD COLUMN temporary_password_used_at DATETIME NULL AFTER temporary_password_expires_at');
    }
    if (!byName.has('auth_version')) {
      statements.push('ALTER TABLE momu_users ADD COLUMN auth_version INT UNSIGNED NOT NULL DEFAULT 1 AFTER temporary_password_used_at');
    }

    const pwColumn = byName.get('pw');
    if (pwColumn && pwColumn.IS_NULLABLE !== 'YES') {
      if (!/^[a-z]+(?:\([^)]*\))?(?:\s+unsigned)?$/i.test(pwColumn.COLUMN_TYPE)) {
        throw new Error(`Unsafe pw column type: ${pwColumn.COLUMN_TYPE}`);
      }
      statements.push(`ALTER TABLE momu_users MODIFY COLUMN pw ${pwColumn.COLUMN_TYPE} NULL`);
    }

    statements.push(`
      CREATE TABLE IF NOT EXISTS momu_auth_audits (
        auditSeq BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        eventType VARCHAR(40) NOT NULL,
        outcome VARCHAR(40) NOT NULL,
        lookupHash CHAR(64) NOT NULL,
        ipHash CHAR(64) NOT NULL,
        errorCode VARCHAR(80) NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (auditSeq),
        KEY idx_momu_auth_audit_lookup_time (lookupHash, createdAt),
        KEY idx_momu_auth_audit_ip_time (ipHash, createdAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    statements.push(`
      CREATE TABLE IF NOT EXISTS momu_password_reset_jobs (
        jobSeq BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        requestedId VARCHAR(191) NULL,
        requestedEmail VARCHAR(254) NULL,
        lookupHash CHAR(64) NOT NULL,
        ipHash CHAR(64) NOT NULL,
        status VARCHAR(24) NOT NULL DEFAULT 'pending',
        attempts INT UNSIGNED NOT NULL DEFAULT 0,
        nextAttemptAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        lockedAt DATETIME NULL,
        lastErrorCode VARCHAR(80) NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completedAt DATETIME NULL,
        PRIMARY KEY (jobSeq),
        KEY idx_momu_password_reset_job_poll (status, nextAttemptAt, jobSeq)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    let legacyPasswordsMigrated = 0;
    let temporaryPasswordsBackfilled = 0;
    if (apply) {
      for (const statement of statements) await connection.query(statement);
      const [legacyUsers] = await connection.query(`
        SELECT id, pw
        FROM momu_users
        WHERE password_hash IS NULL AND pw IS NOT NULL
      `);
      await connection.beginTransaction();
      try {
        for (const user of legacyUsers) {
          const passwordHash = await hashPassword(String(user.pw));
          const [result] = await connection.query(`
            UPDATE momu_users
            SET password_hash = ?, pw = NULL,
                password_changed_at = COALESCE(password_changed_at, NOW())
            WHERE id = ? AND password_hash IS NULL
          `, [passwordHash, user.id]);
          legacyPasswordsMigrated += result.affectedRows;
        }
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      }
      const [backfillResult] = await connection.query(`
        UPDATE momu_users
        SET temporary_password_expires_at = DATE_ADD(NOW(), INTERVAL 24 HOUR),
            temporary_password_used_at = NULL
        WHERE must_change_password = 1
          AND temporary_password_expires_at IS NULL
      `);
      temporaryPasswordsBackfilled = backfillResult.affectedRows;
    }

    console.log(JSON.stringify({
      mode: apply ? 'apply' : 'dry-run',
      database: process.env.DB_NAME,
      statements: statements.map((statement) => statement.replace(/\s+/g, ' ').trim()),
      legacyPasswordsMigrated,
      temporaryPasswordsBackfilled,
      message: apply ? 'Password security schema is ready.' : 'Dry run only. Re-run with --apply.',
    }, null, 2));
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
