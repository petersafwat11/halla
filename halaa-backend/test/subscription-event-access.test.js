const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { SUBSCRIPTION_STATUS } = require('../src/shared/constants');
const {
  isUsableForEvent,
  isReplacedSubscriptionForEvent,
} = require('../src/modules/subscriptions/subscriptionEventAccess.service');

const objectId = () => new mongoose.Types.ObjectId();

test('active subscriptions are usable for their stamped event', () => {
  const subId = objectId();
  const sub = {
    _id: subId,
    status: SUBSCRIPTION_STATUS.ACTIVE,
    expiresAt: new Date(Date.now() + 60_000),
  };
  const event = { subscriptionId: subId };

  assert.equal(isUsableForEvent(sub, event), true);
});

test('cancelled replacement subscriptions remain usable only by stamped events', () => {
  const oldSubId = objectId();
  const otherSubId = objectId();
  const replacementId = objectId();
  const sub = {
    _id: oldSubId,
    status: SUBSCRIPTION_STATUS.CANCELLED,
    expiresAt: new Date(Date.now() + 60_000),
    metadata: { replacedBySubscription: replacementId },
  };

  assert.equal(
    isReplacedSubscriptionForEvent(sub, { subscriptionId: oldSubId }),
    true
  );
  assert.equal(isUsableForEvent(sub, { subscriptionId: oldSubId }), true);
  assert.equal(isUsableForEvent(sub, { subscriptionId: otherSubId }), false);
});

test('expired replaced subscriptions are not usable for old events', () => {
  const oldSubId = objectId();
  const sub = {
    _id: oldSubId,
    status: SUBSCRIPTION_STATUS.CANCELLED,
    expiresAt: new Date(Date.now() - 60_000),
    metadata: { replacedBySubscription: objectId() },
  };

  assert.equal(isUsableForEvent(sub, { subscriptionId: oldSubId }), false);
});
