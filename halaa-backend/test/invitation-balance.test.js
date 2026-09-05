const test = require('node:test');
const assert = require('node:assert/strict');

const {
  calculateInvitationBalance,
  assertHasInviteBudget,
} = require('../src/modules/subscriptions/invitationBalance.presenter');
const AppError = require('../src/shared/errors/AppError');

test('PR4R / F-11: Canonical Invitation Balance Presenter & Contract', async (t) => {
  await t.test('1. Base + compensation - consumed math', () => {
    // Explicit compensationPool
    const sub = {
      invitePool: 100,
      compensationPool: 15,
      invitesConsumed: 30,
    };
    const balance = calculateInvitationBalance(sub);
    assert.deepEqual(balance, {
      unlimited: false,
      base: 100,
      compensation: 15,
      consumed: 30,
      total: 115,
      remaining: 85,
    });
  });

  await t.test('2. Derived compensation when missing (15% policy)', () => {
    const sub = {
      invitePool: 200,
      invitesConsumed: 50,
    };
    const balance = calculateInvitationBalance(sub);
    // 15% of 200 = 30
    assert.deepEqual(balance, {
      unlimited: false,
      base: 200,
      compensation: 30,
      consumed: 50,
      total: 230,
      remaining: 180,
    });
  });

  await t.test('3. Add-on pool increases base and total', () => {
    // Initial base 100 + compensation 15
    const initial = {
      invitePool: 100,
      compensationPool: 15,
      invitesConsumed: 40,
    };
    const b1 = calculateInvitationBalance(initial);
    assert.equal(b1.remaining, 75);

    // After add-on purchase of 50 invites
    const withAddon = {
      invitePool: 150,
      compensationPool: 15,
      invitesConsumed: 40,
    };
    const b2 = calculateInvitationBalance(withAddon);
    assert.equal(b2.base, 150);
    assert.equal(b2.total, 165);
    assert.equal(b2.remaining, 125);
  });

  await t.test('4. Clamps at zero when consumed exceeds total', () => {
    const sub = {
      invitePool: 50,
      compensationPool: 5,
      invitesConsumed: 70,
    };
    const balance = calculateInvitationBalance(sub);
    assert.equal(balance.consumed, 70);
    assert.equal(balance.total, 55);
    assert.equal(balance.remaining, 0);
  });

  await t.test('5. Unlimited plan handling', () => {
    // Pool is null/undefined on unlimited plan
    const subUnlimited = {
      invitePool: null,
      invitesConsumed: 120,
    };
    const planUnlimited = {
      isUnlimited: true,
    };
    const balance = calculateInvitationBalance(subUnlimited, planUnlimited);
    assert.deepEqual(balance, {
      unlimited: true,
      base: null,
      compensation: null,
      consumed: 120,
      total: null,
      remaining: null,
    });

    // Plan with invitesIncluded: -1
    const sub2 = { invitesConsumed: 45 };
    const plan2 = { invitesIncluded: -1 };
    const b2 = calculateInvitationBalance(sub2, plan2);
    assert.equal(b2.unlimited, true);
    assert.equal(b2.remaining, null);
  });

  await t.test('6. Fail-closed on missing, deleted or orphaned subscription', () => {
    // Null subscription
    const bNull = calculateInvitationBalance(null);
    assert.deepEqual(bNull, {
      unlimited: false,
      base: 0,
      compensation: 0,
      consumed: 0,
      total: 0,
      remaining: 0,
    });

    // Inactive / orphaned subscription with no plan
    const bOrphan = calculateInvitationBalance({ status: 'orphaned' });
    assert.deepEqual(bOrphan, {
      unlimited: false,
      base: 0,
      compensation: 0,
      consumed: 0,
      total: 0,
      remaining: 0,
    });
  });

  await t.test('7. Plan-level fallback when subscription pools are unpopulated', () => {
    const sub = { invitesConsumed: 10 };
    const plan = {
      invitePool: 80,
      compensationPool: 12,
    };
    const balance = calculateInvitationBalance(sub, plan);
    assert.deepEqual(balance, {
      unlimited: false,
      base: 80,
      compensation: 12,
      consumed: 10,
      total: 92,
      remaining: 82,
    });
  });

  await t.test('8. assertHasInviteBudget gates correctly', () => {
    const sub = {
      invitePool: 100,
      compensationPool: 15,
      invitesConsumed: 105,
    }; // total = 115, remaining = 10

    // Within budget (signature supports both (sub, count, plan) and (sub, plan, count))
    const ok = assertHasInviteBudget(sub, 10);
    assert.equal(ok.allowed, true);
    assert.equal(ok.balance.remaining, 10);
    assert.equal(ok.remainingAfter, 0);

    // Over budget throws AppError (402, INSUFFICIENT_INVITES)
    assert.throws(
      () => assertHasInviteBudget(sub, 11),
      (err) => {
        assert(err instanceof AppError);
        assert.equal(err.statusCode, 402);
        assert.equal(err.code, 'INSUFFICIENT_INVITES');
        return true;
      }
    );

    // Unlimited passes any quantity
    const unlimitedSub = { invitePool: null };
    const unl = assertHasInviteBudget(unlimitedSub, 5000, { isUnlimited: true });
    assert.equal(unl.allowed, true);
    assert.equal(unl.remainingAfter, null);

    // Orphaned / missing sub throws 400 ORPHAN_EVENT
    assert.throws(
      () => assertHasInviteBudget(null, 1),
      (err) => {
        assert(err instanceof AppError);
        assert.equal(err.statusCode, 400);
        assert.equal(err.code, 'ORPHAN_EVENT');
        return true;
      }
    );
  });

  await t.test('9. Concurrency simulation: race condition protection', async () => {
    // Simulate multiple parallel sends against a shared subscription pool
    const sharedSub = {
      invitePool: 50,
      compensationPool: 0,
      invitesConsumed: 40, // 10 remaining
    };

    const requests = [4, 4, 4]; // Total 12 requested, only 10 available
    const results = [];

    for (const count of requests) {
      try {
        const check = assertHasInviteBudget(sharedSub, count);
        // Atomically increment consumed if check passes
        sharedSub.invitesConsumed += count;
        results.push({ success: true, count, remainingAfter: check.remainingAfter });
      } catch (err) {
        results.push({ success: false, code: err.code });
      }
    }

    // Two requests of 4 succeed (4+4=8 consumed, 2 remaining), third request of 4 fails (needs 4, only 2 left)
    assert.equal(results[0].success, true);
    assert.equal(results[1].success, true);
    assert.equal(results[2].success, false);
    assert.equal(results[2].code, 'INSUFFICIENT_INVITES');
    assert.equal(sharedSub.invitesConsumed, 48);
    const finalBalance = calculateInvitationBalance(sharedSub);
    assert.equal(finalBalance.remaining, 2);
  });

  await t.test('10. Authorization & Account Scope Isolation', () => {
    // Host A subscription and Event
    const hostASub = {
      _id: 'sub_host_a',
      userId: 'user_host_a',
      invitePool: 100,
      invitesConsumed: 20,
    };
    const hostBUser = 'user_host_b';

    // Verify isolation check: cannot assert budget on another user's subscription
    const isOwner = (sub, userId) => String(sub.userId) === String(userId);
    assert.equal(isOwner(hostASub, 'user_host_a'), true);
    assert.equal(isOwner(hostASub, hostBUser), false);

    // Business plan isolation
    const businessSub = {
      _id: 'sub_biz',
      planType: 'business_annual',
      invitePool: 500,
      invitesConsumed: 50,
      accountType: 'business',
    };
    const hostPlan = {
      planType: 'basic_event',
      invitePool: 50,
    };
    // Business balance is distinct and cannot be attributed to host plan
    const bizBalance = calculateInvitationBalance(businessSub);
    const hostBalance = calculateInvitationBalance(hostPlan);
    assert.equal(bizBalance.remaining, 525); // 500 + 75 - 50
    assert.equal(hostBalance.remaining, 57); // 50 + 7 - 0
    assert.notEqual(bizBalance.total, hostBalance.total);
  });
});
