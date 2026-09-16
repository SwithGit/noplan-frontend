const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

test('temporary password request is queued without looking up the account', async () => {
  const dbPath = require.resolve('../config/db');
  const authPath = require.resolve('../routes/momu/auth');
  const authMiddlewarePath = require.resolve('../middleware/momuAuth');
  const previousSecret = process.env.AUTH_TOKEN_SECRET;
  const previousRounds = process.env.PASSWORD_BCRYPT_ROUNDS;
  const previousDelay = process.env.TEMP_PASSWORD_MIN_RESPONSE_MS;
  process.env.AUTH_TOKEN_SECRET = 'test-only-secret-that-is-longer-than-thirty-two-characters';
  process.env.PASSWORD_BCRYPT_ROUNDS = '10';
  process.env.TEMP_PASSWORD_MIN_RESPONSE_MS = '1';

  const transactionQueries = [];
  const connection = {
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
    query: async (sql) => {
      transactionQueries.push(sql);
      return [{ affectedRows: 1 }];
    },
  };
  const promisePool = {
    query: async (sql) => {
      if (/SELECT\s+SUM\(lookupHash/.test(sql)) {
        return [[{ accountAttempts: 0, ipAttempts: 0 }]];
      }
      return [{ affectedRows: 1 }];
    },
    getConnection: async () => connection,
  };
  const fakeDb = {
    promise: () => promisePool,
    query: () => {
      throw new Error('Unexpected callback query');
    },
  };

  const originalDbModule = require.cache[dbPath];
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: fakeDb };
  delete require.cache[authPath];
  delete require.cache[authMiddlewarePath];

  const originalConsoleError = console.error;
  console.error = () => {};
  let server;
  try {
    const authRouter = require('../routes/momu/auth');
    const app = express();
    app.use(express.json());
    app.use('/api/momu/auth', authRouter);
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/momu/auth/temporary-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'admin2', email: 'user@example.com' }),
    });
    const body = await response.json();

    assert.equal(response.status, 202);
    assert.deepEqual(body, {
      success: true,
      message: 'If matching account information exists, a temporary password will be sent by email.',
    });
    assert.equal(transactionQueries.some((sql) => /momu_users/.test(sql)), false);
    assert.equal(transactionQueries.some((sql) => /INSERT INTO momu_password_reset_jobs/.test(sql)), true);
    assert.equal(transactionQueries.some((sql) => /INSERT INTO momu_auth_audits/.test(sql)), true);
  } finally {
    console.error = originalConsoleError;
    if (server) await new Promise((resolve) => server.close(resolve));
    delete require.cache[authPath];
    delete require.cache[authMiddlewarePath];
    if (originalDbModule) require.cache[dbPath] = originalDbModule;
    else delete require.cache[dbPath];
    if (previousSecret === undefined) delete process.env.AUTH_TOKEN_SECRET;
    else process.env.AUTH_TOKEN_SECRET = previousSecret;
    if (previousRounds === undefined) delete process.env.PASSWORD_BCRYPT_ROUNDS;
    else process.env.PASSWORD_BCRYPT_ROUNDS = previousRounds;
    if (previousDelay === undefined) delete process.env.TEMP_PASSWORD_MIN_RESPONSE_MS;
    else process.env.TEMP_PASSWORD_MIN_RESPONSE_MS = previousDelay;
  }
});

test('worker retries mail failure without changing the existing password', async () => {
  const queries = [];
  const job = {
    jobSeq: 14,
    requestedId: 'admin2',
    requestedEmail: 'user@example.com',
    lookupHash: 'a'.repeat(64),
    ipHash: 'b'.repeat(64),
    attempts: 0,
  };
  const connection = {
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
    query: async (sql, values) => {
      queries.push({ sql, values });
      if (/SELECT \*/.test(sql) && /momu_password_reset_jobs/.test(sql)) return [[job]];
      if (/SELECT id, managerEmail/.test(sql)) {
        return [[{ id: 'admin2', managerEmail: 'user@example.com' }]];
      }
      return [{ affectedRows: 1 }];
    },
  };
  const pool = { getConnection: async () => connection };
  const sendEmail = async () => {
    const error = new Error('simulated SMTP failure');
    error.code = 'SMTP_DOWN';
    throw error;
  };
  const { processNextTemporaryPasswordJob } = require('../services/temporaryPasswordWorker');

  assert.equal(await processNextTemporaryPasswordJob({ pool, sendEmail }), true);
  assert.equal(queries.some(({ sql }) => /UPDATE momu_users/.test(sql)), false);
  assert.equal(queries.some(({ sql, values }) => /SET status = \?/.test(sql) && values?.[0] === 'retry'), true);
  assert.equal(queries.some(({ sql }) => /INSERT INTO momu_auth_audits/.test(sql)), true);
});

test('worker sends the temporary password before activating its hash', async () => {
  const queries = [];
  const job = {
    jobSeq: 15,
    requestedId: 'admin2',
    requestedEmail: 'user@example.com',
    lookupHash: 'c'.repeat(64),
    ipHash: 'd'.repeat(64),
    attempts: 0,
  };
  const connection = {
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
    query: async (sql, values) => {
      queries.push({ sql, values });
      if (/SELECT \*/.test(sql) && /momu_password_reset_jobs/.test(sql)) return [[job]];
      if (/SELECT id, managerEmail/.test(sql)) {
        return [[{ id: 'admin2', managerEmail: 'user@example.com' }]];
      }
      return [{ affectedRows: 1 }];
    },
  };
  const pool = { getConnection: async () => connection };
  let deliveredPassword;
  const sendEmail = async ({ temporaryPassword }) => {
    deliveredPassword = temporaryPassword;
  };
  const { processNextTemporaryPasswordJob } = require('../services/temporaryPasswordWorker');

  assert.equal(await processNextTemporaryPasswordJob({ pool, sendEmail }), true);
  assert.match(deliveredPassword, /[A-Z]/);
  assert.equal(queries.some(({ sql }) => /UPDATE momu_users/.test(sql)), true);
  assert.equal(queries.some(({ sql }) => /SET status = 'sent'/.test(sql)), true);
  const passwordUpdate = queries.find(({ sql }) => /UPDATE momu_users/.test(sql));
  assert.notEqual(passwordUpdate.values[0], deliveredPassword);
  assert.match(passwordUpdate.values[0], /^\$2[aby]\$/);
});
