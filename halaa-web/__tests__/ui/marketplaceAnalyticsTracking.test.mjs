import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { API_PATHS } from "@halaa/shared/api/paths";
import { marketplaceTrackSchema } from "@halaa/shared/schemas/vendor";

describe("Session 4.3 Web: Marketplace Analytics Tracking (MKT-10)", () => {
  it("API_PATHS defines vendors.trackAnalytics and vendorServices.trackAnalytics", () => {
    assert.equal(API_PATHS.vendors.trackAnalytics, "/vendors/analytics/track");
    assert.equal(API_PATHS.vendorServices.trackAnalytics, "/services/analytics/track");
  });

  it("useTrackMarketplaceAnalytics mutation hook targets canonical tracking path", () => {
    const hookPath = path.join(process.cwd(), "hooks/vendors/mutations.js");
    const src = fs.readFileSync(hookPath, "utf-8");
    assert.ok(src.includes("useTrackMarketplaceAnalytics"), "Exports useTrackMarketplaceAnalytics");
    assert.ok(src.includes("API_PATHS.vendors.trackAnalytics"), "Calls API_PATHS.vendors.trackAnalytics");
    assert.ok(src.includes("eventType"), "Passes eventType");
    assert.ok(src.includes("targetType"), "Passes targetType");
    assert.ok(src.includes("targetId"), "Passes targetId");
  });

  it("VendorProfile.jsx wires vendor_view on mount and contact_click on interaction buttons", () => {
    const profilePath = path.join(
      process.cwd(),
      "app/[lang]/market-place/vendors/[vendorId]/VendorProfile.jsx"
    );
    const src = fs.readFileSync(profilePath, "utf-8");
    assert.ok(src.includes("useTrackMarketplaceAnalytics"), "Imports useTrackMarketplaceAnalytics");
    assert.ok(src.includes('eventType: "vendor_view"'), "Tracks vendor_view on mount");
    assert.ok(src.includes('eventType: "contact_click"'), "Tracks contact_click on interaction");
    assert.ok(src.includes('handleContactClick("whatsapp")'), "Tracks WhatsApp contact click");
    assert.ok(src.includes('handleContactClick("phone")'), "Tracks Phone contact click");
    assert.ok(src.includes('handleContactClick("email")'), "Tracks Email contact click");
    assert.ok(src.includes('handleContactClick("service_request"'), "Tracks Service Request contact click");
  });

  it("marketplaceTrackSchema validates web tracking payloads", () => {
    const valid = {
      eventType: "contact_click",
      targetType: "vendor",
      targetId: "507f1f77bcf86cd799439011",
      contactMethod: "whatsapp",
      metadata: { vendorId: "507f1f77bcf86cd799439011" },
    };
    const res = marketplaceTrackSchema.safeParse(valid);
    assert.equal(res.success, true);
  });
});
