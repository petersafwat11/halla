import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../..");

describe("Session 4.4 Mobile: Marketplace Localization and Navigation (MKT-07, MKT-11)", () => {
  const arLocales = JSON.parse(
    fs.readFileSync(path.join(ROOT, "localization/locales/ar/marketplace.json"), "utf-8")
  );
  const enLocales = JSON.parse(
    fs.readFileSync(path.join(ROOT, "localization/locales/en/marketplace.json"), "utf-8")
  );

  it("ensures mobile marketplace translation files have parity for moderation and feedback keys", () => {
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
      assert.ok(arLocales.vendor?.[key], `Arabic mobile missing vendor.${key}`);
      assert.ok(enLocales.vendor?.[key], `English mobile missing vendor.${key}`);
    }

    assert.ok(arLocales.loading, "Arabic mobile missing 'loading'");
    assert.ok(enLocales.loading, "English mobile missing 'loading'");
    assert.ok(arLocales.cancel, "Arabic mobile missing 'cancel'");
    assert.ok(enLocales.cancel, "English mobile missing 'cancel'");
    assert.ok(arLocales.ok, "Arabic mobile missing 'ok'");
    assert.ok(enLocales.ok, "English mobile missing 'ok'");
    assert.ok(arLocales.errors?.profileNotFoundTitle, "Arabic mobile missing 'profileNotFoundTitle'");
    assert.ok(enLocales.errors?.profileNotFoundTitle, "English mobile missing 'profileNotFoundTitle'");
  });

  it("VendorPublicProfileScreen.js formats location with locale-aware separator", () => {
    const profileFile = path.join(ROOT, "screens/common/VendorPublicProfileScreen.js");
    const content = fs.readFileSync(profileFile, "utf-8");

    assert.ok(
      content.includes('join(isAr ? "، " : ", ")'),
      "VendorPublicProfileScreen.js must use Arabic comma '، ' for AR and English comma ', ' for EN"
    );
  });

  it("Marketplace.js formats location with locale-aware separator", () => {
    const screenFile = path.join(ROOT, "screens/common/Marketplace.js");
    const content = fs.readFileSync(screenFile, "utf-8");

    assert.ok(
      content.includes('join(isAr ? "، " : ", ")'),
      "Marketplace.js must format vendor cards location with locale-aware separator"
    );
  });

  it("VendorPublicProfileScreen.js handles unauthenticated report/block actions with graceful auth prompts", () => {
    const profileFile = path.join(ROOT, "screens/common/VendorPublicProfileScreen.js");
    const content = fs.readFileSync(profileFile, "utf-8");

    assert.ok(
      content.includes("signInToReport"),
      "VendorPublicProfileScreen must show signInToReport alert on 401 when reporting"
    );
    assert.ok(
      content.includes("signInToBlock"),
      "VendorPublicProfileScreen must show signInToBlock alert on 401 when blocking"
    );
  });

  it("AppNavigator.js registers Marketplace and VendorPublicProfile in AuthStack for guest access", () => {
    const appNavFile = path.join(ROOT, "navigation/AppNavigator.js");
    const content = fs.readFileSync(appNavFile, "utf-8");

    assert.ok(
      content.includes('<Stack.Screen name="Marketplace" component={Marketplace} />'),
      "AuthStack must include Marketplace screen"
    );
    assert.ok(
      content.includes('<Stack.Screen name="VendorPublicProfile" component={VendorPublicProfileScreen} />'),
      "AuthStack must include VendorPublicProfile screen"
    );
  });
});
