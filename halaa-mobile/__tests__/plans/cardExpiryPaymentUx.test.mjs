import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MOBILE_ROOT = path.resolve(__dirname, "..", "..");

test("Mobile Card Expiry & Payment UX: PaymentMethodSelector renders MM/YY and uses formatExpiryInput", () => {
  const componentPath = path.join(
    MOBILE_ROOT,
    "components",
    "plans",
    "PaymentMethodSelector.js"
  );
  const content = fs.readFileSync(componentPath, "utf8");

  // Verify placeholder is MM/YY
  assert.ok(
    content.includes('placeholder="MM/YY"'),
    "Mobile PaymentMethodSelector must use MM/YY placeholder"
  );
  assert.ok(
    !content.includes('placeholder="YY/MM"'),
    "Mobile PaymentMethodSelector must not use obsolete YY/MM placeholder"
  );

  // Verify formatExpiryInput is used
  assert.ok(
    content.includes("formatExpiryInput("),
    "Mobile PaymentMethodSelector must use formatExpiryInput from @halaa/shared/utils"
  );

  // Verify initial cardData hydration formats as MM/YY
  assert.ok(
    content.includes("${mm}/${yy}"),
    "Mobile PaymentMethodSelector must display MM/YY order on cardData hydration"
  );
});

test("Mobile Card Expiry & Payment UX: PlansSummaryScreen validation, source builder, and platform gating", () => {
  const screenPath = path.join(
    MOBILE_ROOT,
    "screens",
    "host",
    "PlansSummaryScreen.js"
  );
  const content = fs.readFileSync(screenPath, "utf8");

  // Validation & source building
  assert.ok(
    content.includes("validateCardExpiry"),
    "PlansSummaryScreen must import and use validateCardExpiry from @halaa/shared/utils"
  );
  assert.ok(
    content.includes("buildCreditCardSource"),
    "PlansSummaryScreen must use buildCreditCardSource from @halaa/shared/utils"
  );

  // Double submit protection
  assert.ok(
    content.includes("if (isProcessing) return;"),
    "PlansSummaryScreen handlePayment must guard against double submission"
  );

  // Platform gating: web uses Moyasar card checkout; native uses IAP (RevenueCat / StoreKit)
  assert.ok(
    content.includes('const isWeb = Platform.OS === "web";'),
    "PlansSummaryScreen must gate web Moyasar checkout vs native IAP"
  );
});
