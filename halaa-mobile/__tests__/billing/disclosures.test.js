/**
 * Purchase disclosures + restore eligibility (§7 / §9).
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");

const { disclosuresFor, isRestorable, showsManageSubscription } = require("../../services/billing/disclosures");

const sub = { kind: "subscription", catalogType: "plan", restoreBehavior: "store_restore", refundPolicy: "standard_store" };
const event = { kind: "event_consumable", catalogType: "plan", restoreBehavior: "backend_ledger", refundPolicy: "unused_only" };
const design = { kind: "addon_consumable", catalogType: "addon", family: "design_template", restoreBehavior: "none", refundPolicy: "non_refundable_from_creation" };
const biz = { kind: "addon_consumable", catalogType: "addon", family: "business_customization", restoreBehavior: "none", refundPolicy: "managed_service_legal_review" };
const invites = { kind: "addon_consumable", catalogType: "addon", family: "extra_invites", restoreBehavior: "backend_ledger", refundPolicy: "clawback_unused" };

test("subscription: auto-renew + manage disclosures; restorable; shows manage", () => {
  const d = disclosuresFor(sub);
  assert.ok(d.includes("disclosures.autoRenew"));
  assert.ok(d.includes("disclosures.manageSubscription"));
  assert.equal(isRestorable(sub), true);
  assert.equal(showsManageSubscription(sub), true);
});

test("event package: one-time + no-restore; not restorable; no manage action", () => {
  const d = disclosuresFor(event);
  assert.ok(d.includes("disclosures.oneTime"));
  assert.ok(d.includes("disclosures.consumableNoRestore"));
  assert.equal(isRestorable(event), false);
  assert.equal(showsManageSubscription(event), false);
});

test("design template: managed non-refundable disclosure; never restorable", () => {
  assert.ok(disclosuresFor(design).includes("disclosures.designManaged"));
  assert.equal(isRestorable(design), false);
});

test("business customization: managed provisioning disclosure", () => {
  assert.ok(disclosuresFor(biz).includes("disclosures.businessManaged"));
  assert.equal(isRestorable(biz), false);
});

test("extra invites: consumable, not restorable", () => {
  assert.ok(disclosuresFor(invites).includes("disclosures.consumableNoRestore"));
  assert.equal(isRestorable(invites), false);
});
