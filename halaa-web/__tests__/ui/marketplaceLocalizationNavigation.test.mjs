import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../..");

describe("Session 4.4 Web: Marketplace Localization, Public States, and Navigation (MKT-07, MKT-11)", () => {
  const arLocales = JSON.parse(
    fs.readFileSync(path.join(ROOT, "localization/locales/ar/marketplace.json"), "utf-8")
  );
  const enLocales = JSON.parse(
    fs.readFileSync(path.join(ROOT, "localization/locales/en/marketplace.json"), "utf-8")
  );

  it("ensures marketplace translation files have complete parity for moderation and feedback keys", () => {
    const requiredVendorKeys = [
      "report",
      "reportVendor",
      "reportReason",
      "rSpam",
      "rImpersonation",
      "rIllegal",
      "rOther",
      "reported",
      "reportedMsg",
      "signInToReport",
      "block",
      "blockVendor",
      "blockConfirm",
      "blocked",
      "blockedMsg",
      "signInToBlock",
    ];

    for (const key of requiredVendorKeys) {
      assert.ok(arLocales.vendor?.[key], `Arabic translation missing vendor.${key}`);
      assert.ok(enLocales.vendor?.[key], `English translation missing vendor.${key}`);
    }

    assert.ok(arLocales.loading, "Arabic translation missing 'loading'");
    assert.ok(enLocales.loading, "English translation missing 'loading'");
    assert.ok(arLocales.cancel, "Arabic translation missing 'cancel'");
    assert.ok(enLocales.cancel, "English translation missing 'cancel'");
    assert.ok(arLocales.ok, "Arabic translation missing 'ok'");
    assert.ok(enLocales.ok, "English translation missing 'ok'");
    assert.ok(arLocales.errors?.profileNotFoundTitle, "Arabic translation missing 'profileNotFoundTitle'");
    assert.ok(enLocales.errors?.profileNotFoundTitle, "English translation missing 'profileNotFoundTitle'");
  });

  it("VendorProfile.jsx formats location with locale-aware separator", () => {
    const vendorProfileFile = path.join(
      ROOT,
      "app/[lang]/market-place/vendors/[vendorId]/VendorProfile.jsx"
    );
    const content = fs.readFileSync(vendorProfileFile, "utf-8");

    assert.ok(
      content.includes('join(rtl ? "، " : ", ")'),
      "VendorProfile.jsx must use Arabic comma '، ' for RTL and English comma ', ' for LTR"
    );
  });

  it("MarketplaceView.jsx formats location with locale-aware separator", () => {
    const marketplaceViewFile = path.join(
      ROOT,
      "app/[lang]/market-place/_components/MarketplaceView.jsx"
    );
    const content = fs.readFileSync(marketplaceViewFile, "utf-8");

    assert.ok(
      content.includes('join(i18n.language === "ar" ? "، " : ", ")'),
      "MarketplaceView.jsx must format vendor card location with locale-aware separator"
    );
  });

  it("ReportVendorButton.jsx uses localized reasons and handles guest unauthenticated state gracefully", () => {
    const reportButtonFile = path.join(
      ROOT,
      "app/[lang]/market-place/vendors/[vendorId]/ReportVendorButton.jsx"
    );
    const content = fs.readFileSync(reportButtonFile, "utf-8");

    assert.ok(
      content.includes("signInToReport"),
      "ReportVendorButton must notify unauthenticated users with signInToReport prompt"
    );
    assert.ok(
      content.includes("signInToBlock"),
      "ReportVendorButton must notify unauthenticated users with signInToBlock prompt"
    );
    assert.ok(
      content.includes("router.replace(`/${lang}/market-place`)"),
      "ReportVendorButton must navigate back to localized marketplace route on block"
    );
  });

  it("not-found.js and error.js use localized bilingual content and locale-aware route links", () => {
    const notFoundFile = path.join(
      ROOT,
      "app/[lang]/market-place/vendors/[vendorId]/not-found.js"
    );
    const notFoundContent = fs.readFileSync(notFoundFile, "utf-8");

    assert.ok(
      notFoundContent.includes('href={`/${isAr ? "ar" : "en"}/market-place`}'),
      "not-found.js must link back to localized marketplace route"
    );

    const errorFile = path.join(
      ROOT,
      "app/[lang]/market-place/vendors/[vendorId]/error.js"
    );
    const errorContent = fs.readFileSync(errorFile, "utf-8");

    assert.ok(
      errorContent.includes('href={`/${isAr ? "ar" : "en"}/market-place`}'),
      "error.js must link back to localized marketplace route"
    );
    assert.ok(
      errorContent.includes("reset"),
      "error.js must provide retry mechanism via reset callback"
    );
  });
});
