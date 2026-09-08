import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import {
  setupTestDb,
  clearDatabase,
  stopReplSet,
  createTestApp,
} from './helpers/testHarness.js';
import { provisionUser, disableUser } from '../src/modules/auth/auth.service.js';
import { Session } from '../src/modules/auth/session.model.js';
import { ROLES } from '@halaa-checkin/contracts';
import { requireRole, requireEventAssignment } from '../src/middleware/authorize.js';
import { createLoginRateLimiter } from '../src/middleware/rateLimits.js';

let testEnv;

test.before(async () => {
  testEnv = await setupTestDb();
});

test.after(async () => {
  await stopReplSet();
});

test.beforeEach(async () => {
  await clearDatabase();
});

test('auth: login returns 200, sets cookie, and contains NO password/hash in response', async () => {
  await provisionUser({
    username: 'admin',
    displayName: 'System Admin',
    password: 'securePassword123!',
    role: ROLES.ADMIN,
  });

  const app = createTestApp({ mongodbDbName: testEnv.dbName });

  const res = await request(app)
    .post('/api/checkin/v1/auth/login')
    .set('Origin', 'http://localhost:3100')
    .send({ username: 'admin', password: 'securePassword123!' });

  assert.equal(res.status, 200);
  assert.ok(res.body.data);
  assert.equal(res.body.data.user.username, 'admin');
  assert.equal(res.body.data.user.displayName, 'System Admin');
  assert.equal(res.body.data.user.role, 'admin');
  assert.ok(res.body.data.csrfToken);

  // CRITICAL: No password or passwordHash in response
  const rawBody = JSON.stringify(res.body);
  assert.ok(!rawBody.includes('passwordHash'), 'Response must not contain passwordHash');
  assert.ok(!rawBody.includes('securePassword123!'), 'Response must not contain plaintext password');

  // Verify cookie is set
  const cookieHeader = res.headers['set-cookie'];
  assert.ok(cookieHeader, 'set-cookie header must be present');
  const cookieStr = Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader;
  assert.ok(cookieStr.includes('halaa-checkin-session-dev='), 'Session cookie must be set');
  assert.ok(cookieStr.toLowerCase().includes('httponly'), 'Cookie must be HttpOnly');
  assert.ok(cookieStr.toLowerCase().includes('samesite=lax'), 'Cookie must have SameSite=Lax');
});

test('auth: invalid credentials return 401 with UNAUTHENTICATED', async () => {
  await provisionUser({
    username: 'admin',
    displayName: 'System Admin',
    password: 'securePassword123!',
    role: ROLES.ADMIN,
  });

  const app = createTestApp({ mongodbDbName: testEnv.dbName });

  // 1. Wrong password
  const wrongPassRes = await request(app)
    .post('/api/checkin/v1/auth/login')
    .set('Origin', 'http://localhost:3100')
    .send({ username: 'admin', password: 'wrongPassword' });

  assert.equal(wrongPassRes.status, 401);
  assert.equal(wrongPassRes.body.error.code, 'UNAUTHENTICATED');

  // 2. Non-existent username
  const unknownUserRes = await request(app)
    .post('/api/checkin/v1/auth/login')
    .set('Origin', 'http://localhost:3100')
    .send({ username: 'does_not_exist', password: 'securePassword123!' });

  assert.equal(unknownUserRes.status, 401);
  assert.equal(unknownUserRes.body.error.code, 'UNAUTHENTICATED');
});

