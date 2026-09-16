require('dotenv').config();

const mysql = require('mysql2/promise');

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

  const statement = `
    CREATE TABLE IF NOT EXISTS momu_qr_download_links (
      linkSeq BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      tokenHash CHAR(64) NOT NULL,
      objectKey VARCHAR(1024) NOT NULL,
      downloadName VARCHAR(120) NOT NULL,
      contentType VARCHAR(64) NOT NULL,
      expiresAt DATETIME NOT NULL,
      downloadCount INT UNSIGNED NOT NULL DEFAULT 0,
      lastDownloadedAt DATETIME NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (linkSeq),
      UNIQUE KEY uq_momu_qr_download_token (tokenHash),
      KEY idx_momu_qr_download_expiry (expiresAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `;

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  try {
    if (apply) await connection.query(statement);
    console.log(JSON.stringify({
      mode: apply ? 'apply' : 'dry-run',
      database: process.env.DB_NAME,
      statements: [statement.replace(/\s+/g, ' ').trim()],
      message: apply ? 'QR download link schema is ready.' : 'Dry run only. Re-run with --apply.',
    }, null, 2));
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
