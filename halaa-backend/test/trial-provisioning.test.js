const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Subscription = require('../models/SubscriptionModel');
const { PLAN_DEFAULTS } = require('../src/shared/constants/planDefaults');

test('new trial copies five invitations and 90-day expiry without database writes', async () => {
  const plan = { ...PLAN_DEFAULTS.trial, _id: 'trial-plan' };
  assert.equal(plan.limits.maxEvents, 1);
  assert.equal(plan.limits.maxInvitesPerEvent, 5);
  const now = new Date('2026-09-06T00:00:00Z');
  const result = await Subscription.createForUser.call({ create: async data => data }, 'new-user', plan, { status: 'trial', activatedAt: now });
  assert.equal(result.planId, plan._id);
  assert.equal(result.invitePool, 5);
  assert.equal(result.expiresAt.getTime() - now.getTime(), 90 * 86400000);
  assert.equal(result.status, 'trial');
  assert.equal(result.invitesConsumed, 0);
});

test('all three signup paths pass the full trial plan, not its ID', () => {
  const source = fs.readFileSync(require.resolve('../src/modules/auth/auth.service'), 'utf8');
  assert.equal((source.match(/Subscription\.createForUser\((host|user)\._id, trialPlan,/g) || []).length, 3);
  assert.doesNotMatch(source, /createForUser\([^\n]+trialPlan\._id/);
});