test('auth: session persists across app recreation (stateless server)', async () => {
  await provisionUser({
    username: 'receptionist',
    displayName: 'Gate Staff',
    password: 'gatePassword123!',
    role: ROLES.RECEPTION,
  });

  // App instance 1
  const app1 = createTestApp({ mongodbDbName: testEnv.dbName });
  const loginRes = await request(app1)
    .post('/api/checkin/v1/auth/login')
    .set('Origin', 'http://localhost:3100')
    .send({ username: 'receptionist', password: 'gatePassword123!' });

  assert.equal(loginRes.status, 200);
  const cookie = loginRes.headers['set-cookie'];

  // App instance 2 (simulating server restart or separate worker instance)
  const app2 = createTestApp({ mongodbDbName: testEnv.dbName });
  const sessionRes = await request(app2)
    .get('/api/checkin/v1/auth/session')
    .set('Cookie', cookie);

  assert.equal(sessionRes.status, 200);
  assert.equal(sessionRes.body.data.user.username, 'receptionist');
  assert.equal(sessionRes.body.data.user.role, 'reception');
  assert.ok(sessionRes.body.data.expiresAt);
});

test('auth: expired, disabled, and revoked sessions fail immediately', async () => {
  const user = await provisionUser({
    username: 'staff1',
    displayName: 'Staff One',
    password: 'password12345!',
    role: ROLES.RECEPTION,
  });

  const app = createTestApp({ mongodbDbName: testEnv.dbName });
  const loginRes = await request(app)
    .post('/api/checkin/v1/auth/login')
    .set('Origin', 'http://localhost:3100')
    .send({ username: 'staff1', password: 'password12345!' });

  const cookie = loginRes.headers['set-cookie'];

  // 1. Session is initially valid
  const initialRes = await request(app).get('/api/checkin/v1/auth/session').set('Cookie', cookie);
  assert.equal(initialRes.status, 200);

  // 2. Expired session fails runtime check
  await Session.updateMany({}, { expiresAt: new Date(Date.now() - 1000) });
  const expiredRes = await request(app).get('/api/checkin/v1/auth/session').set('Cookie', cookie);
  assert.equal(expiredRes.status, 401);
  assert.equal(expiredRes.body.error.code, 'UNAUTHENTICATED');

  // Reset expiry and test disabled user
  await Session.updateMany({}, { expiresAt: new Date(Date.now() + 3600000) });
  await disableUser(user.id);

  const disabledRes = await request(app).get('/api/checkin/v1/auth/session').set('Cookie', cookie);
  assert.equal(disabledRes.status, 401);
  assert.equal(disabledRes.body.error.code, 'UNAUTHENTICATED');

  // 3. User re-provisioning revokes existing sessions
  const newLoginApp = createTestApp({ mongodbDbName: testEnv.dbName });
  await provisionUser({
    username: 'staff2',
    displayName: 'Staff Two',
    password: 'passwordInitial123!',
    role: ROLES.RECEPTION,
  });

  const login2Res = await request(newLoginApp)
    .post('/api/checkin/v1/auth/login')
    .set('Origin', 'http://localhost:3100')
    .send({ username: 'staff2', password: 'passwordInitial123!' });

  const cookie2 = login2Res.headers['set-cookie'];

  // Re-provision with new password
  await provisionUser({
    username: 'staff2',
    displayName: 'Staff Two Updated',
    password: 'passwordNew123456!',
    role: ROLES.RECEPTION,
  });

  const revokedRes = await request(newLoginApp).get('/api/checkin/v1/auth/session').set('Cookie', cookie2);
  assert.equal(revokedRes.status, 401);
});

test('auth: logout revokes session and clears cookie with 204', async () => {
  await provisionUser({
    username: 'logoutuser',
    displayName: 'Logout User',
    password: 'password123!',
    role: ROLES.RECEPTION,
  });

  const app = createTestApp({ mongodbDbName: testEnv.dbName });
  const loginRes = await request(app)
    .post('/api/checkin/v1/auth/login')
    .set('Origin', 'http://localhost:3100')
    .send({ username: 'logoutuser', password: 'password123!' });

  const cookie = loginRes.headers['set-cookie'];
  const csrfToken = loginRes.body.data.csrfToken;

  // Logout requires Origin and X-CSRF-Token
  const logoutRes = await request(app)
    .post('/api/checkin/v1/auth/logout')
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', csrfToken)
    .set('Cookie', cookie);

  assert.equal(logoutRes.status, 204);

  // Cookie should be cleared
  const clearCookieHeader = logoutRes.headers['set-cookie'];
  assert.ok(clearCookieHeader);
  const clearCookieStr = Array.isArray(clearCookieHeader) ? clearCookieHeader[0] : clearCookieHeader;
  assert.ok(clearCookieStr.includes('halaa-checkin-session-dev=;'));

  // Subsequent check should fail with 401
  const sessionRes = await request(app).get('/api/checkin/v1/auth/session').set('Cookie', cookie);
  assert.equal(sessionRes.status, 401);
});

