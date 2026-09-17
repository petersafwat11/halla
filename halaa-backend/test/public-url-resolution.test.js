const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeOrigin,
  resolveBaseUrl,
  buildPublicUrl,
} = require("../src/shared/utils/publicUrl");

test("normalizeOrigin trims and drops trailing slashes", () => {
  assert.equal(normalizeOrigin("  https://halaa.com.sa/  "), "https://halaa.com.sa");
  assert.equal(normalizeOrigin("https://halaa.com.sa///"), "https://halaa.com.sa");
  assert.equal(normalizeOrigin(undefined), "");
});

test("resolveBaseUrl rejects an unset or malformed origin", () => {
  assert.throws(() => resolveBaseUrl(undefined, { label: "Frontend" }), /Frontend URL must be configured/);
  assert.throws(() => resolveBaseUrl("not-a-url", { label: "Frontend" }), /Frontend URL must be configured/);
  assert.throws(() => resolveBaseUrl("ftp://x.example", { label: "Frontend" }), /Frontend URL is invalid/);
  assert.throws(
    () => resolveBaseUrl("http://x.example", { label: "Frontend", requireHttps: true }),
    /Frontend URL is invalid/
  );
});

test("buildPublicUrl joins a path without doubling or dropping the separator", () => {
  assert.equal(
    buildPublicUrl("http://localhost:3000/", "business/checkout/abc"),
    "http://localhost:3000/business/checkout/abc"
  );
  assert.equal(
    buildPublicUrl("http://localhost:3000", "/business/checkout/abc/return"),
    "http://localhost:3000/business/checkout/abc/return"
  );
});

// The business checkout builder deliberately does NOT require https, so an
// http-configured deploy keeps working instead of failing to create a checkout.
test("an http origin still builds a checkout URL when https is not required", () => {
  assert.equal(
    buildPublicUrl("http://halaa.example", "business/checkout/tok", { requireHttps: false }),
    "http://halaa.example/business/checkout/tok"
  );
});

// Regression: config.frontend.canonicalUrl used to be undefined, so the business
// checkout link (and the Moyasar callback built from it) started with "undefined".
test("config exposes a usable frontend canonical origin", () => {
  const config = require("../src/config");
  assert.ok(config.frontend.canonicalUrl, "frontend.canonicalUrl must be set");
  const link = buildPublicUrl(config.frontend.canonicalUrl, "business/checkout/token");
  assert.ok(!link.startsWith("undefined"), link);
  assert.match(link, /^https?:\/\//);
});
