import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ENDPOINTS } from "../../config/api.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../..");

describe("Session 4.3 Mobile: Marketplace Analytics Tracking (MKT-10)", () => {
  it("ENDPOINTS defines VENDORS.TRACK_ANALYTICS and SERVICES.TRACK_ANALYTICS", () => {
    assert.equal(ENDPOINTS.VENDORS.TRACK_ANALYTICS, "/vendors/analytics/track");
    assert.equal(ENDPOINTS.SERVICES.TRACK_ANALYTICS, "/services/analytics/track");
  });

  it("hooks/marketplace/mutations.js exports useTrackMarketplaceAnalytics using ENDPOINTS.VENDORS.TRACK_ANALYTICS", () => {
    const hookFile = path.join(ROOT, "hooks/marketplace/mutations.js");
    const content = fs.readFileSync(hookFile, "utf-8");

    assert.ok(content.includes("useTrackMarketplaceAnalytics"), "Exports useTrackMarketplaceAnalytics");
    assert.ok(content.includes("ENDPOINTS.VENDORS.TRACK_ANALYTICS"), "Targets ENDPOINTS.VENDORS.TRACK_ANALYTICS");
    assert.ok(content.includes("eventType"), "Passes eventType");
    assert.ok(content.includes("targetType"), "Passes targetType");
    assert.ok(content.includes("targetId"), "Passes targetId");
  });

  it("VendorPublicProfileScreen.js tracks vendor_view on mount and contact_click on actions", () => {
    const screenFile = path.join(ROOT, "screens/common/VendorPublicProfileScreen.js");
    const content = fs.readFileSync(screenFile, "utf-8");

    assert.ok(content.includes("useTrackMarketplaceAnalytics"), "Imports useTrackMarketplaceAnalytics");
    assert.ok(content.includes('eventType: "vendor_view"'), "Tracks vendor_view on mount");
    assert.ok(content.includes('eventType: "contact_click"'), "Tracks contact_click on actions");
    assert.ok(content.includes('trackContact("phone")'), "Tracks phone call click");
    assert.ok(content.includes('trackContact("email"'), "Tracks email contact click");
    assert.ok(content.includes('trackContact("website"'), "Tracks website contact click");
    assert.ok(content.includes('trackContact("social"'), "Tracks social links contact click");
    assert.ok(content.includes('openWhatsApp(buildVendorContactMessage'), "Passes serviceId to track service request");
  });
});
