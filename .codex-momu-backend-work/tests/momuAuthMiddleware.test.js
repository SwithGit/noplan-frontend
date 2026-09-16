const test = require('node:test');
const assert = require('node:assert/strict');

test('authentication middleware does not return mysql callback Query as a thenable', () => {
  const dbPath = require.resolve('../config/db');
  const middlewarePath = require.resolve('../middleware/momuAuth');
  const originalDbModule = require.cache[dbPath];
  const previousSecret = process.env.AUTH_TOKEN_SECRET;
  process.env.AUTH_TOKEN_SECRET = 'test-only-secret-that-is-longer-than-thirty-two-characters';

  const queryThenable = {
    then() {
      throw new Error('Express must never receive the mysql Query object');
    },
  };
  const fakeDb = {
    query(_sql, _values, callback) {
      callback(null, [{ id: 'admin2', auth_version: 3, must_change_password: 1 }]);
      return queryThenable;
    },
  };
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: fakeDb };
  delete require.cache[middlewarePath];

  try {
    const { createAccessToken } = require('../services/authToken');
    const token = createAccessToken({ id: 'admin2', auth_version: 3, must_change_password: 1 });
    const { requireMomuAuth } = require('../middleware/momuAuth');
    const req = {
      get: () => `Bearer ${token}`,
    };
    const res = {
      status() { return this; },
      json() { return this; },
    };
    let nextCalled = false;
    const result = requireMomuAuth(req, res, (error) => {
      assert.equal(error, undefined);
      nextCalled = true;
    });

    assert.equal(result, undefined);
    assert.equal(nextCalled, true);
    assert.deepEqual(req.auth, {
      userId: 'admin2',
      authVersion: 3,
      mustChangePassword: true,
    });
  } finally {
    delete require.cache[middlewarePath];
    if (originalDbModule) require.cache[dbPath] = originalDbModule;
    else delete require.cache[dbPath];
    if (previousSecret === undefined) delete process.env.AUTH_TOKEN_SECRET;
    else process.env.AUTH_TOKEN_SECRET = previousSecret;
  }
});
