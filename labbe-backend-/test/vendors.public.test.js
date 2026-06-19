const test = require("node:test");
const assert = require("node:assert/strict");
const { _private } = require("../src/modules/vendors/vendors.service");

test("localized vendor copy follows requested, alternate, then legacy fallback", () => {
  assert.equal(_private.localizeVendorCopy({ aboutAr: "عربي", aboutEn: "English" }, "en").about, "English");
  assert.equal(_private.localizeVendorCopy({ aboutAr: "عربي" }, "en").about, "عربي");
  assert.equal(_private.localizeVendorCopy({ serviceDescription: "Legacy" }, "ar").about, "Legacy");
});

test("tagline falls back to a bounded about excerpt", () => {
  const copy = _private.localizeVendorCopy({ aboutEn: "A".repeat(300) }, "en");
  assert.equal(copy.tagline.length, 160);
  assert.ok(copy.tagline.endsWith("…"));
});

test("public phone normalizes Saudi numbers for wa.me", () => {
  assert.equal(_private.publicPhone("050 123 4567"), "966501234567");
});

test("external URLs reject unsafe protocols", () => {
  assert.equal(_private.cleanExternalUrl("javascript:alert(1)"), null);
  assert.match(_private.cleanExternalUrl("https://example.com"), /^https:\/\/example\.com/);
});

test("public vendor projection excludes private identity and verification fields", () => {
  for (const field of ["ownerFullName", "nationalId", "commercialRecord", "profileFile", "adminNotes", "rejectionReason"]) {
    assert.equal(_private.PUBLIC_VENDOR_SELECT.includes(field), false, `${field} must remain private`);
  }
});
