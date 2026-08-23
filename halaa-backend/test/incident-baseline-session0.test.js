/**
 * Session 0 Incident Baseline & Endpoint Smoke Test Suite
 *
 * Verifies:
 * 1. Direct authenticated GET endpoint smoke for all admin routes.
 * 2. Response envelope structures (status, data, results, pagination, stats).
 * 3. Role authorization across Super Admin, Admin, Moderator, Host, and Vendor.
 * 4. Authentication lifecycle: valid access, expired access (401), silent refresh via cookie, retry, and revoked refresh.
 * 5. Caddy proxy / cookie path alignment: access_token on '/', refresh_token on '/api/v2/auth/refresh'.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const memoryDb = require("./helpers/memoryDb");
const createApp = require("../src/app");
const config = require("../src/config");

const User = require("../models/UserModel");
const Plan = require("../models/PlanModel");
const Subscription = require("../models/SubscriptionModel");
const RefreshToken = require("../models/RefreshTokenModel");
const authService = require("../src/modules/auth/auth.service");

const { ROLES, USER_STATUS, SUBSCRIPTION_STATUS, ACCOUNT_TYPES } = require("../src/shared/constants");

let server;
let baseUrl;
let superAdminUser;
let adminUser;
let moderatorUser;
let hostUser;
let vendorUser;

function makeRequest({ method = "GET", path, headers = {}, cookie = "" }) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const reqHeaders = { ...headers };
    if (cookie) {
      reqHeaders["Cookie"] = cookie;
    }
    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders,
      },
      (res) => {
        let rawData = "";
        res.on("data", (chunk) => {
          rawData += chunk;
        });
        res.on("end", () => {
          let body;
          try {
            body = JSON.parse(rawData);
          } catch {
            body = rawData;
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body,
            setCookies: res.headers["set-cookie"] || [],
          });
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

function parseCookieHeader(setCookieHeaders) {
  const cookies = {};
  for (const str of setCookieHeaders) {
    const parts = str.split(";")[0].split("=");
    if (parts.length >= 2) {
      cookies[parts[0].trim()] = parts.slice(1).join("=").trim();
    }
  }
  return cookies;
}

test.before(async () => {
  await memoryDb.start();

  const app = createApp();
  server = http.createServer(app);
  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  // Seed plans
  const unlimitedPlan = await Plan.create({
    nameAr: "خطة غير محدودة",
    nameEn: "Unlimited Plan",
    code: "unlimited",
    planType: "unlimited",
    pricing: { oneTime: 0 },
    limits: { maxEvents: -1, durationDays: 9999 },
    features: { whatsAppTemplates: 10 },
    isActive: true,
  });

  const trialPlan = await Plan.create({
    nameAr: "خطة تجريبية",
    nameEn: "Trial Plan",
    code: "trial",
    planType: "trial",
    pricing: { oneTime: 0 },
    limits: { maxEvents: 1, maxInvitesPerEvent: 5, durationDays: 90 },
    features: { whatsAppTemplates: 1 },
    isActive: true,
  });

  // Seed users
  superAdminUser = await User.create({
    email: "superadmin@labbe.sa",
    phoneNumber: "545678901",
    username: "SuperAdmin",
    name: "Super Admin",
    password: "password123",
    role: ROLES.SUPER_ADMIN,
    status: USER_STATUS.ACTIVE,
    emailVerified: true,
  });
  const saSub = await Subscription.createForUser(superAdminUser._id, unlimitedPlan, {
    status: SUBSCRIPTION_STATUS.ACTIVE,
    pricePaid: 0,
  });
  superAdminUser.subscription = saSub._id;
  await superAdminUser.save({ validateBeforeSave: false });

  adminUser = await User.create({
    email: "admin@labbe.sa",
    phoneNumber: "556789012",
    username: "Admin",
    name: "Platform Admin",
    password: "password123",
    role: ROLES.ADMIN,
    status: USER_STATUS.ACTIVE,
    emailVerified: true,
  });
  const admSub = await Subscription.createForUser(adminUser._id, unlimitedPlan, {
    status: SUBSCRIPTION_STATUS.ACTIVE,
    pricePaid: 0,
  });
  adminUser.subscription = admSub._id;
  await adminUser.save({ validateBeforeSave: false });

  moderatorUser = await User.create({
    email: "moderator@labbe.sa",
    phoneNumber: "567890123",
    username: "Moderator",
    name: "Moderator",
    password: "password123",
    role: ROLES.MODERATOR,
    status: USER_STATUS.ACTIVE,
    emailVerified: true,
  });
  const modSub = await Subscription.createForUser(moderatorUser._id, unlimitedPlan, {
    status: SUBSCRIPTION_STATUS.ACTIVE,
    pricePaid: 0,
  });
  moderatorUser.subscription = modSub._id;
  await moderatorUser.save({ validateBeforeSave: false });

  hostUser = await User.create({
    email: "host@labbe.sa",
    phoneNumber: "512345678",
    username: "Host",
    name: "Test Host",
    password: "password123",
    role: ROLES.HOST,
    accountType: ACCOUNT_TYPES.PERSONAL,
    status: USER_STATUS.ACTIVE,
    emailVerified: true,
  });
  const hostSub = await Subscription.createForUser(hostUser._id, trialPlan, {
    status: SUBSCRIPTION_STATUS.TRIAL,
    pricePaid: 0,
  });
  hostUser.subscription = hostSub._id;
  await hostUser.save({ validateBeforeSave: false });

  vendorUser = await User.create({
    email: "vendor@labbe.sa",
    phoneNumber: "523456789",
    username: "Vendor",
    name: "Test Vendor",
    password: "password123",
    role: ROLES.VENDOR,
    status: USER_STATUS.ACTIVE,
    emailVerified: true,
  });
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await memoryDb.stop();
});

test("Session 0 — Task 4 & 5: Authenticated Endpoint Smoke & Response Envelope Matrix", async () => {
  const token = authService.signAccessToken(superAdminUser._id, superAdminUser.role);
  const cookie = `access_token=${token}`;

  const endpoints = [
    {
      name: "Discounts Admin List",
      path: "/api/v2/discounts/admin",
      verifyEnvelope: (body) => {
        assert.equal(body.status, "success");
        assert.ok(Array.isArray(body.data), "Discounts data must be an array");
      },
    },
    {
      name: "Template Categories Admin List",
      path: "/api/v2/admin/template-categories",
      verifyEnvelope: (body) => {
        assert.equal(body.status, "success");
        assert.ok(Array.isArray(body.data?.categories || body.data), "Template categories must be array");
      },
    },
    {
      name: "Payments Admin List",
      path: "/api/v2/admin/payments",
      verifyEnvelope: (body) => {
        assert.equal(body.status, "success");
        assert.ok(body.data?.payments !== undefined || Array.isArray(body.data), "Payments must exist");
        assert.ok(body.data?.stats !== undefined || body.stats !== undefined, "Payments stats must exist");
      },
    },
    {
      name: "Taqnyat Templates Admin List",
      path: "/api/v2/admin/taqnyat-templates",
      verifyEnvelope: (body) => {
        assert.equal(body.status, "success");
        assert.ok(Array.isArray(body.data?.templates), "Taqnyat templates must be an array in body.data.templates");
      },
    },
    {
      name: "Tickets List",
      path: "/api/v2/tickets",
      verifyEnvelope: (body) => {
        assert.equal(body.status, "success");
        assert.ok(Array.isArray(body.data?.tickets || body.data), "Tickets must be an array");
      },
    },
    {
      name: "Events Admin List",
      path: "/api/v2/events/admin/all",
      verifyEnvelope: (body) => {
        assert.equal(body.status, "success");
        assert.ok(body.data !== undefined, "Events data must exist");
      },
    },
    {
      name: "Vendors Admin List",
      path: "/api/v2/admin/vendors",
      verifyEnvelope: (body) => {
        assert.equal(body.status, "success");
        assert.ok(Array.isArray(body.data?.vendors || body.data), "Vendors must be an array");
      },
    },
    {
      name: "Hosts Admin List",
      path: "/api/v2/admin/hosts",
      verifyEnvelope: (body) => {
        assert.equal(body.status, "success");
        assert.ok(Array.isArray(body.data?.hosts || body.data), "Hosts must be an array");
      },
    },
    {
      name: "Moderators Admin List",
      path: "/api/v2/admin/moderators",
      verifyEnvelope: (body) => {
        assert.equal(body.status, "success");
        assert.ok(Array.isArray(body.data?.moderators || body.data), "Moderators must be an array");
      },
    },
    {
      name: "Dashboard Admin",
      path: "/api/v2/dashboard/admin",
      verifyEnvelope: (body) => {
        assert.equal(body.status, "success");
        assert.ok(Array.isArray(body.data?.statsCards), "Dashboard statsCards must be an array");
        assert.ok(body.data?.recentActivity, "Dashboard recentActivity must exist");
      },
    },
    {
      name: "Businesses Admin List",
      path: "/api/v2/admin/businesses",
      verifyEnvelope: (body) => {
        assert.equal(body.status, "success");
        assert.ok(Array.isArray(body.data?.businesses || body.data), "Businesses must be an array");
      },
    },
    {
      name: "Plans Admin List",
      path: "/api/v2/plans/admin/all",
      verifyEnvelope: (body) => {
        assert.equal(body.status, "success");
        assert.ok(Array.isArray(body.data?.plans || body.data), "Plans must be an array");
      },
    },
    {
      name: "Notification Preferences",
      path: "/api/v2/users/notification-preferences",
      verifyEnvelope: (body) => {
        assert.equal(body.status, "success");
        assert.ok(body.data !== undefined, "Notification preferences data must exist");
      },
    },
    {
      name: "Current User Profile (Me)",
      path: "/api/v2/auth/me",
      verifyEnvelope: (body) => {
        assert.equal(body.status, "success");
        assert.ok(body.data?.user !== undefined || body.data?._id !== undefined, "User profile must exist");
      },
    },
  ];

  for (const ep of endpoints) {
    const res = await makeRequest({ path: ep.path, cookie });
    assert.equal(
      res.status,
      200,
      `Endpoint ${ep.name} (${ep.path}) expected 200 but got ${res.status}: ${JSON.stringify(res.body)}`
    );
    ep.verifyEnvelope(res.body);
  }
});

test("Session 0 — Task 3: Authentication Lifecycle (Valid, Expired 401, Refresh Rotation, Replay, Revoked)", async () => {
  // 1. Create a real refresh session in DB
  const pair = await authService.issueTokenPair(
    superAdminUser,
    { ip: "127.0.0.1", userAgent: "test-agent" },
    false
  );
  assert.ok(pair.accessToken);
  assert.ok(pair.refreshToken);

  // 2. Valid access token request -> 200
  const validRes = await makeRequest({
    path: "/api/v2/admin/hosts",
    cookie: `access_token=${pair.accessToken}`,
  });
  assert.equal(validRes.status, 200, "Valid access token should return 200");

  // 3. Expired access token request -> 401
  const expiredToken = jwt.sign(
    { id: superAdminUser._id.toString(), role: superAdminUser.role },
    config.jwt.secret,
    { expiresIn: "-1s" } // already expired
  );
  const expiredRes = await makeRequest({
    path: "/api/v2/admin/hosts",
    cookie: `access_token=${expiredToken}`,
  });
  assert.equal(expiredRes.status, 401, "Expired access token must return 401");
  assert.equal(expiredRes.body.status, "fail");

  // 4. Client refreshes token via POST /api/v2/auth/refresh with refresh_token cookie
  const refreshRes = await makeRequest({
    method: "POST",
    path: "/api/v2/auth/refresh",
    cookie: `refresh_token=${pair.refreshToken}`,
  });
  assert.equal(refreshRes.status, 200, "Refresh endpoint must return 200");
  assert.equal(refreshRes.body.status, "success");

  const cookies = parseCookieHeader(refreshRes.setCookies);
  assert.ok(cookies.access_token, "Must receive new access_token cookie");

  // Verify cookie path and security attributes
  const rawSetCookie = refreshRes.setCookies.join(";;");
  assert.ok(rawSetCookie.includes("Path=/"), "access_token must have Path=/");
  assert.ok(rawSetCookie.includes("HttpOnly"), "access_token must be HttpOnly");

  // 5. Replay original request with newly issued access_token -> 200
  const replayRes = await makeRequest({
    path: "/api/v2/admin/hosts",
    cookie: `access_token=${cookies.access_token}`,
  });
  assert.equal(replayRes.status, 200, "Replayed request with refreshed access token must return 200");

  // 6. Revoked refresh token test
  // Revoke all sessions for the user
  await RefreshToken.deleteMany({ userId: superAdminUser._id });

  const revokedRefreshRes = await makeRequest({
    method: "POST",
    path: "/api/v2/auth/refresh",
    cookie: `refresh_token=${pair.refreshToken}`,
  });
  assert.equal(revokedRefreshRes.status, 401, "Revoked refresh token must return 401 on refresh");
});

test("Session 0 — Task 2: Role Authorization Matrix across Endpoints", async () => {
  const hostToken = authService.signAccessToken(hostUser._id, hostUser.role);
  const vendorToken = authService.signAccessToken(vendorUser._id, vendorUser.role);
  const modToken = authService.signAccessToken(moderatorUser._id, moderatorUser.role);
  const admToken = authService.signAccessToken(adminUser._id, adminUser.role);

  // Host attempting admin route -> 403 Forbidden
  const hostAdminRes = await makeRequest({
    path: "/api/v2/admin/hosts",
    cookie: `access_token=${hostToken}`,
  });
  assert.equal(hostAdminRes.status, 403, "Host user must receive 403 on admin hosts list");

  // Vendor attempting admin route -> 403 Forbidden
  const vendorAdminRes = await makeRequest({
    path: "/api/v2/admin/hosts",
    cookie: `access_token=${vendorToken}`,
  });
  assert.equal(vendorAdminRes.status, 403, "Vendor user must receive 403 on admin hosts list");

  // Moderator accessing moderator-permitted route -> 200
  const modRes = await makeRequest({
    path: "/api/v2/admin/hosts",
    cookie: `access_token=${modToken}`,
  });
  assert.equal(modRes.status, 200, "Moderator user has access to admin hosts list");

  // Admin accessing admin route -> 200
  const admRes = await makeRequest({
    path: "/api/v2/admin/hosts",
    cookie: `access_token=${admToken}`,
  });
  assert.equal(admRes.status, 200, "Admin user has access to admin hosts list");
});

test("Session 0 — Task 7: Caddy Topology & Cookie Flag Verification", () => {
  // Verify cookie configurations in backend config
  assert.equal(config.jwt.refreshCookiePath, "/api/v2/auth/refresh", "Refresh cookie path must be /api/v2/auth/refresh");
  assert.equal(config.jwt.accessExpiresIn, "15m", "Access token expiration should be 15m");
  assert.equal(config.jwt.refreshExpiresDays, 30, "Refresh token expiration should be 30 days");
});
