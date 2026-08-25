import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mobileRoot = path.resolve(__dirname, "../..");

test("TYPO-01 & RTL-04: PlanPriceBlock satisfies Cairo lineHeight >= 1.3 * fontSize and uses isolateLtr", () => {
  const file = path.join(mobileRoot, "components/plans/_components/PlanPriceBlock.js");
  const content = fs.readFileSync(file, "utf8");

  assert.ok(content.includes("isolateLtr("), "PlanPriceBlock must wrap price in isolateLtr");
  assert.ok(content.includes("lineHeight: 36"), "priceNum must have adequate Cairo lineHeight");
  assert.ok(content.includes("lineHeight: 28"), "cardName must have adequate Cairo lineHeight");
  assert.ok(
    /cardTopRow:\s*{[\s\S]*?alignItems:\s*"baseline"/.test(content),
    "cardTopRow must share the real text baseline so plan name and price stay on one line"
  );
  // Atomic token row: number + SAR glyph may never shrink/wrap apart.
  assert.ok(
    /priceRow:\s*{[\s\S]*?flexShrink:\s*0/.test(content),
    "priceRow must be a non-shrinking atomic price token"
  );
});

test("TYPO-01 & RTL-04: PlanSummaryCard satisfies Cairo lineHeight and isolates every price token", () => {
  const file = path.join(mobileRoot, "components/plans/PlanSummaryCard.js");
  const content = fs.readFileSync(file, "utf8");

  assert.ok(content.includes("isolateLtr(priceDisplay)"), "PlanSummaryCard must wrap priceDisplay in isolateLtr");
  assert.ok(
    content.includes("priceToken(planPrice"),
    "PlanSummaryCard must render the web price as ONE atomic priceToken (amount + currency)"
  );
  assert.ok(content.includes("lineHeight: 30"), "priceAmount must have adequate Cairo lineHeight");
});

test("TYPO-01 & RTL-04: AddonsSection satisfies Cairo lineHeight and uses the shared atomic price token", () => {
  const file = path.join(mobileRoot, "components/plans/AddonsSection.js");
  const content = fs.readFileSync(file, "utf8");

  assert.ok(content.includes("priceToken("), "AddonsSection must import and use the shared priceToken helper");
  assert.ok(content.includes("lineHeight: 22"), "tileQty must keep adequate Cairo lineHeight");
  assert.ok(
    content.includes("priceToken(total, sarLabel)"),
    "SummaryBar total must use the atomic priceToken"
  );
  assert.ok(
    content.includes("priceToken(tier.price, sarLabel)"),
    "Design/tier prices must use the atomic priceToken"
  );
  assert.ok(
    content.includes("priceToken(activePrice, sarLabel)"),
    "AddonCard active price must use the atomic priceToken"
  );
  assert.ok(
    content.includes('isolateLtr(`+${countToken(tier.quantity, lang)}`)'),
    "TierTile qty sign+digits must stay glued inside an LTR isolate with locale digits"
  );
});
