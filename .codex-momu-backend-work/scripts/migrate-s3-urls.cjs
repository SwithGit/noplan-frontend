require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');

const argumentList = process.argv.slice(2);
const apply = argumentList.includes('--apply');
const expectedDatabase = argumentList
  .find((value) => value.startsWith('--expected-db='))
  ?.slice('--expected-db='.length)
  .trim();
const oldBaseUrl = String(
  process.env.MOMU_OLD_S3_PUBLIC_BASE_URL ||
    'https://viaunity.s3.ap-northeast-2.amazonaws.com/',
).replace(/\/+$/g, '');
const publicApiBaseUrl = String(
  process.env.MOMU_PUBLIC_API_BASE_URL || 'https://api.mo-cms.com',
).replace(/\/+$/g, '');
const storageEndpoint = `${publicApiBaseUrl}/api/momu/storage/file?key=`;

if (!expectedDatabase) {
  console.error('Missing required --expected-db=<database> option.');
  process.exit(1);
}
for (const requiredName of ['DB_HOST', 'DB_USER', 'DB_PASS', 'DB_NAME']) {
  if (!process.env[requiredName]) {
    console.error(`Missing required environment variable: ${requiredName}`);
    process.exit(1);
  }
}

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const directUrlPattern = new RegExp(
  `${escapeRegExp(oldBaseUrl)}/([^"'\\\\\s?#]+)`,
  'g',
);

const normalizeObjectKey = (encodedKey) => {
  try {
    return decodeURIComponent(encodedKey);
  } catch (_error) {
    return encodedKey;
  }
};

const migrateValue = (value) => String(value).replace(
  directUrlPattern,
  (_url, encodedKey) => (
    `${storageEndpoint}${encodeURIComponent(normalizeObjectKey(encodedKey))}`
  ),
);

async function findPrimaryKeys(connection, tableName) {
  const [rows] = await connection.query(`
    SELECT k.COLUMN_NAME
    FROM information_schema.TABLE_CONSTRAINTS t
    INNER JOIN information_schema.KEY_COLUMN_USAGE k
      ON k.CONSTRAINT_SCHEMA = t.CONSTRAINT_SCHEMA
     AND k.TABLE_NAME = t.TABLE_NAME
     AND k.CONSTRAINT_NAME = t.CONSTRAINT_NAME
    WHERE t.CONSTRAINT_SCHEMA = DATABASE()
      AND t.TABLE_NAME = ?
      AND t.CONSTRAINT_TYPE = 'PRIMARY KEY'
    ORDER BY k.ORDINAL_POSITION
  `, [tableName]);
  return rows.map((row) => row.COLUMN_NAME);
}

async function findTargets(connection) {
  const [columns] = await connection.query(`
    SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME LIKE 'momu\\_%'
      AND DATA_TYPE IN (
        'char', 'varchar', 'tinytext', 'text', 'mediumtext',
        'longtext', 'json'
      )
    ORDER BY TABLE_NAME, ORDINAL_POSITION
  `);
  const targets = [];
  for (const column of columns) {
    const escapedTable = connection.escapeId(column.TABLE_NAME);
    const escapedColumn = connection.escapeId(column.COLUMN_NAME);
    const [rows] = await connection.query(
      `SELECT COUNT(*) AS count FROM ${escapedTable} ` +
        `WHERE CAST(${escapedColumn} AS CHAR) LIKE ?`,
      [`%${oldBaseUrl}%`],
    );
    const count = Number(rows[0]?.count || 0);
    if (count > 0) {
      targets.push({
        table: column.TABLE_NAME,
        column: column.COLUMN_NAME,
        dataType: column.DATA_TYPE,
        count,
      });
    }
  }
  return targets;
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? {} : undefined,
  });
  let transactionStarted = false;

  try {
    const [[identity]] = await connection.query(
      'SELECT DATABASE() AS databaseName',
    );
    const databaseName = String(identity?.databaseName || '');
    if (databaseName !== expectedDatabase) {
      throw new Error(
        `Database safety check failed: expected ${expectedDatabase}, ` +
          `connected to ${databaseName || '(none)'}`,
      );
    }

    if (apply) {
      await connection.beginTransaction();
      transactionStarted = true;
    }
    const targets = await findTargets(connection);
    const totalAffectedRows = targets.reduce(
      (sum, target) => sum + target.count,
      0,
    );
    if (!apply || targets.length === 0) {
      console.log(JSON.stringify({
        mode: apply ? 'apply' : 'dry-run',
        database: databaseName,
        oldBaseUrl,
        storageEndpoint,
        totalAffectedRows,
        targets,
        message: apply
          ? 'No matching rows; no changes were needed.'
          : 'Dry run only. Re-run with --apply to change data.',
      }, null, 2));
      if (transactionStarted) {
        await connection.commit();
        transactionStarted = false;
      }
      return;
    }

    const backup = {
      generatedAt: new Date().toISOString(),
      database: databaseName,
      oldBaseUrl,
      storageEndpoint,
      targets: [],
    };
    const pendingUpdates = [];
    for (const target of targets) {
      const primaryKeys = await findPrimaryKeys(connection, target.table);
      if (primaryKeys.length === 0) {
        throw new Error(`Primary key not found for ${target.table}`);
      }
      const escapedTable = connection.escapeId(target.table);
      const escapedColumn = connection.escapeId(target.column);
      const selectedColumns = [
        ...primaryKeys.map((key) => connection.escapeId(key)),
        `CAST(${escapedColumn} AS CHAR) AS value`,
      ].join(', ');
      const [rows] = await connection.query(
        `SELECT ${selectedColumns} FROM ${escapedTable} ` +
          `WHERE CAST(${escapedColumn} AS CHAR) LIKE ? FOR UPDATE`,
        [`%${oldBaseUrl}%`],
      );
      backup.targets.push({ ...target, primaryKeys, rows });
      for (const row of rows) {
        const migratedValue = migrateValue(row.value);
        if (migratedValue === row.value) {
          throw new Error(
            `URL conversion failed for ${target.table}.${target.column}`,
          );
        }
        pendingUpdates.push({
          target,
          primaryKeys,
          row,
          migratedValue,
        });
      }
    }

    const backupDirectory = path.resolve(process.cwd(), '_migration-backups');
    fs.mkdirSync(backupDirectory, { recursive: true, mode: 0o700 });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(
      backupDirectory,
      `s3-urls-${databaseName}-${timestamp}.json`,
    );
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), {
      encoding: 'utf8',
      mode: 0o600,
    });

    for (const update of pendingUpdates) {
      const escapedTable = connection.escapeId(update.target.table);
      const escapedColumn = connection.escapeId(update.target.column);
      const whereClause = update.primaryKeys
        .map((key) => `${connection.escapeId(key)} = ?`)
        .join(' AND ');
      await connection.query(
        `UPDATE ${escapedTable} SET ${escapedColumn} = ? ` +
          `WHERE ${whereClause}`,
        [
          update.migratedValue,
          ...update.primaryKeys.map((key) => update.row[key]),
        ],
      );
    }

    const remainingTargets = await findTargets(connection);
    if (remainingTargets.length > 0) {
      throw new Error(
        `Verification failed; old S3 URLs remain in ` +
          `${remainingTargets.length} columns.`,
      );
    }
    await connection.commit();
    transactionStarted = false;
    console.log(JSON.stringify({
      mode: 'apply',
      database: databaseName,
      oldBaseUrl,
      storageEndpoint,
      backupPath,
      totalChangedRows: pendingUpdates.length,
      targets,
      remainingOldS3UrlTargets: 0,
    }, null, 2));
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
