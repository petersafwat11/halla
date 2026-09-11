/**
 * Payment-links provider + money unit tests.
 * No provider network: stubs paymentProvider + asserts string-parsed halalas,
 * Arabic-digit normalization, and adapter minor-unit preservation.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const { parseAmountSarToHalalas } = require("../src/modules/payment-links/paymentLinks.money");

test("parses western + arabic amounts to exact halalas", () => {
  assert.equal(parseAmountSarToHalalas("250", { maxSar: 50000 }), 25000);
  assert.equal(parseAmountSarToHalalas("250.5", { maxSar: 50000 }), 25050);
  assert.equal(parseAmountSarToHalalas("250.50", { maxSar: 50000 }), 25050);
  assert.equal(parseAmountSarToHalalas("٢٥٠٫٥٠", { maxSar: 50000 }), 25050);
  assert.equal(parseAmountSarToHalalas("٢٥٠.٥", { maxSar: 50000 }), 25050);
});

test("rejects zero, negative, sub-minimum, extra decimals, exponents, grouping", () => {
  for (const bad of ["0", "0.00", "-5", "0.99", "1.234", "1e3", "1,000", "1،000", "abc", ""]) {
    assert.throws(() => parseAmountSarToHalalas(bad, { minSar: 1, maxSar: 50000 }), /./, bad);
  }
});

test("rejects over configured max", () => {
  assert.throws(() => parseAmountSarToHalalas("50000.01", { minSar: 1, maxSar: 50000 }), /exceed/);
});

test("moyasar adapter preserves exact minor units (no double conversion)", async () => {
  process.env.MOYASAR_API_KEY = process.env.MOYASAR_API_KEY || "sk_test_dummy";
  const moyasar = require("../src/infrastructure/paymentProvider/moyasar");
  const axios = require("axios");
  const orig = axios.post;
  let sentBody = null;
  axios.post = async () => ({ data: { id: "inv_1", url: "https://invoice.moyasar.com/x", status: "pending" } });
  try {
    const res = await moyasar.createInvoiceMinor({
      amountHalalas: 25050,
      currency: "SAR",
      description: "t",
      metadata: {},
    });
    assert.equal(res.success, true);
    // capture body via second call introspection
    axios.post = async (_url, body) => {
      sentBody = body;
      return { data: { id: "inv_2", url: "https://invoice.moyasar.com/y", status: "pending" } };
    };
    await moyasar.createInvoice({
      amountHalalas: 25050,
      expireAt: "2026-10-01T00:00:00.000Z",
      currency: "SAR",
      description: "t",
      metadata: {},
    });
    assert.equal(sentBody.amount, 25050);
    assert.equal(sentBody.expired_at, "2026-10-01T00:00:00.000Z");
    assert.equal(sentBody.expire_at, undefined);
  } finally {
    axios.post = orig;
  }
});
