import test from "node:test";
import assert from "node:assert/strict";
import {
  QUEUE_STATUS,
  ITEM_STATUS,
  createPurchaseQueue,
  transitionQueueItem,
  sanitizeQueueForStorage,
  normalizePersistedPurchaseQueue,
} from "../src/schemas/purchaseQueue.js";

test("createPurchaseQueue: creates a valid account-bound queue with pending items", () => {
  const queue = createPurchaseQueue({
    billingUserId: "b_user_123",
    origin: { kind: "plans" },
    items: [
      {
        catalogCode: "host_pro_monthly",
        kind: "plan",
        nameEn: "Pro Monthly",
        priceString: "149.99 SAR",
      },
      {
        catalogCode: "extra_invites_50",
        kind: "addon",
        nameEn: "50 Extra Invites",
        priceString: "49.99 SAR",
      },
    ],
  });

  assert.equal(queue.version, 1);
  assert.equal(queue.billingUserId, "b_user_123");
  assert.equal(queue.status, QUEUE_STATUS.IN_PROGRESS);
  assert.equal(queue.currentIndex, 0);
  assert.equal(queue.items.length, 2);
  assert.equal(queue.items[0].status, ITEM_STATUS.PENDING);
  assert.equal(queue.items[1].status, ITEM_STATUS.PENDING);
});

test("createPurchaseQueue: infers add-on kind from its operation", () => {
  const queue = createPurchaseQueue({
    billingUserId: "b_user_123",
    origin: "event_gate",
    items: [{ catalogCode: "extra_invites_50", operation: "addon" }],
  });
  assert.equal(queue.items[0].kind, "addon");
  assert.equal(queue.origin.kind, "event_gate");
});

test("normalizePersistedPurchaseQueue: never re-purchases an interrupted store sheet", () => {
  let queue = createPurchaseQueue({
    billingUserId: "b_user_123",
    items: [{ catalogCode: "plan_1", kind: "plan" }],
  });
  queue = transitionQueueItem(queue, 0, ITEM_STATUS.PURCHASING);
  const resumed = normalizePersistedPurchaseQueue(queue);
  assert.equal(resumed.status, QUEUE_STATUS.MANUAL_REVIEW);
  assert.equal(resumed.items[0].status, ITEM_STATUS.MANUAL_REVIEW);
  assert.equal(resumed.items[0].error, "purchase_interrupted");
});

test("createPurchaseQueue: rejects missing billingUserId or empty items", () => {
  assert.throws(() => {
    createPurchaseQueue({ billingUserId: "", items: [{ catalogCode: "x", kind: "plan" }] });
  }, /billingUserId is required/);

  assert.throws(() => {
    createPurchaseQueue({ billingUserId: "u1", items: [] });
  }, /must contain at least one item/);
});

test("transitionQueueItem: executes valid item transitions", () => {
  let q = createPurchaseQueue({
    billingUserId: "b_user_123",
    items: [
      { catalogCode: "plan_1", kind: "plan" },
      { catalogCode: "addon_1", kind: "addon" },
    ],
  });

  // 1. pending -> purchasing
  q = transitionQueueItem(q, 0, ITEM_STATUS.PURCHASING);
  assert.equal(q.items[0].status, ITEM_STATUS.PURCHASING);
  assert.equal(q.status, QUEUE_STATUS.IN_PROGRESS);

  // 2. purchasing -> reconciling
  q = transitionQueueItem(q, 0, ITEM_STATUS.RECONCILING, {
    transactionId: "txn_001",
    storeProductId: "com.halaa.plan_1",
  });
  assert.equal(q.items[0].status, ITEM_STATUS.RECONCILING);
  assert.equal(q.items[0].transactionId, "txn_001");

  // 3. reconciling -> fulfilled advances currentIndex to 1
  q = transitionQueueItem(q, 0, ITEM_STATUS.FULFILLED);
  assert.equal(q.items[0].status, ITEM_STATUS.FULFILLED);
  assert.equal(q.currentIndex, 1);
  assert.equal(q.status, QUEUE_STATUS.IN_PROGRESS);

  // 4. item 1: pending -> purchasing -> reconciling -> fulfilled
  q = transitionQueueItem(q, 1, ITEM_STATUS.PURCHASING);
  q = transitionQueueItem(q, 1, ITEM_STATUS.RECONCILING, { transactionId: "txn_002" });
  q = transitionQueueItem(q, 1, ITEM_STATUS.FULFILLED);
  assert.equal(q.items[1].status, ITEM_STATUS.FULFILLED);
  // Queue completes when all items are fulfilled
  assert.equal(q.status, QUEUE_STATUS.COMPLETED);
});

