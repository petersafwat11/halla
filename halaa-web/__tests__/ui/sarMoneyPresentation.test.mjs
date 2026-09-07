import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import MoneyAmount from "../../ui/commen/MoneyAmount/MoneyAmount.jsx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, "..", "..");
const read = (...parts) => fs.readFileSync(path.join(WEB_ROOT, ...parts), "utf8");

describe("canonical Saudi Riyal presentation", () => {
  it("renders a SAR value with the official SVG and an accessible currency label", () => {
    const html = renderToStaticMarkup(
      React.createElement(MoneyAmount, { amount: 100, currency: "SAR", locale: "en" })
    );

    assert.match(html, /100/);
    assert.match(html, /\/svg\/sar\.svg/);
    assert.match(html, /aria-label="100 Saudi Riyal"/);
    assert.doesNotMatch(html, />\s*SAR\s*</);
  });

  it("keeps non-SAR currencies on the standard localized formatter", () => {
    const html = renderToStaticMarkup(
      React.createElement(MoneyAmount, { amount: 12.5, currency: "USD", locale: "en" })
    );

    assert.match(html, /\$12\.5(?:0)?|USD/);
    assert.doesNotMatch(html, /\/svg\/sar\.svg/);
  });

  it("routes every critical human-facing money surface through MoneyAmount", () => {
    const surfaces = [
      ["app", "[lang]", "business", "checkout", "[token]", "page.js"],
      ["app", "[lang]", "host", "plans", "_components", "AddonsSection.jsx"],
      ["app", "[lang]", "host", "plans", "summary", "_components", "PaymentSummaryCard.js"],
      ["app", "[lang]", "host", "payments", "_components", "PaymentsClient.jsx"],
      ["app", "[lang]", "admin-dash", "payments", "_components", "PaymentsTable.js"],
      ["app", "[lang]", "admin-dash", "custom-designs", "_components", "CustomDesignsTable.jsx"],
      ["app", "[lang]", "market-place", "_components", "card", "Card.js"],
      ["components", "addons", "CustomDesignTimeline.jsx"],
      ["ui", "plans", "PlanCard", "PlanCard.jsx"],
      ["ui", "landing", "PricingSection", "PricingSection.jsx"],
    ];

    for (const parts of surfaces) {
      assert.match(read(...parts), /MoneyAmount/, `${parts.join("/")} must use MoneyAmount`);
    }
  });
});