test('auth: Origin and CSRF enforcement rejects invalid requests', async () => {
  await provisionUser({
    username: 'csrfuser',
    displayName: 'CSRF User',
    password: 'password123!',
    role: ROLES.ADMIN,
  });

  const app = createTestApp({ mongodbDbName: testEnv.dbName });

  // 1. Missing Origin on POST /auth/login -> rejected with 403
  const missingOriginRes = await request(app)
    .post('/api/checkin/v1/auth/login')
    .send({ username: 'csrfuser', password: 'password123!' });

  assert.equal(missingOriginRes.status, 403);
  assert.equal(missingOriginRes.body.error.code, 'FORBIDDEN');

  // 2. Foreign Origin -> rejected with 403
  const foreignOriginRes = await request(app)
    .post('/api/checkin/v1/auth/login')
    .set('Origin', 'http://malicious-attacker.com')
    .send({ username: 'csrfuser', password: 'password123!' });

  assert.equal(foreignOriginRes.status, 403);

  // 3. Login with valid Origin succeeds
  const loginRes = await request(app)
    .post('/api/checkin/v1/auth/login')
    .set('Origin', 'http://localhost:3100')
    .send({ username: 'csrfuser', password: 'password123!' });

  assert.equal(loginRes.status, 200);
  const cookie = loginRes.headers['set-cookie'];

  // 4. Authenticated unsafe mutation missing X-CSRF-Token -> rejected with 403 CSRF_INVALID
  const missingCsrfRes = await request(app)
    .post('/api/checkin/v1/auth/logout')
    .set('Origin', 'http://localhost:3100')
    .set('Cookie', cookie);

  assert.equal(missingCsrfRes.status, 403);
  assert.equal(missingCsrfRes.body.error.code, 'CSRF_INVALID');

  // 5. Authenticated unsafe mutation with wrong X-CSRF-Token -> rejected with 403 CSRF_INVALID
  const wrongCsrfRes = await request(app)
    .post('/api/checkin/v1/auth/logout')
    .set('Origin', 'http://localhost:3100')
    .set('X-CSRF-Token', 'wrong-csrf-token-1234')
    .set('Cookie', cookie);

  assert.equal(wrongCsrfRes.status, 403);
  assert.equal(wrongCsrfRes.body.error.code, 'CSRF_INVALID');
});