test("transitionQueueItem: enforces single active item invariant", () => {
  let q = createPurchaseQueue({
    billingUserId: "b_user_123",
    items: [
      { catalogCode: "plan_1", kind: "plan" },
      { catalogCode: "addon_1", kind: "addon" },
    ],
  });

  q = transitionQueueItem(q, 0, ITEM_STATUS.PURCHASING);

  // Attempting to make item 1 active while item 0 is purchasing must throw
  assert.throws(() => {
    transitionQueueItem(q, 1, ITEM_STATUS.PURCHASING);
  }, /Invariant violated: only one queue item may be active/);

  // Moving item 0 to reconciling still keeps it active
  q = transitionQueueItem(q, 0, ITEM_STATUS.RECONCILING);
  assert.throws(() => {
    transitionQueueItem(q, 1, ITEM_STATUS.PURCHASING);
  }, /Invariant violated: only one queue item may be active/);
});

test("transitionQueueItem: rejects invalid state skips or regressions", () => {
  let q = createPurchaseQueue({
    billingUserId: "b_user_123",
    items: [{ catalogCode: "plan_1", kind: "plan" }],
  });

  // Cannot jump directly from pending to fulfilled without purchasing/reconciling
  assert.throws(() => {
    transitionQueueItem(q, 0, ITEM_STATUS.FULFILLED);
  }, /Cannot transition queue item from 'pending' to 'fulfilled'/);

  q = transitionQueueItem(q, 0, ITEM_STATUS.PURCHASING);
  q = transitionQueueItem(q, 0, ITEM_STATUS.RECONCILING);
  q = transitionQueueItem(q, 0, ITEM_STATUS.FULFILLED);

  // Fulfilled is terminal; cannot transition out
  assert.throws(() => {
    transitionQueueItem(q, 0, ITEM_STATUS.PENDING);
  }, /Cannot transition queue item from 'fulfilled' to 'pending'/);
});

test("transitionQueueItem: cancellation halts the queue", () => {
  let q = createPurchaseQueue({
    billingUserId: "b_user_123",
    items: [
      { catalogCode: "plan_1", kind: "plan" },
      { catalogCode: "addon_1", kind: "addon" },
    ],
  });

  q = transitionQueueItem(q, 0, ITEM_STATUS.CANCELLED);
  assert.equal(q.items[0].status, ITEM_STATUS.CANCELLED);
  assert.equal(q.status, QUEUE_STATUS.CANCELLED);
});

test("transitionQueueItem: a deferred plan change completes as scheduled without claiming activation", () => {
  let q = createPurchaseQueue({
    billingUserId: "b_user_123",
    items: [{ catalogCode: "plan_annual", kind: "plan", operation: "change" }],
  });
  q = transitionQueueItem(q, 0, ITEM_STATUS.PURCHASING);
  q = transitionQueueItem(q, 0, ITEM_STATUS.SCHEDULED, {
    transactionId: "txn_scheduled",
    storeProductId: "com.halaa.plan_annual",
    reconcile: { state: "scheduled", reason: "deferred_change" },
  });
  assert.equal(q.items[0].status, ITEM_STATUS.SCHEDULED);
  assert.equal(q.status, QUEUE_STATUS.COMPLETED);
});

test("sanitizeQueueForStorage: excludes receipts, tokens, and sensitive PII", () => {
  let q = createPurchaseQueue({
    billingUserId: "b_user_123",
    items: [{ catalogCode: "plan_1", kind: "plan" }],
  });

  // Attach accidental malicious/leaked fields to object
  q.items[0].receipt = "secret_receipt_data";
  q.items[0].token = "jwt_access_token";
  q.items[0].email = "user@test.com";

  const sanitized = sanitizeQueueForStorage(q);
  assert.equal(sanitized.items[0].receipt, undefined);
  assert.equal(sanitized.items[0].token, undefined);
  assert.equal(sanitized.items[0].email, undefined);
  assert.equal(sanitized.billingUserId, "b_user_123");
});
