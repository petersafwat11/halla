/**
 * Event exact-reconcile fallback — `findNewestUnusedEventForCode` (§6/§7 · P0 lineage).
 *
 * Guards the safe fallback used by `reconcileExact` when the SDK's store txn id
 * does not equal the webhook's `transaction_id` (Android null Play orderId →
 * synthetic SDK id). The fallback resolves the caller's NEWEST UNUSED entitlement
 * for the EXACT `planCode`. Its correctness rests on the `event-preflight` guard:
 * a new event purchase is blocked while an unused entitlement already exists, so
 * at reconcile time the newest unused row for that code owned by the caller IS
 * the just-purchased one.
 *
 * Ephemeral replica set; no shared DB; no provider access.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const db = require("./helpers/memoryDb");
const mongoose = require("mongoose");

const lineage = require("../src/modules/payments/revenuecat.lineage");
const reconcileController = require("../src/modules/payments/revenuecat.reconcile.controller");
const EventEntitlement = require("../models/EventEntitlementModel");
const User = require("../models/UserModel");

// Real event_consumable catalog code (from storeCatalog.generated.json). The
// controller passes `catalogCode` straight through as the finder's `planCode`.
const EVENT_CODE = "basic_event_50";
const OTHER_EVENT_CODE = "basic_event_25";

// Seed one EventEntitlement ledger row. `source` is required by the schema, and
// `providerTransactionId` is unique+sparse so we leave it unset by default to
// avoid cross-seed collisions.
const seedEnt = (over = {}) =>
  EventEntitlement.create({
    userId: over.userId,
    planCode: over.planCode ?? EVENT_CODE,
    source: "revenuecat",
    status: over.status ?? "unused",
    resolution: over.resolution ?? "fulfilled",
    subscriptionId: over.subscriptionId ?? new mongoose.Types.ObjectId(),
    ...(over.createdAt ? { createdAt: over.createdAt } : {}),
    ...(over.providerTransactionId ? { providerTransactionId: over.providerTransactionId } : {}),
  });

let userId;
let otherUserId;

test.before(async () => {
  await db.start();
});
test.after(async () => {
  await db.stop();
});
test.beforeEach(async () => {
  await db.clearAll();
  const u = await User.create({ name: "Caller", email: "caller@x.com", phone: "+966500000001", password: "password123", role: "host", accountType: "personal", billingUserId: "caller-billing" });
  const o = await User.create({ name: "Other", email: "other@x.com", phone: "+966500000002", password: "password123", role: "host", accountType: "personal", billingUserId: "other-billing" });
  userId = u._id;
  otherUserId = o._id;
});

// ── 1. picks the NEWEST unused entitlement for the exact planCode ─────────────
test("returns the caller's NEWEST unused entitlement for the exact planCode", async () => {
  const older = await seedEnt({ userId, createdAt: new Date(Date.now() - 60000) });
  const newer = await seedEnt({ userId, createdAt: new Date(Date.now() - 1000) });
  // sanity: Mongoose honored the explicit, well-separated createdAt values.
  assert.ok((await EventEntitlement.findById(newer._id)).createdAt.getTime() > (await EventEntitlement.findById(older._id)).createdAt.getTime());

  const found = await lineage.findNewestUnusedEventForCode(userId, EVENT_CODE);
  assert.ok(found);
  assert.equal(String(found._id), String(newer._id));
});

// ── 2. caller-scoping: excludes a different user's entitlement ────────────────
test("excludes entitlements owned by a DIFFERENT user", async () => {
  // The only NEWER unused row belongs to another user; must be ignored.
  await seedEnt({ userId: otherUserId, createdAt: new Date(Date.now() - 500) });
  const mine = await seedEnt({ userId, createdAt: new Date(Date.now() - 5000) });

  const found = await lineage.findNewestUnusedEventForCode(userId, EVENT_CODE);
  assert.ok(found);
  assert.equal(String(found._id), String(mine._id));
  assert.equal(String(found.userId), String(userId));
});

// ── 3. excludes a different planCode ─────────────────────────────────────────
test("excludes a DIFFERENT planCode", async () => {
  await seedEnt({ userId, planCode: OTHER_EVENT_CODE, createdAt: new Date(Date.now() - 500) });
  const exact = await seedEnt({ userId, planCode: EVENT_CODE, createdAt: new Date(Date.now() - 5000) });

  const found = await lineage.findNewestUnusedEventForCode(userId, EVENT_CODE);
  assert.ok(found);
  assert.equal(String(found._id), String(exact._id));
  assert.equal(found.planCode, EVENT_CODE);

  // and the excluded code has nothing matching for THIS code lookup only.
  const none = await lineage.findNewestUnusedEventForCode(userId, "basic_event_999");
  assert.equal(none, null);
});

// ── 4. only status "unused" matches (consumed excluded) ───────────────────────
test('excludes status:"consumed" and status:"refunded" — only "unused" matches', async () => {
  await seedEnt({ userId, status: "consumed", createdAt: new Date(Date.now() - 500) });
  assert.equal(await lineage.findNewestUnusedEventForCode(userId, EVENT_CODE), null);

  // `refunded` is a valid *status* (the task's case-5 "resolution:refunded" is not
  // possible — see the resolution test below); excluded by the status:"unused" filter.
  await seedEnt({ userId, status: "refunded", createdAt: new Date(Date.now() - 400) });
  assert.equal(await lineage.findNewestUnusedEventForCode(userId, EVENT_CODE), null);

  const unused = await seedEnt({ userId, status: "unused", createdAt: new Date(Date.now() - 5000) });
  const found = await lineage.findNewestUnusedEventForCode(userId, EVENT_CODE);
  assert.ok(found);
  assert.equal(String(found._id), String(unused._id));
  assert.equal(found.status, "unused");
});

// ── 5. only resolution fulfilled/none match — the preflight-alignment property ─
// NOTE: `resolution` enum is [fulfilled, manual_review, credited, refund_required,
// none]; "refunded" is a STATUS, not a resolution, so it cannot be seeded here.
// The excluded resolutions we assert are `manual_review` and `refund_required`
// (both valid, both outside the finder's $in:["fulfilled","none"] filter). This
// is the invariant that keeps the fallback aligned with the preflight guard: a
// non-usable (review/refund) row must never be returned as the just-purchased one.
test('excludes resolution "manual_review" and "refund_required" — only fulfilled/none match', async () => {
  await seedEnt({ userId, status: "unused", resolution: "manual_review", createdAt: new Date(Date.now() - 500) });
  await seedEnt({ userId, status: "unused", resolution: "refund_required", createdAt: new Date(Date.now() - 400) });
  await seedEnt({ userId, status: "unused", resolution: "credited", createdAt: new Date(Date.now() - 300) });
  assert.equal(await lineage.findNewestUnusedEventForCode(userId, EVENT_CODE), null);

  // add a legitimately usable one (older) → it, and only it, is returned.
  const fulfilled = await seedEnt({ userId, status: "unused", resolution: "fulfilled", createdAt: new Date(Date.now() - 5000) });
  const found = await lineage.findNewestUnusedEventForCode(userId, EVENT_CODE);
  assert.ok(found);
  assert.equal(String(found._id), String(fulfilled._id));
  assert.ok(["fulfilled", "none"].includes(found.resolution));
});

test('accepts resolution "none" as usable', async () => {
  const noneRes = await seedEnt({ userId, status: "unused", resolution: "none" });
  const found = await lineage.findNewestUnusedEventForCode(userId, EVENT_CODE);
  assert.ok(found);
  assert.equal(String(found._id), String(noneRes._id));
});

// ── 6. missing/empty args → null (no query) ──────────────────────────────────
test("returns null when userId or planCode is missing/empty", async () => {
  // seed a row that WOULD match if the guard were skipped, to prove the guard.
  await seedEnt({ userId });
  assert.equal(await lineage.findNewestUnusedEventForCode(null, EVENT_CODE), null);
  assert.equal(await lineage.findNewestUnusedEventForCode(undefined, EVENT_CODE), null);
  assert.equal(await lineage.findNewestUnusedEventForCode(userId, null), null);
  assert.equal(await lineage.findNewestUnusedEventForCode(userId, undefined), null);
  assert.equal(await lineage.findNewestUnusedEventForCode(userId, ""), null);
  assert.equal(await lineage.findNewestUnusedEventForCode("", EVENT_CODE), null);
});

// ── 7. integration: reconcileExact resolves the event via this fallback ───────
// The exact-txn lookup misses (no stored entitlement for `transactionId`), but
// the caller holds a matching newest-unused entitlement → controller falls back
// to `findNewestUnusedEventForCode` and reports the exact item as fulfilled.
test("reconcileExact resolves an event consumable via the newest-unused fallback when txn id matches nothing", async () => {
  const ent = await seedEnt({ userId, status: "unused", resolution: "fulfilled" });

  const call = (req) =>
    new Promise((resolve, reject) => {
      const res = { statusCode: 0, payload: null };
      res.status = (c) => { res.statusCode = c; return res; };
      res.json = (b) => { res.payload = b; resolve(res); return res; };
      reconcileController.reconcileExact(req, res, (e) => (e ? reject(e) : resolve(res)));
    });

  const req = { user: { _id: userId }, body: { catalogCode: EVENT_CODE, transactionId: "sdk-synthetic-no-webhook-match" } };
  const res = await call(req);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.status, "success");
  // fallback located the just-purchased unused entitlement → fulfilled.
  assert.equal(res.payload.data.state, "fulfilled");
  assert.equal(res.payload.data.reason, "unused");
  assert.equal(res.payload.data.kind, "event_consumable");
  assert.equal(String(res.payload.data.ids.eventEntitlementId), String(ent._id));
});

test("reconcileExact does NOT cross accounts: a different user's unused entitlement is not used as fallback", async () => {
  // Only the OTHER user holds an unused entitlement for this code; the caller has none.
  await seedEnt({ userId: otherUserId, status: "unused", resolution: "fulfilled" });

  const call = (req) =>
    new Promise((resolve, reject) => {
      const res = { statusCode: 0, payload: null };
      res.status = (c) => { res.statusCode = c; return res; };
      res.json = (b) => { res.payload = b; resolve(res); return res; };
      reconcileController.reconcileExact(req, res, (e) => (e ? reject(e) : resolve(res)));
    });

  const req = { user: { _id: userId }, body: { catalogCode: EVENT_CODE, transactionId: "sdk-synthetic-no-webhook-match" } };
  const res = await call(req);

  assert.equal(res.statusCode, 200);
  // No owned entitlement and no webhook row → pending, never the other user's row.
  assert.equal(res.payload.data.state, "pending");
  assert.equal(res.payload.data.ids.eventEntitlementId, null);
});
