import test from "node:test";
import assert from "node:assert/strict";

import {
  ADDON_TYPES,
  DESIGN_FULFILLMENT_STATUS,
  DESIGN_FULFILLMENT_SEQUENCE,
  DESIGN_FULFILLMENT_TRANSITIONS,
  isValidDesignFulfillmentTransition,
  getNextFulfillmentStatus,
  deriveExpectedDeliveryDate,
} from "../src/constants/addons.js";

import {
  adminFulfillmentTransitionSchema,
  adminFulfillmentListQuerySchema,
} from "../src/schemas/addons.js";

import { API_PATHS } from "../src/api/paths.js";

test("PR6 / F-12 Design Fulfillment Constants & Sequence", () => {
  assert.equal(ADDON_TYPES.DESIGN_TEMPLATE, "design_template");
  assert.deepEqual(DESIGN_FULFILLMENT_SEQUENCE, [
    DESIGN_FULFILLMENT_STATUS.PAID,
    DESIGN_FULFILLMENT_STATUS.QUEUED,
    DESIGN_FULFILLMENT_STATUS.IN_PROGRESS,
    DESIGN_FULFILLMENT_STATUS.FULFILLED,
  ]);
});

test("PR6 / F-12 Allowed Transitions: paid -> queued -> in_progress -> fulfilled", () => {
  // Step by step progression
  assert.ok(isValidDesignFulfillmentTransition(DESIGN_FULFILLMENT_STATUS.PAID, DESIGN_FULFILLMENT_STATUS.QUEUED));
  assert.ok(isValidDesignFulfillmentTransition(DESIGN_FULFILLMENT_STATUS.QUEUED, DESIGN_FULFILLMENT_STATUS.IN_PROGRESS));
  assert.ok(isValidDesignFulfillmentTransition(DESIGN_FULFILLMENT_STATUS.IN_PROGRESS, DESIGN_FULFILLMENT_STATUS.FULFILLED));

  // Same-state idempotency
  assert.ok(isValidDesignFulfillmentTransition(DESIGN_FULFILLMENT_STATUS.PAID, DESIGN_FULFILLMENT_STATUS.PAID));
  assert.ok(isValidDesignFulfillmentTransition(DESIGN_FULFILLMENT_STATUS.QUEUED, DESIGN_FULFILLMENT_STATUS.QUEUED));
  assert.ok(isValidDesignFulfillmentTransition(DESIGN_FULFILLMENT_STATUS.IN_PROGRESS, DESIGN_FULFILLMENT_STATUS.IN_PROGRESS));
  assert.ok(isValidDesignFulfillmentTransition(DESIGN_FULFILLMENT_STATUS.FULFILLED, DESIGN_FULFILLMENT_STATUS.FULFILLED));

  // Skipped transitions return false
  assert.equal(isValidDesignFulfillmentTransition(DESIGN_FULFILLMENT_STATUS.PAID, DESIGN_FULFILLMENT_STATUS.IN_PROGRESS), false);
  assert.equal(isValidDesignFulfillmentTransition(DESIGN_FULFILLMENT_STATUS.PAID, DESIGN_FULFILLMENT_STATUS.FULFILLED), false);
  assert.equal(isValidDesignFulfillmentTransition(DESIGN_FULFILLMENT_STATUS.QUEUED, DESIGN_FULFILLMENT_STATUS.FULFILLED), false);

  // Reversed transitions return false
  assert.equal(isValidDesignFulfillmentTransition(DESIGN_FULFILLMENT_STATUS.FULFILLED, DESIGN_FULFILLMENT_STATUS.IN_PROGRESS), false);
  assert.equal(isValidDesignFulfillmentTransition(DESIGN_FULFILLMENT_STATUS.IN_PROGRESS, DESIGN_FULFILLMENT_STATUS.QUEUED), false);
  assert.equal(isValidDesignFulfillmentTransition(DESIGN_FULFILLMENT_STATUS.QUEUED, DESIGN_FULFILLMENT_STATUS.PAID), false);

  // Terminal fulfilled has no next transitions
  assert.deepEqual(DESIGN_FULFILLMENT_TRANSITIONS[DESIGN_FULFILLMENT_STATUS.FULFILLED], []);
  assert.equal(getNextFulfillmentStatus(DESIGN_FULFILLMENT_STATUS.FULFILLED), null);

  // Invalid / non-fulfillment status return false
  assert.equal(isValidDesignFulfillmentTransition("cancelled", DESIGN_FULFILLMENT_STATUS.QUEUED), false);
  assert.equal(isValidDesignFulfillmentTransition("refunded", DESIGN_FULFILLMENT_STATUS.QUEUED), false);
  assert.equal(isValidDesignFulfillmentTransition(null, DESIGN_FULFILLMENT_STATUS.QUEUED), false);
  assert.equal(isValidDesignFulfillmentTransition(DESIGN_FULFILLMENT_STATUS.PAID, null), false);
});

