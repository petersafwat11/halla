/**
 * Checkout Authoritative Quote and Money Precision Integration Tests (PLN-02).
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const db = require("./helpers/memoryDb");

const checkoutService = require("../src/modules/payments/checkout.service");
const { ValidationError } = require("../src/shared/errors");
const Plan = require("../models/PlanModel");
const User = require("../models/UserModel");
const Payment = require("../models/PaymentModel");
const Discount = require("../models/DiscountModel");
const paymentProvider = require("../src/infrastructure/paymentProvider");
const { toHalalas, halalasToSar } = require("../src/shared/utils/money");

let testUser;
let testBusinessUser;
let origCharge;

test.before(async () => {
  await db.start();
  origCharge = paymentProvider.charge;
});

test.after(async () => {
  paymentProvider.charge = origCharge;
  await db.stop();
});

test.beforeEach(async () => {
  await db.clearAll();

  testUser = await User.create({
    name: "Checkout Tester",
    email: "checkout@example.com",
    phone: "+966500000010",
    password: "password123",
    role: "host",
    accountType: "personal",
  });

  testBusinessUser = await User.create({
    name: "Business Tester",
    email: "business@example.com",
    phone: "+966500000011",
    password: "password123",
    role: "host",
    accountType: "business",
  });

  await Plan.create({
    code: "custom_event_tier",
    planType: "basic_event",
    nameAr: "باقة تجربة",
    nameEn: "Custom Event Tier",
    pricing: { oneTime: 199.5 },
    limits: { maxEvents: 1, invitePool: 100 },
    features: { whatsAppTemplates: 2 },
    availableFor: "host",
    currency: "SAR",
  });
});

test("checkoutService.getQuote calculates authoritative quote with halalas and line items", async () => {
  const quote = await checkoutService.getQuote(testUser._id, {
    planCode: "custom_event_tier",
    addons: [{ addonType: "extra_invites", quantity: 50 }],
  });

  assert.equal(quote.planPrice, 199.5);
  assert.equal(quote.planPriceHalalas, 19950);
  assert.equal(quote.addonsTotal, 200); // 50 extra invites tier = 200 SAR
  assert.equal(quote.addonsTotalHalalas, 20000);
  assert.equal(quote.subtotal, 399.5);
  assert.equal(quote.subtotalHalalas, 39950);
  assert.equal(quote.total, 399.5);
  assert.equal(quote.totalHalalas, 39950);
  assert.ok(quote.quoteId.startsWith("quote_"));
  assert.ok(quote.quoteExpiresAt instanceof Date);
  assert.equal(quote.lineItems.length, 2);
  assert.equal(quote.lineItems[0].totalHalalas, 19950);
  assert.equal(quote.lineItems[1].totalHalalas, 20000);
});

test("checkoutService.getQuote validates discount code and allocates discount across line items", async () => {
  await Discount.create({
    code: "SAVE20",
    discountType: "percentage",
    value: 20,
    isActive: true,
    createdBy: testUser._id,
    startDate: new Date(Date.now() - 86400000),
    endDate: new Date(Date.now() + 86400000),
  });

  const quote = await checkoutService.getQuote(testUser._id, {
    planCode: "custom_event_tier",
    addons: [{ addonType: "extra_invites", quantity: 50 }],
    discountCode: "SAVE20",
  });

  assert.equal(quote.discountCode, "SAVE20");
  assert.equal(quote.discountAmount, 79.9); // 20% of 399.50 = 79.90
  assert.equal(quote.discountAmountHalalas, 7990);
  assert.equal(quote.total, 319.6);
  assert.equal(quote.totalHalalas, 31960);
  assert.equal(quote.discountValid, true);

  const sumLineTotals = quote.lineItems.reduce((s, li) => s + li.total, 0);
  assert.equal(Math.round(sumLineTotals * 100) / 100, quote.total);
});

test("checkoutService.checkout succeeds when expectedAmount matches server quote", async () => {
  paymentProvider.charge = async ({ amount, currency }) => {
    assert.equal(amount, 199.5);
    assert.equal(currency, "SAR");
    return {
      success: true,
      transactionId: "moyasar-test-123",
      providerStatus: "paid",
      fee: 5.0,
      paymentMethod: { type: "creditcard" },
    };
  };

  const quote = await checkoutService.getQuote(testUser._id, {
    planCode: "custom_event_tier",
  });

  const result = await checkoutService.checkout(testUser._id, {
    planCode: "custom_event_tier",
    expectedAmount: quote.total,
    quoteId: quote.quoteId,
  });

  assert.ok(result.subscription);
  assert.equal(result.totals.total, 199.5);
  assert.equal(result.totals.totalHalalas, 19950);

  const payment = await Payment.findById(result.paymentId);
  assert.ok(payment);
  assert.equal(payment.amount, 199.5);
  assert.equal(payment.metadata.totalHalalas, 19950);
  assert.equal(payment.metadata.quoteId, quote.quoteId);
});

test("checkoutService.checkout rejects with ValidationError if expectedAmount mismatches current price", async () => {
  const quote = await checkoutService.getQuote(testUser._id, {
    planCode: "custom_event_tier",
  });

  await assert.rejects(
    async () => {
      await checkoutService.checkout(testUser._id, {
        planCode: "custom_event_tier",
        expectedAmount: quote.total - 10, // Stale/mismatched client price
        quoteId: quote.quoteId,
      });
    },
    (err) => {
      assert.ok(err instanceof ValidationError);
      assert.match(err.message, /Price changed since quote was generated/);
      return true;
    }
  );
});

test("checkoutService.checkout rejects with ValidationError if quote has expired", async () => {
  const quote = await checkoutService.getQuote(testUser._id, {
    planCode: "custom_event_tier",
  });

  const expiredDate = new Date(Date.now() - 10000).toISOString();

  await assert.rejects(
    async () => {
      await checkoutService.checkout(testUser._id, {
        planCode: "custom_event_tier",
        expectedAmount: quote.total,
        quoteExpiresAt: expiredDate,
      });
    },
    (err) => {
      assert.ok(err instanceof ValidationError);
      assert.match(err.message, /Quote has expired/);
      return true;
    }
  );
});
