import test from "node:test";
import assert from "node:assert/strict";

import {
  purchaseChangeInfoForItem,
  resolveNativeCheckoutAddons,
} from "../../services/billing/nativeCheckoutCart.js";

const entry = (internalCode) => ({
  internalCode,
  storeEligible: true,
  iosProductId: `com.halaa.${internalCode}`,
});
const pkg = (internalCode) => ({
  identifier: internalCode,
  product: {
    identifier: `com.halaa.${internalCode}`,
    priceString: "SAR 10",
  },
});

const catalog = [
  entry("design_template_ready_made"),
  entry("extra_invites_20"),
];
const offerings = {
  current: {
    availablePackages: [
      pkg("design_template_ready_made"),
      pkg("extra_invites_20"),
    ],
  },
};

test("native checkout accepts a plan-only cart", () => {
  const result = resolveNativeCheckoutAddons([], catalog, offerings);
  assert.equal(result.unavailable, null);
  assert.deepEqual(result.items, []);
});

test("native checkout resolves plan + design before purchase", () => {
  const result = resolveNativeCheckoutAddons(
    [{ addonType: "design_template", templateType: "ready_made" }],
    catalog,
    offerings,
  );
  assert.equal(result.unavailable, null);
  assert.equal(result.items[0].catalogCode, "design_template_ready_made");
});

test("native checkout resolves plan + design + extra invites before purchase", () => {
  const result = resolveNativeCheckoutAddons(
    [
      { addonType: "design_template", templateType: "ready_made" },
      { addonType: "extra_invites", quantity: 20 },
    ],
    catalog,
    offerings,
  );
  assert.equal(result.unavailable, null);
  assert.deepEqual(
    result.items.map((item) => item.catalogCode),
    ["design_template_ready_made", "extra_invites_20"],
  );
});

test("native checkout blocks the full cart when an add-on package is missing", () => {
  const result = resolveNativeCheckoutAddons(
    [{ addonType: "extra_invites", quantity: 50 }],
    catalog,
    offerings,
  );
  assert.equal(result.unavailable.catalogCode, "extra_invites_50");
});

test("subscription replacement metadata is passed only to plan purchases", () => {
  const changeInfo = { oldProductIdentifier: "old", replacementMode: 2 };
  assert.equal(
    purchaseChangeInfoForItem({ kind: "plan" }, changeInfo),
    changeInfo,
  );
  assert.equal(
    purchaseChangeInfoForItem({ kind: "addon" }, changeInfo),
    null,
  );
});

