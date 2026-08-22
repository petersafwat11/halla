import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  formatExpiryInput,
  parseCardExpiry,
  validateCardExpiry,
  checkLuhn,
  buildCreditCardSource,
} from "@halaa/shared/utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WEB_ROOT = path.resolve(__dirname, "..", "..");

test("Web Card Expiry & Payment UX: PaymentMethodSelector renders MM/YY and uses formatExpiryInput", () => {
  const componentPath = path.join(
    WEB_ROOT,
    "app",
    "[lang]",
    "host",
    "plans",
    "_components",
    "PaymentMethodSelector.jsx"
  );
  const content = fs.readFileSync(componentPath, "utf8");

  // Verify placeholder is strictly MM/YY (not YY/MM)
  assert.ok(
    content.includes('placeholder="MM/YY"'),
    "PaymentMethodSelector must use MM/YY placeholder for expiry date"
  );
  assert.ok(
    !content.includes('placeholder="YY/MM"'),
    "PaymentMethodSelector must not contain obsolete YY/MM placeholder"
  );

  // Verify formatExpiryInput is used
  assert.ok(
    content.includes("formatExpiryInput("),
    "PaymentMethodSelector must use formatExpiryInput from @halaa/shared/utils"
  );

  // Verify initial cardData hydration formats as MM/YY
  assert.ok(
    content.includes("${mm}/${yy}"),
    "PaymentMethodSelector must display MM/YY order on cardData hydration"
  );
});

test("Web Card Expiry & Payment UX: Host Summary and Business Checkout use shared validation and double-submit guards", () => {
  const summaryPath = path.join(
    WEB_ROOT,
    "app",
    "[lang]",
    "host",
    "plans",
    "summary",
    "Summary.js"
  );
  const summaryContent = fs.readFileSync(summaryPath, "utf8");

  // Summary imports and uses validateCardExpiry
  assert.ok(
    summaryContent.includes("validateCardExpiry"),
    "Summary.js must import and use validateCardExpiry from @halaa/shared/utils"
  );

  // Double submit protection
  assert.ok(
    summaryContent.includes("if (isProcessing) return;"),
    "Summary.js handlePayment must guard against double submits"
  );

  const businessCheckoutPath = path.join(
    WEB_ROOT,
    "app",
    "[lang]",
    "business",
    "checkout",
    "[token]",
    "page.js"
  );
  const businessContent = fs.readFileSync(businessCheckoutPath, "utf8");

  // Business checkout uses buildCreditCardSource and validateCardExpiry
  assert.ok(
    businessContent.includes("buildCreditCardSource"),
    "Business checkout must use buildCreditCardSource from @halaa/shared/utils"
  );
  assert.ok(
    businessContent.includes("validateCardExpiry"),
    "Business checkout must use validateCardExpiry from @halaa/shared/utils"
  );
  assert.ok(
    businessContent.includes("if (isProcessing || submitMutation.isPending) return;"),
    "Business checkout must guard handlePay against double submission"
  );
});

test("Web Card Expiry: Strict MM/YY validation catches invalid and expired cards", () => {
  const refDate = new Date(2026, 7, 21); // August 2026

  // 00 month is rejected
  const res00 = validateCardExpiry("00", "26", refDate);
  assert.equal(res00.valid, false);
  assert.equal(res00.errorCode, "INVALID_MONTH");

  // 13 month is rejected
  const res13 = validateCardExpiry("13", "26", refDate);
  assert.equal(res13.valid, false);
  assert.equal(res13.errorCode, "INVALID_MONTH");

  // Past month is rejected
  const resPast = validateCardExpiry("06", "26", refDate);
  assert.equal(resPast.valid, false);
  assert.equal(resPast.errorCode, "EXPIRED");

  // Current month is valid
  const resCurrent = validateCardExpiry("08", "26", refDate);
  assert.equal(resCurrent.valid, true);

  // Future month is valid
  const resFuture = validateCardExpiry("12", "28", refDate);
  assert.equal(resFuture.valid, true);
});
