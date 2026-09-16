require('dotenv').config();

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');

const argumentList = process.argv.slice(2);
const expectedDatabase = argumentList
  .find((value) => value.startsWith('--expected-db='))
  ?.slice('--expected-db='.length)
  .trim();
const outputArgument = argumentList
  .find((value) => value.startsWith('--output='))
  ?.slice('--output='.length)
  .trim();

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

const sha256 = (value) => crypto
  .createHash('sha256')
  .update(value)
  .digest('hex');

const normalizeSqlType = (column) => ({
  name: column.COLUMN_NAME,
  type: column.COLUMN_TYPE,
  nullable: column.IS_NULLABLE,
  default: column.COLUMN_DEFAULT,
  extra: column.EXTRA,
  collation: column.COLLATION_NAME,
});

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? {} : undefined,
    supportBigNumbers: true,
    bigNumberStrings: true,
  });

  try {
    const [[identity]] = await connection.query(`
      SELECT
        DATABASE() AS databaseName,
        @@hostname AS databaseServer,
        VERSION() AS databaseVersion
    `);
    const databaseName = String(identity?.databaseName || '');
    if (databaseName !== expectedDatabase) {
      throw new Error(
        `Database safety check failed: expected ${expectedDatabase}, ` +
          `connected to ${databaseName || '(none)'}`,
      );
    }

    const [tableRows] = await connection.query(`
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME LIKE 'momu\\_%'
        AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);

    const tables = [];
    let totalRows = 0;
    for (const tableRow of tableRows) {
      const tableName = tableRow.TABLE_NAME;
      const [columns] = await connection.query(`
        SELECT
          COLUMN_NAME,
          COLUMN_TYPE,
          IS_NULLABLE,
          COLUMN_DEFAULT,
          EXTRA,
          COLLATION_NAME,
          ORDINAL_POSITION
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION
      `, [tableName]);

      const escapedTable = connection.escapeId(tableName);
      const rowParts = columns.map((column) => {
        const escapedColumn = connection.escapeId(column.COLUMN_NAME);
        return `COALESCE(HEX(CAST(${escapedColumn} AS BINARY)), 'NULL')`;
      });
      const fingerprintExpression = rowParts.length > 0
        ? `BIT_XOR(CAST(CRC32(CONCAT_WS('#', ${rowParts.join(', ')})) AS UNSIGNED))`
        : '0';
      const [[summary]] = await connection.query(`
        SELECT
          COUNT(*) AS rowCount,
          COALESCE(${fingerprintExpression}, 0) AS dataFingerprint
        FROM ${escapedTable}
      `);
      const rowCount = Number(summary.rowCount || 0);
      totalRows += rowCount;
      const normalizedColumns = columns.map(normalizeSqlType);
      tables.push({
        table: tableName,
        rowCount,
        dataFingerprint: String(summary.dataFingerprint || '0'),
        columnCount: normalizedColumns.length,
        schemaFingerprint: sha256(JSON.stringify(normalizedColumns)),
      });
    }

    const patterns = [
      ['oldApiDomain', '%api.noplan.live%'],
      ['newApiDomain', '%api.mo-cms.com%'],
      ['oldS3Bucket', '%viaunity.s3.%amazonaws.com%'],
    ];
    const [textColumns] = await connection.query(`
      SELECT TABLE_NAME, COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME LIKE 'momu\\_%'
        AND DATA_TYPE IN (
          'char', 'varchar', 'tinytext', 'text', 'mediumtext',
          'longtext', 'json'
        )
      ORDER BY TABLE_NAME, ORDINAL_POSITION
    `);
    const references = Object.fromEntries(patterns.map(([name]) => [name, 0]));
    for (const column of textColumns) {
      const escapedTable = connection.escapeId(column.TABLE_NAME);
      const escapedColumn = connection.escapeId(column.COLUMN_NAME);
      for (const [name, pattern] of patterns) {
        const [[result]] = await connection.query(
          `SELECT COUNT(*) AS count FROM ${escapedTable} ` +
            `WHERE CAST(${escapedColumn} AS CHAR) LIKE ?`,
          [pattern],
        );
        references[name] += Number(result.count || 0);
      }
    }

    const report = {
      generatedAt: new Date().toISOString(),
      database: databaseName,
      databaseServer: identity.databaseServer,
      databaseVersion: identity.databaseVersion,
      tableCount: tables.length,
      totalRows,
      references,
      tables,
    };
    const serialized = `${JSON.stringify(report, null, 2)}\n`;
    if (outputArgument) {
      const outputPath = path.resolve(process.cwd(), outputArgument);
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, serialized, { encoding: 'utf8', mode: 0o600 });
      console.log(JSON.stringify({
        database: databaseName,
        tableCount: tables.length,
        totalRows,
        references,
        outputPath,
      }, null, 2));
      return;
    }
    process.stdout.write(serialized);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
