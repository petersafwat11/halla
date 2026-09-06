const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { resolveAdminVendor, vendorApplicationStatus, isVendorDocument } = require("../../utils/adminVendorPresentation");

test("admin vendor details unwrap query payloads and use application status rather than account status", () => {
  const vendor = { id: "vendor-id", status: "active", vendorData: { vendorStatus: "pending" } };
  for (const payload of [vendor, { vendor }, { data: { vendor } }, { data: vendor }]) {
    assert.equal(resolveAdminVendor(payload), vendor);
    assert.equal(vendorApplicationStatus(resolveAdminVendor(payload)), "pending");
  }
  assert.equal(resolveAdminVendor(null), null);
});

test("signed PDF/Word files open as documents rather than broken images", () => {
  for (const extension of ["pdf", "doc", "docx", "PDF"]) assert.equal(isVendorDocument(`https://example.com/file.${extension}?signature=123`), true);
  assert.equal(isVendorDocument("https://example.com/file.jpg?signature=123"), false);
});

test("admin mobile application sections contain every previously missing field and readable values", () => {
  const read = (file) => fs.readFileSync(path.join(__dirname, "../..", file), "utf8");
  const screen = read("screens/admin/admin-dashboard/VendorDetailsScreen.js");
  for (const field of ["taglineAr", "taglineEn", "aboutAr", "aboutEn", "districtNames", "preferredLanguage", "adminNotes", "rejectionReason", "approvedAt", "rejectedAt", "linkedin", "youtube", "whatsapp", "profileFile", "nationalIdImage", "commercialRecordImage", "pricePackages", "portfolioImages", "businessLogo"]) assert.ok(screen.includes(field), field);
  assert.ok(screen.includes("<BaseInfoRow {...props} multiline"));
  assert.ok(!screen.includes("halaa-backendproduction.up.railway.app"));
  for (const language of ["ar", "en"]) {
    const labels = JSON.parse(read(`localization/locales/${language}/admin.json`)).vendorDetails;
    for (const key of ["taglineAr", "taglineEn", "aboutAr", "aboutEn", "preferredLanguage", "reviewTitle", "openFailed"]) assert.ok(labels[key], `${language}.${key}`);
  }
});
