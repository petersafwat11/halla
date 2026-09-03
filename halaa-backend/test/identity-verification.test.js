const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('./helpers/memoryDb');

const User = require('../models/UserModel');
const { ROLES, USER_STATUS } = require('../src/shared/constants');
const usersService = require('../src/modules/users/users.service');
const authService = require('../src/modules/auth/auth.service');
const { updateProfileSchema } = require('../src/modules/users/users.validation');

// ============================================================
// SET-01 / SET-02 — Identity single-field (name only) and email
// verification state synchronization (backend contract).
// ============================================================

let hostUser;

test.before(async () => {
  await db.start();
});

test.after(async () => {
  await db.stop();
});

test.beforeEach(async () => {
  await db.clearAll();
  hostUser = await User.create({
    name: 'Original Name',
    email: `host_${Date.now()}@example.com`,
    phoneNumber: '+966551112233',
    role: ROLES.HOST,
    accountType: 'personal',
    status: USER_STATUS.ACTIVE,
  });
});

test('SET-01: updateMyProfile edits name and returns updated user', async () => {
  const result = await usersService.updateMyProfile(hostUser._id, {
    name: 'Renamed Host',
  });

  assert.equal(result.user.name, 'Renamed Host');
  assert.equal(result.user.username, undefined, 'username must not exist on user');
  assert.equal(result.user.email, hostUser.email);
});

test('SET-01: updateProfileSchema rejects payload containing username', async () => {
  assert.throws(() => {
    updateProfileSchema.parse({
      username: 'fresh_username',
      name: 'Test Name',
    });
  }, (err) => {
    return err.name === 'ZodError' && JSON.stringify(err.issues).includes('unrecognized_keys');
  });
});

test('SET-01: profile payload carries name and emailVerified', async () => {
  const result = await usersService.updateMyProfile(hostUser._id, {
    name: 'Full Identity',
  });

  assert.ok('emailVerified' in result.user, 'public user DTO must expose emailVerified');
  assert.equal(typeof result.user.emailVerified, 'boolean');
  assert.equal(result.user.name, 'Full Identity');
  assert.equal(result.user.username, undefined);
});

test('SET-01: changing email resets emailVerified server-side', async () => {
  hostUser.emailVerified = true;
  await hostUser.save({ validateBeforeSave: false });

  const newEmail = `changed_${Date.now()}@example.com`;
  const result = await usersService.updateMyProfile(hostUser._id, { email: newEmail });

  assert.equal(result.user.email, newEmail);
  assert.equal(result.user.emailVerified, false, 'email change must reset verification');
});

test('SET-02: verifyEmail flips the flag and returns the updated user DTO', async () => {
  const code = hostUser.createEmailVerificationCode();
  await hostUser.save({ validateBeforeSave: false });

  const returnedUser = await authService.verifyEmail(hostUser._id, code);

  assert.ok(returnedUser, 'verifyEmail must return the updated sanitized user');
  assert.equal(returnedUser.emailVerified, true);
  assert.equal(returnedUser.name, 'Original Name');
  assert.equal(returnedUser.username, undefined);
  assert.equal(returnedUser.password, undefined);
  assert.equal(returnedUser.emailVerificationCode, undefined);
});
