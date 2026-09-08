import test from 'node:test';
import assert from 'node:assert/strict';
import { validateConfig, loadConfig } from '../src/config.js';

test('config: rejects database names from parent Halaa or without allowed prefix', () => {
  const forbiddenNames = [
    'halaa',
    'halla',
    'halaa_backend',
    'halaa-backend',
    'halaa_prod',
    'halla_prod',
    'random_db',
    'test',
    'mydb',
  ];

  for (const dbName of forbiddenNames) {
    assert.throws(
      () => {
        validateConfig({
          env: 'development',
          appOrigin: 'http://localhost:3100',
          mongodb: { dbName },
          session: { secret: 'dev-secret-at-least-32-chars-long!!' },
        });
      },
      /Mini-app database name must start with one of: halaa_checkin, checkin_/,
      `Expected database name '${dbName}' to be rejected`
    );
  }
});

test('config: accepts valid mini-app database names with required prefix', () => {
  const validNames = [
    'halaa_checkin',
    'halaa_checkin_prod',
    'halaa_checkin_dev',
    'halaa_checkin_test_123',
    'checkin_production',
    'checkin_v1',
  ];

  for (const dbName of validNames) {
    assert.doesNotThrow(() => {
      validateConfig({
        env: 'development',
        appOrigin: 'http://localhost:3100',
        mongodb: { dbName },
        session: { secret: 'dev-secret-at-least-32-chars-long!!' },
      });
    });
  }
});

test('config: production rules fail fast on insecure defaults, HTTP origin, or weak secrets', () => {
  // 1. Rejects HTTP in production APP_ORIGIN
  assert.throws(
    () => {
      validateConfig({
        env: 'production',
        appOrigin: 'http://checkin.halaa.sa', // Not HTTPS
        mongodb: { dbName: 'halaa_checkin_prod' },
        session: { secret: 'a-very-long-production-secret-value-32chars!' },
      });
    },
    /Production APP_ORIGIN must use HTTPS/
  );

  // 2. Rejects missing/short SESSION_SECRET in production
  assert.throws(
    () => {
      validateConfig({
        env: 'production',
        appOrigin: 'https://checkin.halaa.sa',
        mongodb: { dbName: 'halaa_checkin_prod' },
        session: { secret: 'short' },
      });
    },
    /Production SESSION_SECRET must be at least 32 characters long/
  );

  // 3. Rejects known insecure placeholder secrets
  const insecurePlaceholders = ['change-me', 'secret', 'dev-secret', 'password'];
  for (const placeholder of insecurePlaceholders) {
    assert.throws(
      () => {
        validateConfig({
          env: 'production',
          appOrigin: 'https://checkin.halaa.sa',
          mongodb: { dbName: 'halaa_checkin_prod' },
          session: { secret: placeholder },
        });
      },
      /Production SESSION_SECRET/
    );
  }

  // 4. Accepts valid production configuration
  assert.doesNotThrow(() => {
    validateConfig({
      env: 'production',
      appOrigin: 'https://checkin.halaa.sa',
      mongodb: { dbName: 'halaa_checkin_prod' },
      session: { secret: 'super-secure-production-secret-with-entropy-123456!' },
    });
  });
});

test('config: loadConfig uses production cookie name in production', () => {
  const prodConfig = loadConfig({
    env: 'production',
    appOrigin: 'https://checkin.halaa.sa',
    mongodbDbName: 'halaa_checkin_prod',
    sessionSecret: 'super-secure-production-secret-with-entropy-123456!',
  });
  assert.equal(prodConfig.session.cookieName, '__Host-halaa-checkin-session');

  const devConfig = loadConfig({
    env: 'development',
    appOrigin: 'http://localhost:3100',
    mongodbDbName: 'halaa_checkin_dev',
  });
  assert.equal(devConfig.session.cookieName, 'halaa-checkin-session-dev');
});