test('auth: role and event scope restrictions are strictly enforced', async () => {
  const event1Id = new mongoose.Types.ObjectId().toString();
  const event2Id = new mongoose.Types.ObjectId().toString();

  await provisionUser({
    username: 'adminuser',
    displayName: 'Admin User',
    password: 'password123!',
    role: ROLES.ADMIN,
  });

  await provisionUser({
    username: 'receptionuser',
    displayName: 'Reception User',
    password: 'password123!',
    role: ROLES.RECEPTION,
    assignedEventIds: [event1Id],
  });

  const app = createTestApp({
    mongodbDbName: testEnv.dbName,
    registerRoutes: ({ app }) => {
      app.get('/test/admin-only', requireRole(ROLES.ADMIN), (req, res) => {
        res.status(200).json({ status: 'admin-ok' });
      });

      app.get('/test/event/:eventId', requireEventAssignment((req) => req.params.eventId), (req, res) => {
        res.status(200).json({ status: 'event-ok' });
      });
    },
  });

  // Log in reception user
  const recLoginRes = await request(app)
    .post('/api/checkin/v1/auth/login')
    .set('Origin', 'http://localhost:3100')
    .send({ username: 'receptionuser', password: 'password123!' });
  const recCookie = recLoginRes.headers['set-cookie'];

  // Reception user accessing admin route -> 403 FORBIDDEN
  const forbiddenRes = await request(app).get('/test/admin-only').set('Cookie', recCookie);
  assert.equal(forbiddenRes.status, 403);
  assert.equal(forbiddenRes.body.error.code, 'FORBIDDEN');

  // Reception user accessing assigned event1 -> 200 OK
  const assignedRes = await request(app).get(`/test/event/${event1Id}`).set('Cookie', recCookie);
  assert.equal(assignedRes.status, 200);

  // Reception user accessing unassigned event2 -> 404 NOT_FOUND
  const unassignedRes = await request(app).get(`/test/event/${event2Id}`).set('Cookie', recCookie);
  assert.equal(unassignedRes.status, 404);
  assert.equal(unassignedRes.body.error.code, 'NOT_FOUND');

  // Log in admin user
  const adminLoginRes = await request(app)
    .post('/api/checkin/v1/auth/login')
    .set('Origin', 'http://localhost:3100')
    .send({ username: 'adminuser', password: 'password123!' });
  const adminCookie = adminLoginRes.headers['set-cookie'];

  // Admin user accessing admin route -> 200 OK
  const adminRes = await request(app).get('/test/admin-only').set('Cookie', adminCookie);
  assert.equal(adminRes.status, 200);

  // Admin user has access to any event -> 200 OK
  const adminEventRes = await request(app).get(`/test/event/${event2Id}`).set('Cookie', adminCookie);
  assert.equal(adminEventRes.status, 200);
});

test('auth: production cookie flags use __Host prefix and Secure', async () => {
  await provisionUser({
    username: 'produser',
    displayName: 'Prod User',
    password: 'password123!',
    role: ROLES.ADMIN,
  });

  const prodApp = createTestApp({
    env: 'production',
    appOrigin: 'https://checkin.halaa.sa',
    mongodbDbName: testEnv.dbName,
    sessionSecret: 'super-long-secure-random-production-secret-123!',
  });

  const res = await request(prodApp)
    .post('/api/checkin/v1/auth/login')
    .set('Origin', 'https://checkin.halaa.sa')
    .send({ username: 'produser', password: 'password123!' });

  assert.equal(res.status, 200);
  const cookieHeader = res.headers['set-cookie'];
  assert.ok(cookieHeader);
  const cookieStr = Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader;

  // Must use __Host- prefix in production
  assert.ok(cookieStr.includes('__Host-halaa-checkin-session='));
  assert.ok(cookieStr.toLowerCase().includes('secure'));
  assert.ok(cookieStr.toLowerCase().includes('httponly'));
  assert.ok(cookieStr.toLowerCase().includes('samesite=lax'));
  assert.ok(!cookieStr.toLowerCase().includes('domain='), 'Host-only cookie must NOT specify a Domain');
});

test('auth: login rate limiting returns 429 with structured error envelope', async () => {
  const limiter = createLoginRateLimiter({ max: 5 });
  const app = createTestApp({ mongodbDbName: testEnv.dbName, loginLimiter: limiter });

  // Send 5 login requests (limit is 5)
  for (let i = 0; i < 5; i++) {
    await request(app)
      .post('/api/checkin/v1/auth/login')
      .set('Origin', 'http://localhost:3100')
      .send({ username: 'someone', password: 'badPassword123!' });
  }

  // 6th request must be rate limited
  const limitedRes = await request(app)
    .post('/api/checkin/v1/auth/login')
    .set('Origin', 'http://localhost:3100')
    .send({ username: 'someone', password: 'badPassword123!' });

  assert.equal(limitedRes.status, 429);
  assert.equal(limitedRes.body.error.code, 'RATE_LIMITED');
  assert.ok(limitedRes.body.error.message.includes('Too many login attempts'));
  assert.ok(limitedRes.body.error.requestId);
});
