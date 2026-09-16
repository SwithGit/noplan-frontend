const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

test('ordinary and forced password changes both use the authenticated user without currentPassword', async () => {
  const dbPath = require.resolve('../config/db');
  const authPath = require.resolve('../routes/momu/auth');
  const authMiddlewarePath = require.resolve('../middleware/momuAuth');
  const previousSecret = process.env.AUTH_TOKEN_SECRET;
  const previousRounds = process.env.PASSWORD_BCRYPT_ROUNDS;
  process.env.AUTH_TOKEN_SECRET = 'test-only-secret-that-is-longer-than-thirty-two-characters';
  process.env.PASSWORD_BCRYPT_ROUNDS = '10';

  const statements = [];
  let selectedMustChange = 0;
  const connection = {
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
    query: async (sql) => {
      statements.push(sql);
      if (/SELECT \* FROM momu_users/.test(sql)) {
        return [[{
          id: 'admin2',
          auth_version: 7,
          must_change_password: selectedMustChange,
          password_hash: '$2b$12$TCEEHDzF/zuFH3V.QUAIBeyrS.khQ7pTgPVpkmd1tF4/MSLBbC5sK',
        }]];
      }
      return [{ affectedRows: 1 }];
    },
  };
  const fakeDb = {
    promise: () => ({ getConnection: async () => connection }),
    query: () => {
      throw new Error('Unexpected callback query');
    },
  };
  const fakeAuthMiddleware = {
    requireMomuAuth(req, _res, next) {
      selectedMustChange = req.get('x-test-forced') === 'true' ? 1 : 0;
      req.auth = {
        userId: 'admin2',
        authVersion: 7,
        mustChangePassword: Boolean(selectedMustChange),
      };
      return next();
    },
    requireMomuAdmin(_req, _res, next) {
      return next();
    },
  };

  const originalDbModule = require.cache[dbPath];
  const originalMiddlewareModule = require.cache[authMiddlewarePath];
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: fakeDb };
  require.cache[authMiddlewarePath] = {
    id: authMiddlewarePath,
    filename: authMiddlewarePath,
    loaded: true,
    exports: fakeAuthMiddleware,
  };
  delete require.cache[authPath];

  let server;
  try {
    const authRouter = require('../routes/momu/auth');
    const app = express();
    app.use(express.json());
    app.use('/api/momu/auth', authRouter);
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}/api/momu/auth/change-password`;
    const payload = {
      newPassword: 'NewStrongPassword!42',
      confirmPassword: 'NewStrongPassword!42',
    };

    const ordinaryResponse = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    assert.equal(ordinaryResponse.status, 200);
    assert.equal((await ordinaryResponse.json()).success, true);

    const forcedResponse = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Test-Forced': 'true' },
      body: JSON.stringify(payload),
    });
    assert.equal(forcedResponse.status, 200);
    assert.equal((await forcedResponse.json()).success, true);
    assert.equal(statements.some((sql) => /auth_version = auth_version \+ 1/.test(sql)), true);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    delete require.cache[authPath];
    if (originalDbModule) require.cache[dbPath] = originalDbModule;
    else delete require.cache[dbPath];
    if (originalMiddlewareModule) require.cache[authMiddlewarePath] = originalMiddlewareModule;
    else delete require.cache[authMiddlewarePath];
    if (previousSecret === undefined) delete process.env.AUTH_TOKEN_SECRET;
    else process.env.AUTH_TOKEN_SECRET = previousSecret;
    if (previousRounds === undefined) delete process.env.PASSWORD_BCRYPT_ROUNDS;
    else process.env.PASSWORD_BCRYPT_ROUNDS = previousRounds;
  }
});
