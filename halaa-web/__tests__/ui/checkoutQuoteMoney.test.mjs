/**
 * Session 3.3 Web: Authoritative Checkout Quote and Money Formatting Tests (PLN-02)
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { checkoutKeys } from "../../hooks/checkout/keys.js";
import { formatSar, round2, toHalalas, buildCheckoutQuote } from "@halaa/shared/utils";

test("Web Checkout Keys: Produces canonical quote key queries", () => {
  const key = checkoutKeys.quote({
    planCode: "basic_event",
    addons: [{ addonType: "extra_invites", quantity: 50 }],
    discountCode: "DISC10",
  });
  assert.deepEqual(key, [
    "checkout",
    "quotes",
    {
      planCode: "basic_event",
      addons: [{ addonType: "extra_invites", quantity: 50 }],
      discountCode: "DISC10",
    },
  ]);
});

test("Web UI Code Inspection: Eliminates toFixed(0) truncation in summary subcomponents (PLN-02)", () => {
  const summaryCardPath = path.resolve(
    __dirname,
    "../../app/[lang]/host/plans/summary/_components/PaymentSummaryCard.js"
  );
  const proceedBtnPath = path.resolve(
    __dirname,
    "../../app/[lang]/host/plans/summary/_components/ProceedButton.js"
  );
  const discountCardPath = path.resolve(
    __dirname,
    "../../app/[lang]/host/plans/summary/_components/DiscountCodeCard.js"
  );

  const summaryContent = fs.readFileSync(summaryCardPath, "utf8");
  const proceedContent = fs.readFileSync(proceedBtnPath, "utf8");
  const discountContent = fs.readFileSync(discountCardPath, "utf8");

  // Verify none of the summary components use .toFixed(0) which strips SAR halalas
  assert.equal(
    summaryContent.includes(".toFixed(0)"),
    false,
    "PaymentSummaryCard must not contain .toFixed(0)"
  );
  assert.equal(
    proceedContent.includes(".toFixed(0)"),
    false,
    "ProceedButton must not contain .toFixed(0)"
  );
  assert.equal(
    discountContent.includes(".toFixed(0)"),
    false,
    "DiscountCodeCard must not contain .toFixed(0)"
  );

  // Verify formatSar is imported and used in summary components
  assert.ok(
    summaryContent.includes("formatSar"),
    "PaymentSummaryCard must use formatSar"
  );
  assert.ok(
    proceedContent.includes("formatSar"),
    "ProceedButton must use formatSar"
  );
});

test("Web Hook Inspection: usePlansPageState passes expectedAmount and quote metadata to checkout mutation (PLN-02)", () => {
  const hookPath = path.resolve(
    __dirname,
    "../../app/[lang]/host/plans/_hooks/usePlansPageState.js"
  );
  const hookContent = fs.readFileSync(hookPath, "utf8");

  assert.ok(
    hookContent.includes("expectedAmount"),
    "usePlansPageState must pass expectedAmount to checkout mutation"
  );
  assert.ok(
    hookContent.includes("quoteId"),
    "usePlansPageState must pass quoteId to checkout mutation"
  );
});
