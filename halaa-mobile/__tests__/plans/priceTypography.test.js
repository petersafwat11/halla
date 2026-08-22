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
  assert.ok(content.includes('alignItems: "center"'), "cardTopRow must center align items to avoid raised price defect");
});

test("TYPO-01 & RTL-04: PlanSummaryCard satisfies Cairo lineHeight and uses isolateLtr on prices", () => {
  const file = path.join(mobileRoot, "components/plans/PlanSummaryCard.js");
  const content = fs.readFileSync(file, "utf8");

  assert.ok(content.includes("isolateLtr(priceDisplay)"), "PlanSummaryCard must wrap priceDisplay in isolateLtr");
  assert.ok(content.includes("isolateLtr(String(planPrice"), "PlanSummaryCard must wrap planPrice in isolateLtr");
  assert.ok(content.includes("lineHeight: 30"), "priceAmount must have adequate Cairo lineHeight");
});

test("TYPO-01 & RTL-04: AddonsSection satisfies Cairo lineHeight and uses isolateLtr on addon rows", () => {
  const file = path.join(mobileRoot, "components/plans/AddonsSection.js");
  const content = fs.readFileSync(file, "utf8");

  assert.ok(content.includes("isolateLtr("), "AddonsSection must import and use isolateLtr");
  assert.ok(content.includes("isolateLtr(`${total}"), "SummaryBar total must use isolateLtr");
  assert.ok(content.includes("isolateLtr(`${tier.price}"), "Design price must use isolateLtr");
  assert.ok(content.includes("isolateLtr(`${activePrice}"), "AddonCard active price must use isolateLtr");
  assert.ok(content.includes("isolateLtr(`+${quantity}`)"), "TierTile qty must use isolateLtr");
});
