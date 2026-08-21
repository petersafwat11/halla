/**
 * Backend / @halaa/shared contract parity tests (Session 0.2)
 *
 * Ensures status constants and core contract definitions between halaa-backend
 * and @halaa/shared stay strictly in sync with zero drift.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const backendStatus = require("../src/shared/constants/status");

test("Status Constants Parity: Backend and @halaa/shared definitions match", async () => {
  // Dynamically import ES module @halaa/shared
  const shared = await import("@halaa/shared/constants");

  // 1. USER_STATUS parity
  assert.deepEqual(
    Object.keys(backendStatus.USER_STATUS).sort(),
    Object.keys(shared.USER_STATUS).sort(),
    "USER_STATUS keys must match"
  );
  assert.deepEqual(
    Object.values(backendStatus.USER_STATUS).sort(),
    Object.values(shared.USER_STATUS).sort(),
    "USER_STATUS values must match"
  );

  // 2. EVENT_STATUS parity
  assert.deepEqual(
    Object.keys(backendStatus.EVENT_STATUS).sort(),
    Object.keys(shared.EVENT_STATUS).sort(),
    "EVENT_STATUS keys must match"
  );
  assert.deepEqual(
    Object.values(backendStatus.EVENT_STATUS).sort(),
    Object.values(shared.EVENT_STATUS).sort(),
    "EVENT_STATUS values must match"
  );

  // 3. SUBSCRIPTION_STATUS parity
  assert.deepEqual(
    Object.keys(backendStatus.SUBSCRIPTION_STATUS).sort(),
    Object.keys(shared.SUBSCRIPTION_STATUS).sort(),
    "SUBSCRIPTION_STATUS keys must match"
  );
  assert.deepEqual(
    Object.values(backendStatus.SUBSCRIPTION_STATUS).sort(),
    Object.values(shared.SUBSCRIPTION_STATUS).sort(),
    "SUBSCRIPTION_STATUS values must match"
  );

  // 4. TICKET_STATUS parity
  assert.deepEqual(
    Object.keys(backendStatus.TICKET_STATUS).sort(),
    Object.keys(shared.TICKET_STATUS).sort(),
    "TICKET_STATUS keys must match"
  );
  assert.deepEqual(
    Object.values(backendStatus.TICKET_STATUS).sort(),
    Object.values(shared.TICKET_STATUS).sort(),
    "TICKET_STATUS values must match"
  );

  // 5. TICKET_PRIORITY parity
  assert.deepEqual(
    Object.keys(backendStatus.TICKET_PRIORITY).sort(),
    Object.keys(shared.TICKET_PRIORITY).sort(),
    "TICKET_PRIORITY keys must match"
  );
  assert.deepEqual(
    Object.values(backendStatus.TICKET_PRIORITY).sort(),
    Object.values(shared.TICKET_PRIORITY).sort(),
    "TICKET_PRIORITY values must match"
  );

  // 6. RSVP_STATUS parity
  assert.deepEqual(
    Object.keys(backendStatus.RSVP_STATUS).sort(),
    Object.keys(shared.RSVP_STATUS).sort(),
    "RSVP_STATUS keys must match"
  );
  assert.deepEqual(
    Object.values(backendStatus.RSVP_STATUS).sort(),
    Object.values(shared.RSVP_STATUS).sort(),
    "RSVP_STATUS values must match"
  );

  // 7. GUEST_STATUS parity
  assert.deepEqual(
    Object.keys(backendStatus.GUEST_STATUS).sort(),
    Object.keys(shared.GUEST_STATUS).sort(),
    "GUEST_STATUS keys must match"
  );
  assert.deepEqual(
    Object.values(backendStatus.GUEST_STATUS).sort(),
    Object.values(shared.GUEST_STATUS).sort(),
    "GUEST_STATUS values must match"
  );

  // 8. INVITATION_TYPE parity
  assert.deepEqual(
    Object.keys(backendStatus.INVITATION_TYPE).sort(),
    Object.keys(shared.INVITATION_TYPE).sort(),
    "INVITATION_TYPE keys must match"
  );
  assert.deepEqual(
    Object.values(backendStatus.INVITATION_TYPE).sort(),
    Object.values(shared.INVITATION_TYPE).sort(),
    "INVITATION_TYPE values must match"
  );

  // 9. TICKET_TRANSITIONS parity
  assert.deepEqual(
    Object.keys(backendStatus.TICKET_TRANSITIONS).sort(),
    Object.keys(shared.TICKET_TRANSITIONS).sort(),
    "TICKET_TRANSITIONS keys must match"
  );
  for (const status of Object.keys(backendStatus.TICKET_TRANSITIONS)) {
    assert.deepEqual(
      [...(backendStatus.TICKET_TRANSITIONS[status] || [])].sort(),
      [...(shared.TICKET_TRANSITIONS[status] || [])].sort(),
      `TICKET_TRANSITIONS for ${status} must match`
    );
  }
});

test("RSVP Buckets cover all backend guest lifecycle statuses", async () => {
  const shared = await import("@halaa/shared/constants");
  const { RSVP_BUCKETS, classifyRsvpBucket } = shared;

  for (const status of Object.values(backendStatus.GUEST_STATUS)) {
    const bucket = classifyRsvpBucket(status);
    assert.ok(
      ["pending", "confirmed", "declined", "attended", "no_show"].includes(bucket),
      `Guest status '${status}' must classify into a valid RSVP bucket`
    );
  }

  for (const status of Object.values(backendStatus.RSVP_STATUS)) {
    const bucket = classifyRsvpBucket(status);
    assert.ok(
      ["pending", "confirmed", "declined"].includes(bucket),
      `RSVP status '${status}' must classify into a valid RSVP bucket`
    );
  }
});

test("Plan Constants and Semantics Parity: Backend and @halaa/shared match (PLN-03, PLN-05)", async () => {
  const backendPlans = require("../src/shared/constants/plans");
  const shared = await import("@halaa/shared/constants");

  // 1. PLAN_TYPES parity
  assert.deepEqual(
    Object.keys(backendPlans.PLAN_TYPES).sort(),
    Object.keys(shared.PLAN_TYPES).sort(),
    "PLAN_TYPES keys must match"
  );
  assert.deepEqual(
    Object.values(backendPlans.PLAN_TYPES).sort(),
    Object.values(shared.PLAN_TYPES).sort(),
    "PLAN_TYPES values must match"
  );

  // 2. PLAN_FAMILIES parity
  assert.deepEqual(
    Object.keys(backendPlans.PLAN_FAMILIES).sort(),
    Object.keys(shared.PLAN_FAMILIES).sort(),
    "PLAN_FAMILIES keys must match"
  );
  assert.deepEqual(
    Object.values(backendPlans.PLAN_FAMILIES).sort(),
    Object.values(shared.PLAN_FAMILIES).sort(),
    "PLAN_FAMILIES values must match"
  );

  // 3. BILLING_TYPES parity
  assert.deepEqual(
    Object.keys(backendPlans.BILLING_TYPES).sort(),
    Object.keys(shared.BILLING_TYPES).sort(),
    "BILLING_TYPES keys must match"
  );
  assert.deepEqual(
    Object.values(backendPlans.BILLING_TYPES).sort(),
    Object.values(shared.BILLING_TYPES).sort(),
    "BILLING_TYPES values must match"
  );

  // 4. COMPENSATION_PERCENTAGE parity
  assert.equal(
    backendPlans.COMPENSATION_PERCENTAGE,
    shared.COMPENSATION_PERCENTAGE,
    "COMPENSATION_PERCENTAGE must be 15 across backend and shared"
  );

  // 5. Matrix helper results parity across all plan types
  for (const planType of Object.values(backendPlans.PLAN_TYPES)) {
    assert.equal(
      backendPlans.isPerEventPlan(planType),
      shared.isPerEventPlan(planType),
      `isPerEventPlan('${planType}') must match between backend and shared`
    );
    assert.equal(
      backendPlans.isPoolPlan(planType),
      shared.isPoolPlan(planType),
      `isPoolPlan('${planType}') must match between backend and shared`
    );
    assert.equal(
      backendPlans.isTrialPlan(planType),
      shared.isTrialPlan(planType),
      `isTrialPlan('${planType}') must match between backend and shared`
    );
    assert.equal(
      backendPlans.isManagedPlan(planType),
      shared.isManagedPlan(planType),
      `isManagedPlan('${planType}') must match between backend and shared`
    );
    assert.equal(
      backendPlans.getPlanFamily(planType),
      shared.getPlanFamily(planType),
      `getPlanFamily('${planType}') must match between backend and shared`
    );
    assert.equal(
      backendPlans.getBillingType(planType),
      shared.getBillingType(planType),
      `getBillingType('${planType}') must match between backend and shared`
    );
    assert.equal(
      backendPlans.isRecurringPlan(planType),
      shared.isRecurringPlan(planType),
      `isRecurringPlan('${planType}') must match between backend and shared`
    );
    assert.equal(
      backendPlans.getBillingPeriodKey(planType),
      shared.getBillingPeriodKey(planType),
      `getBillingPeriodKey('${planType}') must match between backend and shared`
    );
  }
});
