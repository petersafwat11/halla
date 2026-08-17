/**
 * ASO store-text character/byte-limit validator tests
 * (SEO-ASO-METADATA-PLAN §7.2, §7.3, §10).
 * The Apple keyword field is BYTE-limited (Arabic ≈ 2 bytes/char); everything
 * else is character-limited.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  charLength,
  byteLength,
  checkField,
  validateListing,
  APPLE_LIMITS,
  GOOGLE_LIMITS,
} from "@halaa/shared/brand";

test("charLength counts code points; byteLength counts UTF-8 bytes", () => {
  assert.equal(charLength("Halaa"), 5);
  assert.equal(byteLength("Halaa"), 5);
  // Arabic "هلا" = 3 chars but 6 UTF-8 bytes.
  assert.equal(charLength("هلا"), 3);
  assert.equal(byteLength("هلا"), 6);
});

test("Apple keyword field is measured in BYTES, not chars", () => {
  assert.equal(APPLE_LIMITS.keywords.unit, "byte");
  assert.equal(APPLE_LIMITS.keywords.limit, 100);
  // 60 Arabic chars = 120 bytes → over the 100-byte cap even though < 100 chars.
  const kw = "م".repeat(60);
  assert.equal(charLength(kw), 60);
  assert.ok(byteLength(kw) > 100);
  assert.equal(checkField(kw, APPLE_LIMITS.keywords).ok, false, "60 Arabic chars must fail the 100-byte keyword cap");
});

test("Apple name/subtitle 30-char cap enforced", () => {
  assert.equal(checkField("A".repeat(30), APPLE_LIMITS.name).ok, true);
  assert.equal(checkField("A".repeat(31), APPLE_LIMITS.name).ok, false);
  assert.equal(checkField("A".repeat(31), APPLE_LIMITS.subtitle).ok, false);
});

test("Google short description 80-char cap enforced", () => {
  assert.equal(checkField("A".repeat(80), GOOGLE_LIMITS.shortDescription).ok, true);
  assert.equal(checkField("A".repeat(81), GOOGLE_LIMITS.shortDescription).ok, false);
});

test("validateListing skips BLOCKED_NEEDS_OWNER placeholders and reports violations", () => {
  const listing = {
    name: "Halaa",
    subtitle: "BLOCKED_NEEDS_OWNER",
    promotionalText: "A".repeat(200), // over 170
  };
  const res = validateListing(listing, APPLE_LIMITS);
  assert.equal(res.ok, false);
  assert.equal(res.skipped >= 1, true, "the blocked subtitle must be skipped, not failed");
  assert.ok(res.violations.some((v) => v.field === "promotionalText"));
  assert.ok(!res.violations.some((v) => v.field === "subtitle"));
});

test("validateListing passes a clean listing", () => {
  const res = validateListing({ name: "Halaa", shortDescription: "Smart event management for Saudi Arabia." }, GOOGLE_LIMITS);
  assert.equal(res.ok, true);
  assert.deepEqual(res.violations, []);
});