test("PR6 / F-12 getNextFulfillmentStatus returns only the valid next state", () => {
  assert.equal(getNextFulfillmentStatus(DESIGN_FULFILLMENT_STATUS.PAID), DESIGN_FULFILLMENT_STATUS.QUEUED);
  assert.equal(getNextFulfillmentStatus(DESIGN_FULFILLMENT_STATUS.QUEUED), DESIGN_FULFILLMENT_STATUS.IN_PROGRESS);
  assert.equal(getNextFulfillmentStatus(DESIGN_FULFILLMENT_STATUS.IN_PROGRESS), DESIGN_FULFILLMENT_STATUS.FULFILLED);
  assert.equal(getNextFulfillmentStatus(DESIGN_FULFILLMENT_STATUS.FULFILLED), null);
  assert.equal(getNextFulfillmentStatus("unknown"), null);
});

test("PR6 / F-12 SLA Derivation for Design Templates", () => {
  const base = new Date("2026-09-01T12:00:00.000Z");

  // ready_made: 48 hours
  const readyMadeDate = deriveExpectedDeliveryDate("ready_made", base);
  assert.equal(readyMadeDate.toISOString(), "2026-09-03T12:00:00.000Z");

  // 3d: 120 hours (5 days)
  const threeDDate = deriveExpectedDeliveryDate("3d", base);
  assert.equal(threeDDate.toISOString(), "2026-09-06T12:00:00.000Z");

  // default: 72 hours (3 days)
  const defaultDate = deriveExpectedDeliveryDate("unknown_tier", base);
  assert.equal(defaultDate.toISOString(), "2026-09-04T12:00:00.000Z");
});

test("PR6 / F-12 Zod Schemas Validation", () => {
  // Valid transition payload
  const validTransition = adminFulfillmentTransitionSchema.safeParse({
    toStatus: DESIGN_FULFILLMENT_STATUS.QUEUED,
    customerNote: "We are reviewing your design requirements.",
    internalNotes: "Assigned to team lead.",
    expectedDeliveryAt: "2026-09-05T18:00:00.000Z",
  });
  assert.ok(validTransition.success);

  // Rejects invalid toStatus (e.g. paid is not a valid target transition for admin)
  const invalidTransition = adminFulfillmentTransitionSchema.safeParse({
    toStatus: "paid",
  });
  assert.equal(invalidTransition.success, false);

  // Rejects note over 2000 chars
  const tooLongNote = adminFulfillmentTransitionSchema.safeParse({
    toStatus: DESIGN_FULFILLMENT_STATUS.QUEUED,
    customerNote: "a".repeat(2001),
  });
  assert.equal(tooLongNote.success, false);

  // Valid query params
  const validQuery = adminFulfillmentListQuerySchema.safeParse({
    status: "paid",
    page: "2",
    limit: "15",
  });
  assert.ok(validQuery.success);
  assert.equal(validQuery.data.page, 2);
  assert.equal(validQuery.data.limit, 15);
  assert.equal(validQuery.data.status, "paid");
});

test("PR6 / F-12 API Paths include fulfillment routes", () => {
  assert.equal(API_PATHS.addons.adminFulfillment, "/addons/admin/fulfillment");
  assert.equal(typeof API_PATHS.addons.adminTransition, "function");
  assert.equal(API_PATHS.addons.adminTransition("addon123"), "/addons/admin/addon123/fulfillment-transition");
});
