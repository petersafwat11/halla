const test = require("node:test");
const assert = require("node:assert/strict");
const db = require("./helpers/memoryDb");

const authService = require("../src/modules/auth/auth.service");
const usersService = require("../src/modules/users/users.service");
const User = require("../models/UserModel");
const RefreshToken = require("../models/RefreshTokenModel");

test.before(async () => {
  await db.start();
});

test.after(async () => {
  await db.stop();
});

test.beforeEach(async () => {
  await db.clearAll();
});

test("normal refresh token rotation issues a new pair and marks old token as revoked with replacedBy", async () => {
  const user = await User.create({
    name: "User One",
    username: "userone",
    email: "userone@example.com",
    phoneNumber: "0501111111",
    password: "Password123",
    role: "host",
    accountType: "personal",
    status: "active",
  });

  const pair1 = await authService.issueTokenPair(user, { ip: "127.0.0.1" });
  assert.ok(pair1.refreshToken);

  const rotated = await authService.rotateRefreshToken(pair1.refreshToken, { ip: "127.0.0.1" });
  assert.ok(rotated.accessToken);
  assert.ok(rotated.refreshToken);
  assert.notEqual(rotated.refreshToken, pair1.refreshToken);

  const hash1 = authService._hashRefresh(pair1.refreshToken);
  const doc1 = await RefreshToken.findOne({ tokenHash: hash1 });
  assert.ok(doc1.revokedAt, "Old token must be marked revokedAt");
  assert.ok(doc1.replacedBy, "Old token must have replacedBy set");
});

test("grace window reuse within 30s succeeds and does not revoke user sessions", async () => {
  const user = await User.create({
    name: "User Two",
    username: "usertwo",
    email: "usertwo@example.com",
    phoneNumber: "0502222222",
    password: "Password123",
    role: "host",
    accountType: "personal",
    status: "active",
  });

  const pair1 = await authService.issueTokenPair(user, { ip: "127.0.0.1" });

  // First rotation claims token1
  const rotated1 = await authService.rotateRefreshToken(pair1.refreshToken, { ip: "127.0.0.1" });
  assert.ok(rotated1.accessToken);

  // Concurrent replay with token1 within grace period (< 30s)
  const rotatedGrace = await authService.rotateRefreshToken(pair1.refreshToken, { ip: "127.0.0.1" });
  assert.ok(rotatedGrace.accessToken, "Grace replay should issue tokens");
  assert.ok(rotatedGrace.refreshToken);

  // User sessions should NOT be revoked
  const activeCount = await RefreshToken.countDocuments({ userId: user._id, revokedAt: null });
  assert.ok(activeCount >= 1, "Active refresh tokens should remain");
});

test("replay reuse after 30s grace window revokes all user sessions", async () => {
  const user = await User.create({
    name: "User Three",
    username: "userthree",
    email: "userthree@example.com",
    phoneNumber: "0503333333",
    password: "Password123",
    role: "host",
    accountType: "personal",
    status: "active",
  });

  const pair1 = await authService.issueTokenPair(user, { ip: "127.0.0.1" });
  await authService.rotateRefreshToken(pair1.refreshToken, { ip: "127.0.0.1" });

  // Manually age the revocation date to 35 seconds ago
  const hash1 = authService._hashRefresh(pair1.refreshToken);
  await RefreshToken.updateOne(
    { tokenHash: hash1 },
    { $set: { revokedAt: new Date(Date.now() - 35000) } }
  );

  // Replay after grace window expired
  await assert.rejects(
    async () => {
      await authService.rotateRefreshToken(pair1.refreshToken, { ip: "127.0.0.1" });
    },
    (err) => {
      assert.match(err.message, /Refresh token reuse detected/i);
      return true;
    }
  );

  // All user tokens must now be revoked
  const activeCount = await RefreshToken.countDocuments({ userId: user._id, revokedAt: null });
  assert.equal(activeCount, 0, "All sessions must be revoked");
});

test("expired refresh token is rejected without grace", async () => {
  const user = await User.create({
    name: "User Four",
    username: "userfour",
    email: "userfour@example.com",
    phoneNumber: "0504444444",
    password: "Password123",
    role: "host",
    accountType: "personal",
    status: "active",
  });

  const pair1 = await authService.issueTokenPair(user, { ip: "127.0.0.1" });

  // Manually expire the token
  const hash1 = authService._hashRefresh(pair1.refreshToken);
  await RefreshToken.updateOne(
    { tokenHash: hash1 },
    { $set: { expiresAt: new Date(Date.now() - 1000) } }
  );

  await assert.rejects(
    async () => {
      await authService.rotateRefreshToken(pair1.refreshToken, { ip: "127.0.0.1" });
    },
    (err) => {
      assert.match(err.message, /Refresh token expired/i);
      return true;
    }
  );
});

test("updateMyPassword revokes previous refresh tokens and returns fresh tokens", async () => {
  const user = await User.create({
    name: "User Five",
    username: "userfive",
    email: "userfive@example.com",
    phoneNumber: "0505555555",
    password: "OldPassword123",
    role: "host",
    accountType: "personal",
    status: "active",
  });

  const oldPair = await authService.issueTokenPair(user, { ip: "127.0.0.1" });
  const oldHash = authService._hashRefresh(oldPair.refreshToken);

  const result = await usersService.updateMyPassword(
    user._id,
    "OldPassword123",
    "NewPassword123",
    "NewPassword123",
    { ip: "127.0.0.1" }
  );

  assert.equal(result.success, true);
  assert.ok(result.accessToken);
  assert.ok(result.refreshToken);

  // Old refresh token must be revoked
  const oldDoc = await RefreshToken.findOne({ tokenHash: oldHash });
  assert.ok(oldDoc.revokedAt, "Previous refresh token must be revoked");

  // Wrong password update must throw with CURRENT_PASSWORD_INVALID code
  await assert.rejects(
    async () => {
      await usersService.updateMyPassword(
        user._id,
        "WrongOldPassword123",
        "AnotherPassword123",
        "AnotherPassword123"
      );
    },
    (err) => {
      assert.equal(err.code, "CURRENT_PASSWORD_INVALID");
      return true;
    }
  );
});
