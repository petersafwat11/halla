#!/usr/bin/env node
/**
 * Phase 2 static contract checks.
 *
 * Same shape as the Phase 1b check runner. Run from repo root:
 *   node docs/implementation/phase-2-smoke-tests/static-checks.js
 *
 * Verifies the 14 Phase-2 findings are closed in code without booting
 * a backend or touching the network. Live Playwright specs are
 * outlined in `runbooks.md`; these static checks are the executable
 * gate for CI / the close-out review.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..", "..");
const checks = [];
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const check = (name, fn) => {
  try { fn(); checks.push({ name, ok: true }); }
  catch (e) { checks.push({ name, ok: false, error: e.message }); }
};
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };

// ============================================================
// Track A — Subscriptions
// ============================================================

// 3.1 trial guard
check("3.1 trial guard skips paymentProvider for free/trial plans", () => {
  const s = read("labbe-backend-/src/modules/subscriptions/subscriptions.service.js");
  expect(s.includes("isFreePlan"), "isFreePlan branch missing in subscribe()");
  expect(s.includes("planCode === 'trial'"), "trial-by-code check missing");
  expect(s.includes("pricing?.oneTime"), "free-plan check uses pricing.oneTime");
  expect(s.includes("if (!isFreePlan)"), "payment call must be inside !isFreePlan branch");
});

// 3.2 concurrent subscription
check("3.2 subscribe() auto-cancels existing active sub; findActiveForUser sorts newest-first", () => {
  const s = read("labbe-backend-/src/modules/subscriptions/subscriptions.service.js");
  expect(/Auto-cancelled on new subscribe/.test(s), "auto-cancel message missing in subscribe()");

  const m = read("labbe-backend-/models/SubscriptionModel.js");
  expect(/createdAt: -1/.test(m), "findActiveForUser must sort createdAt: -1");
});

// 3.3 expiry cron status transition
check("3.3 expiry cron uses expiresAt and emits subscription.expired audit", () => {
  const c = read("labbe-backend-/src/shared/utils/scheduledTasks.js");
  expect(c.includes("expiresAt: { $ne: null"), "scheduleSubscriptionStatusUpdate query must use expiresAt");
  expect(c.includes("subscription.expired"), "subscription.expired audit action missing");
  // BILLING_CYCLES must not be imported or referenced as code (comments OK).
  const codeOnly = c
    .split("\n")
    .filter((line) => !/^\s*\*/.test(line) && !/^\s*\/\//.test(line))
    .join("\n");
  expect(!/BILLING_CYCLES\b/.test(codeOnly), "BILLING_CYCLES.* still referenced in code (comments OK)");
  expect(!/endDate: \{/.test(c), "Reference to nonexistent endDate field remains");
});

// 3.4 14-day trial expiry
check("3.4 trial subscriptions get a 14-day expiresAt override", () => {
  const s = read("labbe-backend-/src/modules/subscriptions/subscriptions.service.js");
  expect(/TRIAL_DURATION_DAYS = 14/.test(s), "14-day constant missing");
  expect(/planCode === 'trial'[\s\S]{0,400}TRIAL_DURATION_DAYS/.test(s), "trial expiry override block missing in subscribe()");
});

// 3.5 admin-assign endpoint
check("3.5 admin-assign route: SUPER_ADMIN, idempotency, audit, controller wired", () => {
  const r = read("labbe-backend-/src/modules/subscriptions/subscriptions.routes.js");
  expect(r.includes("/admin/assign"), "admin-assign route missing");
  expect(r.includes("restrictTo(ROLES.SUPER_ADMIN)"), "SUPER_ADMIN restriction missing");
  expect(r.includes("subscriptions.admin_assign"), "idempotency scope missing");
  expect(r.includes("subscription.assigned_by_admin"), "audit action missing");

  const c = read("labbe-backend-/src/modules/subscriptions/subscriptions.controller.js");
  expect(c.includes("adminAssignSubscription"), "controller method missing");

  const s = read("labbe-backend-/src/modules/subscriptions/subscriptions.service.js");
  expect(s.includes("assignSubscription"), "service method missing");
});

