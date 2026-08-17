/**
 * SEO route index/noindex policy tests (SEO-01, SEO-ASO-METADATA-PLAN §10).
 * Pure — imports the shared executable policy, no Next runtime.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  ROUTE_CLASS,
  robotsFor,
  isIndexable,
  ROUTE_INVENTORY,
} from "@halaa/shared/brand";

const INDEXABLE_CLASSES = [
  ROUTE_CLASS.LANDING,
  ROUTE_CLASS.MARKETPLACE,
  ROUTE_CLASS.VENDOR_PROFILE,
  ROUTE_CLASS.LEGAL,
];
const NOINDEX_CLASSES = [
  ROUTE_CLASS.AUTH,
  ROUTE_CLASS.DASHBOARD,
  ROUTE_CLASS.CHECKOUT,
  ROUTE_CLASS.POST_EVENT,
  ROUTE_CLASS.TOKEN_LINK,
];

test("indexable classes resolve to index:true / follow:true", () => {
  for (const c of INDEXABLE_CLASSES) {
    const r = robotsFor(c);
    assert.equal(r.index, true, `${c} must be index:true`);
    assert.equal(r.follow, true, `${c} must be follow:true`);
    assert.equal(isIndexable(c), true);
  }
});

test("every non-indexable class is noindex", () => {
  for (const c of NOINDEX_CLASSES) {
    const r = robotsFor(c);
    assert.equal(r.index, false, `${c} must be index:false`);
    assert.equal(isIndexable(c), false);
  }
});

test("all non-indexable classes are noindex AND nofollow (matches shipped root default-deny)", () => {
  // Auth/dashboard pages define no generateMetadata, so they inherit the root
  // {index:false,follow:false}. The policy resolves them the same way so the
  // signed inventory equals what the server actually returns.
  for (const c of [ROUTE_CLASS.AUTH, ROUTE_CLASS.DASHBOARD, ROUTE_CLASS.CHECKOUT, ROUTE_CLASS.POST_EVENT, ROUTE_CLASS.TOKEN_LINK]) {
    const r = robotsFor(c);
    assert.equal(r.index, false, `${c} must be noindex`);
    assert.equal(r.follow, false, `${c} must be nofollow (inherited default-deny)`);
  }
});

test("DEFAULT-DENY: unknown/undefined class → noindex,nofollow", () => {
  for (const bad of [undefined, null, "", "made-up-route", "LANDING"]) {
    const r = robotsFor(bad);
    assert.equal(r.index, false, `unknown class ${bad} must default to noindex`);
    assert.equal(r.follow, false);
  }
});

test("route inventory: every row's class is a known ROUTE_CLASS", () => {
  const known = new Set(Object.values(ROUTE_CLASS));
  for (const row of ROUTE_INVENTORY) {
    assert.ok(known.has(row.routeClass), `unknown class in inventory: ${row.routeClass}`);
  }
});

test("route inventory: PII routes are never indexable", () => {
  for (const row of ROUTE_INVENTORY) {
    if (row.pii) {
      assert.equal(isIndexable(row.routeClass), false, `${row.path} renders PII but is indexable`);
      assert.equal(row.sitemap, false, `${row.path} renders PII but is in the sitemap`);
    }
  }
});

test("route inventory: only indexable rows may be in the sitemap", () => {
  for (const row of ROUTE_INVENTORY) {
    if (row.sitemap === true || row.sitemap === "dynamic") {
      assert.equal(isIndexable(row.routeClass), true, `${row.path} is in sitemap but not indexable`);
    }
  }
});

test("known token/checkout/post-event routes present and noindex", () => {
  const mustBeNoindex = [
    "/[lang]/business/checkout/[token]",
    "/[lang]/post-event",
    "/[lang]/ticket-rating/[id]",
    "/[lang]/reset-password",
    "/[lang]/host/payments/return",
  ];
  for (const p of mustBeNoindex) {
    const row = ROUTE_INVENTORY.find((r) => r.path === p);
    assert.ok(row, `inventory missing ${p}`);
    assert.equal(isIndexable(row.routeClass), false, `${p} must be noindex`);
  }
});
