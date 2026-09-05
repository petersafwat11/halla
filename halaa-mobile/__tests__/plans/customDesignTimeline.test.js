const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const MOBILE_ROOT = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(MOBILE_ROOT, rel), "utf8");

test("CustomDesignTimeline: contract, formatting, and support integration", async () => {
  const source = read("components/plans/CustomDesignTimeline.js");

  // Uses shared canonical utils - no raw Intl or toLocaleString
  assert.ok(source.includes("formatDateTime"), "Must use shared formatDateTime");
  assert.ok(source.includes("formatCurrency"), "Must use shared formatCurrency");
  assert.ok(!source.includes(".toLocaleString"), "Must not use raw toLocaleString");
  assert.ok(!source.includes("new Intl."), "Must not instantiate raw Intl");

  // Support button uses SUPPORT_SOURCE.ADDON_FULFILLMENT and buildSupportRequest
  assert.ok(
    source.includes("SUPPORT_SOURCE.ADDON_FULFILLMENT"),
    "Must use SUPPORT_SOURCE.ADDON_FULFILLMENT"
  );
  assert.ok(source.includes("buildSupportRequest"), "Must call buildSupportRequest");
  assert.ok(
    source.includes('kind: "addon"'),
    "Support reference must be opaque addon reference"
  );

  // Sequential progression: never mark future steps complete
  assert.ok(
    source.includes("DESIGN_FULFILLMENT_SEQUENCE.indexOf(currentStatus)"),
    "Must track current status in canonical sequence"
  );
  assert.ok(
    source.includes("idx < currentIndex"),
    "Must only mark past/current steps complete"
  );

  // Distinct refund handling
  assert.ok(
    source.includes('currentStatus === "refunded"'),
    "Must handle refunded state distinctly"
  );
  assert.ok(
    source.includes('currentStatus === "refund_required"'),
    "Must handle refund_required state distinctly"
  );
  assert.ok(
    source.includes("refundBanner"),
    "Must render a distinct refund banner"
  );

  // Expected delivery only shown when present and not refunded
  assert.ok(
    source.includes("fulfillment.expectedDeliveryAt && !isRefunded"),
    "Expected delivery must only be shown when present and not refunded"
  );

  // No physical directional styles
  const PHYSICAL =
    /\b(marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth|borderLeftColor|borderRightColor)\s*:/;
  const lines = source.split("\n");
  const violations = lines
    .map((l, i) => ({ line: l.trim(), i }))
    .filter(({ line }) => !line.startsWith("//") && !line.startsWith("*") && PHYSICAL.test(line));
  assert.deepEqual(violations, [], "CustomDesignTimeline must not contain physical directional styles");
});

test("AddonsPurchaseScreen: integrates CustomDesignTimeline for design addons", () => {
  const source = read("screens/host/AddonsPurchaseScreen.js");

  assert.ok(
    source.includes('import CustomDesignTimeline from "../../components/plans/CustomDesignTimeline"'),
    "Must import CustomDesignTimeline"
  );
  assert.ok(
    source.includes('a.addonType === "design_template"'),
    "Must filter addons by design_template"
  );
  assert.ok(
    source.includes("<CustomDesignTimeline"),
    "Must render CustomDesignTimeline for design template addons"
  );
});

test("Design Fulfillment SLA and transitions parity in mobile", async () => {
  const {
    DESIGN_FULFILLMENT_STATUS,
    DESIGN_FULFILLMENT_SEQUENCE,
    isValidDesignFulfillmentTransition,
    getNextFulfillmentStatus,
    deriveExpectedDeliveryDate,
  } = await import("@halaa/shared/constants/addons");

  // Sequence parity
  assert.deepEqual(DESIGN_FULFILLMENT_SEQUENCE, [
    DESIGN_FULFILLMENT_STATUS.PAID,
    DESIGN_FULFILLMENT_STATUS.QUEUED,
    DESIGN_FULFILLMENT_STATUS.IN_PROGRESS,
    DESIGN_FULFILLMENT_STATUS.FULFILLED,
  ]);

  // Valid forward steps
  assert.equal(getNextFulfillmentStatus("paid"), "queued");
  assert.equal(getNextFulfillmentStatus("queued"), "in_progress");
  assert.equal(getNextFulfillmentStatus("in_progress"), "fulfilled");
  assert.equal(getNextFulfillmentStatus("fulfilled"), null);

  // Transition validation
  assert.equal(isValidDesignFulfillmentTransition("paid", "queued"), true);
  assert.equal(isValidDesignFulfillmentTransition("queued", "in_progress"), true);
  assert.equal(isValidDesignFulfillmentTransition("in_progress", "fulfilled"), true);
  // Idempotent same-state
  assert.equal(isValidDesignFulfillmentTransition("paid", "paid"), true);
  assert.equal(isValidDesignFulfillmentTransition("in_progress", "in_progress"), true);
  // Invalid jumps / reversals
  assert.equal(isValidDesignFulfillmentTransition("paid", "fulfilled"), false);
  assert.equal(isValidDesignFulfillmentTransition("in_progress", "queued"), false);
  assert.equal(isValidDesignFulfillmentTransition("fulfilled", "in_progress"), false);

  // SLA derivation
  const base = new Date("2026-03-01T10:00:00.000Z");
  const dReady = deriveExpectedDeliveryDate("ready_made", base);
  assert.equal(dReady.toISOString(), "2026-03-03T10:00:00.000Z"); // +48h

  const dThemed = deriveExpectedDeliveryDate("custom_themed", base);
  assert.equal(dThemed.toISOString(), "2026-03-04T10:00:00.000Z"); // +72h

  const dAnimated = deriveExpectedDeliveryDate("animated", base);
  assert.equal(dAnimated.toISOString(), "2026-03-05T10:00:00.000Z"); // +96h

  const d3d = deriveExpectedDeliveryDate("3d", base);
  assert.equal(d3d.toISOString(), "2026-03-06T10:00:00.000Z"); // +120h

  const dDefault = deriveExpectedDeliveryDate("unknown_tier", base);
  assert.equal(dDefault.toISOString(), "2026-03-04T10:00:00.000Z"); // +72h default
});
