import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  round2,
  toHalalas,
  halalasToSar,
  formatSar,
  allocateDiscount,
  buildCheckoutQuote,
} from "../src/utils/money.js";

describe("Money Utilities & Authoritative Quote (@halaa/shared/utils/money)", () => {
  describe("round2, toHalalas, halalasToSar", () => {
    it("handles standard decimals and rounding half-up", () => {
      assert.equal(round2(29.99), 29.99);
      assert.equal(round2(29.994), 29.99);
      assert.equal(round2(29.995), 30.0);
      assert.equal(round2("199.55"), 199.55);
      assert.equal(round2(null), 0);
      assert.equal(round2(undefined), 0);
      assert.equal(round2(NaN), 0);
    });

    it("converts SAR to integer halalas without floating point drift", () => {
      assert.equal(toHalalas(0), 0);
      assert.equal(toHalalas(0.01), 1);
      assert.equal(toHalalas(0.99), 99);
      assert.equal(toHalalas(1.0), 100);
      assert.equal(toHalalas(29.99), 2999);
      assert.equal(toHalalas(199.5), 19950);
      assert.equal(toHalalas(99999.99), 9999999);
      assert.equal(toHalalas("49.95"), 4995);
      assert.equal(toHalalas(null), 0);
    });

    it("converts halalas back to SAR major units", () => {
      assert.equal(halalasToSar(0), 0);
      assert.equal(halalasToSar(1), 0.01);
      assert.equal(halalasToSar(99), 0.99);
      assert.equal(halalasToSar(100), 1.0);
      assert.equal(halalasToSar(2999), 29.99);
      assert.equal(halalasToSar(19950), 199.5);
      assert.equal(halalasToSar("4995"), 49.95);
      assert.equal(halalasToSar(null), 0);
    });
  });

  describe("formatSar", () => {
    it("formats amounts with exact 2 decimal places by default", () => {
      assert.equal(formatSar(29.5), "29.50");
      assert.equal(formatSar(0), "0.00");
      assert.equal(formatSar(199.99), "199.99");
      assert.equal(formatSar(100), "100.00");
    });

    it("supports trimTrailingZeros and currency inclusions", () => {
      assert.equal(formatSar(100, { trimTrailingZeros: true }), "100");
      assert.equal(formatSar(100.5, { trimTrailingZeros: true }), "100.50");
      assert.equal(formatSar(29.99, { includeCurrency: true }), "29.99 SAR");
      assert.equal(formatSar(29.99, { includeCurrency: true, currency: "USD" }), "29.99 USD");
      assert.equal(formatSar(null), "0.00");
    });
  });

  describe("allocateDiscount", () => {
    it("allocates discount proportionally and places rounding remainder on largest item", () => {
      const items = [
        { id: "item1", subtotal: 100 },
        { id: "item2", subtotal: 200 },
      ];
      const allocations = allocateDiscount(items, 30);
      assert.equal(allocations.get("item1"), 10);
      assert.equal(allocations.get("item2"), 20);
      assert.equal(allocations.get("item1") + allocations.get("item2"), 30);
    });

    it("handles fractional discounts without losing halalas", () => {
      const items = [
        { id: "a", subtotal: 33.33 },
        { id: "b", subtotal: 33.33 },
        { id: "c", subtotal: 33.34 },
      ];
      const allocations = allocateDiscount(items, 10);
      const totalAllocated = round2(
        allocations.get("a") + allocations.get("b") + allocations.get("c")
      );
      assert.equal(totalAllocated, 10);
    });

    it("caps discount at subtotal base", () => {
      const items = [{ id: "plan", subtotal: 50 }];
      const allocations = allocateDiscount(items, 100);
      assert.equal(allocations.get("plan"), 50);
    });
  });

  describe("buildCheckoutQuote", () => {
    it("builds a standard quote with line items, halalas, and discount allocations", () => {
      const plan = {
        code: "basic_event",
        nameEn: "Basic Event Plan",
        pricing: { oneTime: 199.5 },
      };
      const addons = [
        { addonType: "extra_invites", quantity: 50, price: 50.0 },
      ];
      const quote = buildCheckoutQuote({
        plan,
        addons,
        discountAmount: 24.95,
        discountCode: "TEST10",
      });

      assert.equal(quote.planPrice, 199.5);
      assert.equal(quote.planPriceHalalas, 19950);
      assert.equal(quote.addonsTotal, 50.0);
      assert.equal(quote.addonsTotalHalalas, 5000);
      assert.equal(quote.subtotal, 249.5);
      assert.equal(quote.subtotalHalalas, 24950);
      assert.equal(quote.discountAmount, 24.95);
      assert.equal(quote.discountAmountHalalas, 2495);
      assert.equal(quote.discountCode, "TEST10");
      assert.equal(quote.total, 224.55);
      assert.equal(quote.totalHalalas, 22455);
      assert.equal(quote.lineItems.length, 2);
      assert.equal(quote.lineItems[0].type, "plan");
      assert.equal(quote.lineItems[1].type, "addon");

      const lineTotalSum = round2(
        quote.lineItems.reduce((s, li) => s + li.total, 0)
      );
      assert.equal(lineTotalSum, quote.total);
    });

    it("handles zero price and fully discounted plans", () => {
      const plan = {
        code: "trial",
        nameEn: "Trial Plan",
        pricing: { oneTime: 0 },
      };
      const quote = buildCheckoutQuote({ plan });
      assert.equal(quote.planPrice, 0);
      assert.equal(quote.total, 0);
      assert.equal(quote.totalHalalas, 0);
    });

    it("handles business plan setup fee correctly", () => {
      const plan = {
        code: "business_quarterly",
        nameEn: "Business Quarterly",
        pricing: { oneTime: 1500.0 },
      };
      const quote = buildCheckoutQuote({
        plan,
        setupFee: 1200.0,
        discountAmount: 150.0,
        discountCode: "BIZ10",
      });

      assert.equal(quote.setupFee, 1200.0);
      assert.equal(quote.setupFeeHalalas, 120000);
      assert.equal(quote.subtotal, 1500.0);
      assert.equal(quote.discountAmount, 150.0);
      assert.equal(quote.total, 2550.0);
      assert.equal(quote.totalHalalas, 255000);
      assert.equal(quote.lineItems.some((l) => l.type === "setup_fee"), true);
    });
  });
});
