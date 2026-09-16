require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');

const argumentsList = process.argv.slice(2);
const apply = argumentsList.includes('--apply');
const expectedDatabase = argumentsList
  .find((value) => value.startsWith('--expected-db='))
  ?.slice('--expected-db='.length)
  .trim();
const oldBaseUrl = String(
  process.env.MOMU_OLD_API_BASE_URL || 'https://api.noplan.live',
).replace(/\/+$/g, '');
const newBaseUrl = String(
  process.env.MOMU_NEW_API_BASE_URL || 'https://api.mo-cms.com',
).replace(/\/+$/g, '');

if (!expectedDatabase) {
  console.error('Missing required --expected-db=<database> option.');
  process.exit(1);
}
if (!oldBaseUrl || !newBaseUrl || oldBaseUrl === newBaseUrl) {
  console.error('Old and new API base URLs must be different non-empty values.');
  process.exit(1);
}

const connectionOptions = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? {} : undefined,
};

for (const requiredName of ['DB_HOST', 'DB_USER', 'DB_PASS', 'DB_NAME']) {
  if (!process.env[requiredName]) {
    console.error(`Missing required environment variable: ${requiredName}`);
    process.exit(1);
  }
}

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

async function findTextColumns(connection) {
  const [rows] = await connection.query(`
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
  return rows;
}

async function findAffectedTargets(connection) {
  const columns = await findTextColumns(connection);
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

async function createBackup(connection, targets, databaseName) {
  const backup = {
    generatedAt: new Date().toISOString(),
    database: databaseName,
    oldBaseUrl,
    newBaseUrl,
    targets: [],
  };

  for (const target of targets) {
    const primaryKeys = await findPrimaryKeys(connection, target.table);
    if (primaryKeys.length === 0) {
      throw new Error(`Primary key not found for ${target.table}`);
    }

    const escapedTable = connection.escapeId(target.table);
    const escapedColumn = connection.escapeId(target.column);
    const selectColumns = [
      ...primaryKeys.map((key) => connection.escapeId(key)),
      escapedColumn,
    ].join(', ');
    const [rows] = await connection.query(
      `SELECT ${selectColumns} FROM ${escapedTable} ` +
        `WHERE CAST(${escapedColumn} AS CHAR) LIKE ? FOR UPDATE`,
      [`%${oldBaseUrl}%`],
    );
    backup.targets.push({ ...target, primaryKeys, rows });
  }

  const backupDirectory = path.resolve(process.cwd(), '_migration-backups');
  fs.mkdirSync(backupDirectory, { recursive: true, mode: 0o700 });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(
    backupDirectory,
    `api-domain-${databaseName}-${timestamp}.json`,
  );
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), {
    encoding: 'utf8',
    mode: 0o600,
  });
  return backupPath;
}

async function main() {
  const connection = await mysql.createConnection(connectionOptions);
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

    const targets = await findAffectedTargets(connection);
    const totalAffectedRows = targets.reduce(
      (sum, target) => sum + target.count,
      0,
    );

    if (!apply || targets.length === 0) {
      console.log(JSON.stringify({
        mode: apply ? 'apply' : 'dry-run',
        database: databaseName,
        oldBaseUrl,
        newBaseUrl,
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

    const backupPath = await createBackup(connection, targets, databaseName);
    const changedTargets = [];
    let totalChangedRows = 0;

    for (const target of targets) {
      const escapedTable = connection.escapeId(target.table);
      const escapedColumn = connection.escapeId(target.column);
      const [result] = await connection.query(
        `UPDATE ${escapedTable} ` +
          `SET ${escapedColumn} = REPLACE(${escapedColumn}, ?, ?) ` +
          `WHERE CAST(${escapedColumn} AS CHAR) LIKE ?`,
        [oldBaseUrl, newBaseUrl, `%${oldBaseUrl}%`],
      );
      const changedRows = Number(result.affectedRows || 0);
      totalChangedRows += changedRows;
      changedTargets.push({ ...target, changedRows });
    }

    const remainingTargets = await findAffectedTargets(connection);
    if (remainingTargets.length > 0) {
      throw new Error(
        `Verification failed; old URLs remain in ${remainingTargets.length} columns.`,
      );
    }

    await connection.commit();
    transactionStarted = false;
    console.log(JSON.stringify({
      mode: 'apply',
      database: databaseName,
      oldBaseUrl,
      newBaseUrl,
      backupPath,
      totalChangedRows,
      targets: changedTargets,
      remainingOldUrlTargets: 0,
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
