/**
 * Session 3.3 Mobile: Checkout Quote and Money Formatting Parity Tests (PLN-02)
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { formatSar, round2, toHalalas, buildCheckoutQuote } = require("@halaa/shared/utils");

test("Mobile Checkout UI: Eliminates .toFixed(0) decimal truncation in PaymentSummaryCard, DiscountCodeCard, and PlansSummaryScreen", () => {
  const summaryCardPath = path.resolve(
    __dirname,
    "../../components/plans/PaymentSummaryCard.js"
  );
  const discountCardPath = path.resolve(
    __dirname,
    "../../components/plans/DiscountCodeCard.js"
  );
  const plansSummaryScreenPath = path.resolve(
    __dirname,
    "../../screens/host/PlansSummaryScreen.js"
  );

  const summaryContent = fs.readFileSync(summaryCardPath, "utf8");
  const discountContent = fs.readFileSync(discountCardPath, "utf8");
  const screenContent = fs.readFileSync(plansSummaryScreenPath, "utf8");

  assert.equal(
    summaryContent.includes(".toFixed(0)"),
    false,
    "PaymentSummaryCard must not contain .toFixed(0)"
  );
  assert.equal(
    discountContent.includes(".toFixed(0)"),
    false,
    "DiscountCodeCard must not contain .toFixed(0)"
  );
  assert.equal(
    screenContent.includes(".toFixed(0)"),
    false,
    "PlansSummaryScreen must not contain .toFixed(0)"
  );

  assert.ok(
    summaryContent.includes("formatSar") || summaryContent.includes("priceToken("),
    "PaymentSummaryCard must use formatSar (directly or via the shared priceToken)"
  );
  assert.ok(
    screenContent.includes("priceToken(finalTotal"),
    "PlansSummaryScreen must format the footer total via the shared priceToken (formatSar-based)"
  );
});

test("Mobile Money Formatting: Formats decimal amounts accurately using formatSar without fractional loss", () => {
  assert.equal(formatSar(29.5, { trimTrailingZeros: true }), "29.50");
  assert.equal(formatSar(29.0, { trimTrailingZeros: true }), "29");
  assert.equal(formatSar(199.99, { trimTrailingZeros: true }), "199.99");
  assert.equal(formatSar(0, { trimTrailingZeros: true }), "0");
});

test("Mobile Mutation Parity: useCheckout mutation and PlansSummaryScreen pass expectedAmount and quote metadata", () => {
  const mutationPath = path.resolve(
    __dirname,
    "../../hooks/checkout/mutations.js"
  );
  const screenPath = path.resolve(
    __dirname,
    "../../screens/host/PlansSummaryScreen.js"
  );

  const mutationContent = fs.readFileSync(mutationPath, "utf8");
  const screenContent = fs.readFileSync(screenPath, "utf8");

  assert.ok(
    mutationContent.includes("expectedAmount"),
    "useCheckout must accept expectedAmount"
  );
  assert.ok(
    mutationContent.includes("quoteId"),
    "useCheckout must accept quoteId"
  );
  assert.ok(
    screenContent.includes("expectedAmount"),
    "PlansSummaryScreen must pass expectedAmount"
  );
});
