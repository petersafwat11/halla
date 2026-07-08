/**
 * UGC enforcement proof (UGC-02/UGC-03 · REVIEW-FINDINGS P1-04).
 *
 * Proves the moderation enforcement PRIMITIVES that gate every UGC write and
 * filter every UGC read, against an ephemeral replica set:
 *   - assertUgcTermsAccepted: fail-closed 403 when the actor hasn't accepted the
 *     current Terms+Community Rules (flag ON); passes after acceptPolicies.
 *   - requireUserUgcTerms middleware: 403s an unaccepted user write.
 *   - getBlockedKeySet: returns the viewer's blocked actor keys for read filters.
 *   - suspension: a suspended vendor is excluded from the public vendor read.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const db = require("./helpers/memoryDb");

const moderationService = require("../src/modules/moderation/moderation.service");
const { requireUserUgcTerms } = require("../src/modules/moderation/requireUgcTerms");
const vendorsService = require("../src/modules/vendors/vendors.service");
const User = require("../models/UserModel");
const TermsAcceptance = require("../models/TermsAcceptanceModel");
const { POLICY_VERSIONS } = require("../src/shared/constants/policies");
const { USER_STATUS } = require("../src/shared/constants/status");

test.before(async () => { await db.start(); });
test.after(async () => { await db.stop(); });
test.beforeEach(async () => {
  await db.clearAll();
  delete process.env.UGC_TERMS_ENFORCED;
});

test("assertUgcTermsAccepted: 403 when required + not accepted; passes after accept", async () => {
  process.env.UGC_TERMS_ENFORCED = "true";
  const u = await User.create({ name: "U", email: "u1@e.com", password: "password123", role: "host", accountType: "personal" });

  await assert.rejects(
    () => moderationService.assertUgcTermsAccepted("user", u._id),
    (err) => err.code === "UGC_TERMS_REQUIRED" && err.statusCode === 403
  );

  await moderationService.acceptPolicies("user", u._id, { locale: "en" });
  // Now passes (no throw).
  await moderationService.assertUgcTermsAccepted("user", u._id);
});

test("enforcement flag OFF (default): acceptance recorded but write not blocked", async () => {
  const u = await User.create({ name: "U", email: "u2@e.com", password: "password123", role: "host", accountType: "personal" });
  // Flag unset → no throw even though nothing accepted (deploy-sequencing safety).
  await moderationService.assertUgcTermsAccepted("user", u._id);
});

test("requireUserUgcTerms middleware 403s an unaccepted user (flag ON)", async () => {
  process.env.UGC_TERMS_ENFORCED = "true";
  const u = await User.create({ name: "U", email: "u3@e.com", password: "password123", role: "host", accountType: "personal" });
  const req = { user: { _id: u._id } };
  let nextErr = "pending";
  await new Promise((resolve) => {
    requireUserUgcTerms(req, {}, (err) => { nextErr = err; resolve(); });
  });
  assert.ok(nextErr && nextErr.code === "UGC_TERMS_REQUIRED", "middleware must pass a 403 to next()");
});

test("acceptPolicies persists TermsAcceptance rows for the current versions", async () => {
  const u = await User.create({ name: "U", email: "u4@e.com", password: "password123", role: "host", accountType: "personal" });
  await moderationService.acceptPolicies("user", u._id, { locale: "ar", ip: "9.9.9.9" });
  const rows = await TermsAcceptance.find({ actorType: "user", actorId: u._id }).lean();
  const byType = Object.fromEntries(rows.map((r) => [r.documentType, r.version]));
  assert.equal(byType.terms, POLICY_VERSIONS.terms);
  assert.equal(byType.community, POLICY_VERSIONS.community);
});

test("getBlockedKeySet returns the viewer's blocked actor keys for read filtering", async () => {
  const viewer = await User.create({ name: "V", email: "v@e.com", password: "password123", role: "host", accountType: "personal" });
  const bad = await User.create({ name: "B", email: "b@e.com", password: "password123", role: "vendor" });
  await moderationService.block("user", viewer._id, {
    blockedActorType: "user",
    blockedActorId: bad._id,
  });
  const set = await moderationService.getBlockedKeySet("user", viewer._id);
  assert.ok(set.has(`user:${bad._id}`), "blocked actor key present for read-path filtering");
  // Anonymous viewer → empty set (nothing filtered).
  const anon = await moderationService.getBlockedKeySet(null, null);
  assert.equal(anon.size, 0);
});

test("suspension: a suspended vendor is excluded from the public vendor read", async () => {
  const approved = {
    role: "vendor",
    status: USER_STATUS.ACTIVE,
    profile: { vendorData: { brandName: "Good Studio", vendorStatus: "approved", profileCompleted: true, serviceCategories: { media: ["photography"] } } },
  };
  const ok = await User.create({ name: "Good", email: "good@e.com", password: "password123", ...approved });
  const susp = await User.create({
    name: "Bad", email: "bad@e.com", password: "password123",
    role: "vendor", status: USER_STATUS.SUSPENDED,
    profile: { vendorData: { brandName: "Bad Studio", vendorStatus: "approved", profileCompleted: true, serviceCategories: { media: ["photography"] } } },
  });

  const res = await vendorsService.getPublicVendors({}, {});
  const ids = (res.data || []).map((v) => String(v._id || v.id));
  assert.ok(ids.includes(String(ok._id)), "active approved vendor is listed");
  assert.ok(!ids.includes(String(susp._id)), "suspended vendor is NOT listed (moderation suspend removes from public read)");

  // Direct profile read also 404s a suspended vendor.
  await assert.rejects(() => vendorsService.getPublicVendorById(String(susp._id), {}));
});
