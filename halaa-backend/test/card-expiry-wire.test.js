const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  formatExpiryInput,
  parseCardExpiry,
  validateCardExpiry,
  checkLuhn,
  detectCardBrand,
  buildCreditCardSource,
} = require("../src/shared/utils/card");
const { sourceSchema, checkoutSchema } = require("../src/modules/payments/checkout.validation");

test("Backend Card Expiry: strict month (01-12) and expiration verification", () => {
  const refDate = new Date(2026, 7, 21); // August 2026

  // Missing
  assert.equal(validateCardExpiry("", "", refDate).valid, false);

  // 00/26 -> Invalid month
  const res00 = validateCardExpiry("00", "2026", refDate);
  assert.equal(res00.valid, false);
  assert.equal(res00.errorCode, "INVALID_MONTH");

  // 13/26 -> Invalid month
  const res13 = validateCardExpiry("13", "2026", refDate);
  assert.equal(res13.valid, false);
  assert.equal(res13.errorCode, "INVALID_MONTH");

  // Past month 07/26 when ref is 08/26 -> Expired
  const resPast = validateCardExpiry("07", "2026", refDate);
  assert.equal(resPast.valid, false);
  assert.equal(resPast.errorCode, "EXPIRED");

  // Current month 08/26 -> Valid
  const resCurrent = validateCardExpiry("08", "2026", refDate);
  assert.equal(resCurrent.valid, true);

  // Future month 09/26 -> Valid
  const resFuture = validateCardExpiry("09", "2026", refDate);
  assert.equal(resFuture.valid, true);

  // Future year 12/28 -> Valid
  const resFutureYear = validateCardExpiry("12", "2028", refDate);
  assert.equal(resFutureYear.valid, true);
});

test("Backend Card Source Schema: validates creditcard source with integer/string month and year", () => {
  const validSource = {
    type: "creditcard",
    name: "Mohammad Ali",
    number: "4111111111111111",
    month: 12,
    year: 2026,
    cvc: "123",
  };

  const parsed = sourceSchema.safeParse(validSource);
  assert.equal(parsed.success, true);

  const fullCheckout = {
    planCode: "basic_monthly",
    addons: [],
    source: validSource,
    quoteId: `quote_${"a".repeat(64)}`,
    quoteExpiresAt: "2026-12-01T00:00:00.000Z",
  };
  const parsedCheckout = checkoutSchema.safeParse(fullCheckout);
  assert.equal(parsedCheckout.success, true);
});

test("Backend buildCreditCardSource: produces Moyasar-compliant wire format", () => {
  const source = buildCreditCardSource({
    name: " Sara Khalid ",
    number: "5105 1051 0510 5100",
    month: "05",
    year: "2027",
    cvc: "456",
  });

  assert.deepEqual(source, {
    type: "creditcard",
    name: "Sara Khalid",
    number: "5105105105105100",
    month: 5,
    year: 2027,
    cvc: "456",
  });

  // Also handles expiry string format
  const sourceFromExpiry = buildCreditCardSource({
    name: "Sara Khalid",
    number: "5105105105105100",
    expiry: "05/27",
    cvc: "456",
  });

  assert.deepEqual(sourceFromExpiry, {
    type: "creditcard",
    name: "Sara Khalid",
    number: "5105105105105100",
    month: 5,
    year: 2027,
    cvc: "456",
  });
});