// 3.6 idempotency on /subscribe and /change-plan
check("3.6 idempotency middleware on /subscribe and /change-plan", () => {
  const r = read("labbe-backend-/src/modules/subscriptions/subscriptions.routes.js");
  expect(/post\([\s\S]*\/subscribe[\s\S]{0,200}idempotency\(/.test(r), "/subscribe missing idempotency");
  expect(/post\([\s\S]*\/change-plan[\s\S]{0,200}idempotency\(/.test(r), "/change-plan missing idempotency");
});

// 3.7 paymentTransactionId in getSummary
check("3.7 Subscription.getSummary exposes paymentTransactionId", () => {
  const m = read("labbe-backend-/models/SubscriptionModel.js");
  expect(m.includes("paymentTransactionId: this.metadata?.paymentTransactionId"), "getSummary missing paymentTransactionId line");
});

// ============================================================
// Track B — Plans CRUD
// ============================================================

// 4.1 POST/DELETE
check("4.1 POST/DELETE plan endpoints with SUPER_ADMIN + audit", () => {
  const r = read("labbe-backend-/src/modules/plans/plans.routes.js");
  expect(/post\(\s*['"]\/admin['"]/.test(r), "POST /admin missing");
  expect(/delete\(\s*['"]\/admin\/:code['"]/.test(r), "DELETE /admin/:code missing");
  expect(r.includes("plan.created"), "plan.created audit action missing");
  expect(r.includes("plan.deactivated"), "plan.deactivated audit action missing");
  expect(r.includes("restrictTo(ROLES.SUPER_ADMIN)"), "SUPER_ADMIN restriction missing on plan admin routes");

  const s = read("labbe-backend-/src/modules/plans/plans.service.js");
  expect(s.includes("createPlan"), "createPlan service method missing");
  expect(s.includes("deletePlanByCode"), "deletePlanByCode service method missing");
  expect(/active subscriber/.test(s), "DELETE guard message missing");
});

// 4.2 update validation guard
check("4.2 plan update guard rejects destructive limit reductions", () => {
  const s = read("labbe-backend-/src/modules/plans/plans.service.js");
  expect(s.includes("_guardLimitReductions"), "_guardLimitReductions helper missing");
  expect(/Limit reduction blocked/.test(s), "blocking error message missing");
});

// 4.3 audit on update
check("4.3 plan.updated audit middleware reads res.locals.planAudit", () => {
  const r = read("labbe-backend-/src/modules/plans/plans.routes.js");
  expect(r.includes("plan.updated"), "plan.updated audit action missing");

  const c = read("labbe-backend-/src/modules/plans/plans.controller.js");
  expect(c.includes("res.locals.planAudit"), "controller does not stash planAudit on res.locals");

  const s = read("labbe-backend-/src/modules/plans/plans.service.js");
  expect(/return \{ plan: this\._formatPlan\(plan\), before, after \}/.test(s), "updatePlanByCode does not return before/after snapshots");
});

// ============================================================
// Track C — Addons
// ============================================================

// 5.1 activation pipeline
check("5.1 addon purchase activates, charges, and applies quota", () => {
  const s = read("labbe-backend-/src/modules/addons/addons.service.js");
  expect(s.includes("paymentProvider.charge"), "addons.service does not call paymentProvider.charge");
  expect(s.includes("activateAddonAsAdmin"), "admin-activate method missing");
  expect(s.includes("pending_provisioning"), "business-customization branch missing");
  expect(s.includes("addon.purchased"), "addon.purchased audit missing");

  const r = read("labbe-backend-/src/modules/addons/addons.routes.js");
  expect(/post\(\s*['"]\/admin\/:id\/activate['"]/.test(r), "admin/:id/activate route missing");
  expect(r.includes("addon.activated_by_admin"), "addon.activated_by_admin audit missing");

  const m = read("labbe-backend-/models/AddonModel.js");
  expect(m.includes("pending_provisioning"), "AddonModel status enum missing pending_provisioning");
});

// 5.2 scope branching
check("5.2 addon quota apply branches on scope", () => {
  const s = read("labbe-backend-/src/modules/addons/addons.service.js");
  expect(s.includes("_applyQuota"), "_applyQuota helper missing");
  expect(/scope === 'pool'/.test(s), "pool branch missing");
  expect(/scope === 'event'/.test(s), "event branch missing");
  expect(/scope === 'org'/.test(s), "org branch missing");
  expect(s.includes("guestLimit"), "event branch must update Event.guestLimit");
  expect(s.includes("invitePool"), "pool/org branch must update Subscription.invitePool");
});

// 5.3 idempotency
check("5.3 addons.purchase idempotency wired end-to-end", () => {
  const r = read("labbe-backend-/src/modules/addons/addons.routes.js");
  expect(r.includes("idempotency({ scope: 'addons.purchase' })"), "addons.purchase missing idempotency middleware");

  const c = read("labbe-backend-/src/modules/addons/addons.controller.js");
  expect(c.includes("idempotency-key"), "controller does not pass header through");

  const s = read("labbe-backend-/src/modules/addons/addons.service.js");
  expect(s.includes("idempotencyKey"), "service does not pass idempotencyKey to paymentProvider.charge");
});

// ============================================================
let failed = 0;
for (const c of checks) {
  if (c.ok) console.log(`PASS  ${c.name}`);
  else { failed++; console.error(`FAIL  ${c.name}\n      ${c.error}`); }
}
if (failed) {
  console.error(`\n${failed} of ${checks.length} checks failed.`);
  process.exit(1);
}
console.log(`\nAll ${checks.length} checks passed.`);
