import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../..");

describe("Session 5.3 Mobile: Destructive Actions, Settings Navigation, and Placeholders (SET-04, SET-06, SET-08, SET-09)", () => {
  it("SET-04: SettingsTabs and VendorSettingsTabs distinguish data deletion policy from destructive account deletion", () => {
    const hostTabsContent = fs.readFileSync(
      path.join(ROOT, "components/settings/SettingsTabs.js"),
      "utf-8"
    );
    const vendorTabsContent = fs.readFileSync(
      path.join(ROOT, "components/vendor/VendorSettingsTabs.js"),
      "utf-8"
    );

    // Deletion policy in tabs must use document icon rather than destructive trash icon
    assert.ok(
      hostTabsContent.includes('icon: "document-text-outline"'),
      "SettingsTabs must use document icon for legal deletion policy"
    );
    assert.ok(
      vendorTabsContent.includes('icon: "document-text-outline"'),
      "VendorSettingsTabs must use document icon for legal deletion policy"
    );
  });

  it("SET-06: VendorSettingsScreen, SettingsScreen, and AdminSettingsScreen use correct logout message", () => {
    const vendorSettings = fs.readFileSync(
      path.join(ROOT, "screens/vendor/VendorSettingsScreen.js"),
      "utf-8"
    );
    const hostSettings = fs.readFileSync(
      path.join(ROOT, "screens/host/SettingsScreen.js"),
      "utf-8"
    );
    const adminSettings = fs.readFileSync(
      path.join(ROOT, "screens/admin/admin-dashboard/AdminSettingsScreen.js"),
      "utf-8"
    );

    // Vendor settings must NOT use settings.saveSuccess on logout
    assert.equal(
      vendorSettings.includes('t("settings.saveSuccess")'),
      false,
      "VendorSettingsScreen must not show 'saveSuccess' toast when logging out"
    );
    assert.ok(
      vendorSettings.includes('logoutSuccess') || vendorSettings.includes('tabs.logout'),
      "VendorSettingsScreen must show logout message toast on logout"
    );
    assert.ok(
      hostSettings.includes('logoutSuccess') || hostSettings.includes('tabs.logout'),
      "SettingsScreen must show logout message toast on logout"
    );
    assert.ok(
      adminSettings.includes('logoutSuccess') || adminSettings.includes('tabs.logout'),
      "AdminSettingsScreen must show logout message toast on logout"
    );
  });

  it("SET-08: AdminNavigator and adminPermissions do not expose placeholder AdminTemplates", () => {
    const adminNav = fs.readFileSync(
      path.join(ROOT, "navigation/AdminNavigator.js"),
      "utf-8"
    );
    const adminPerms = fs.readFileSync(
      path.join(ROOT, "utils/adminPermissions.js"),
      "utf-8"
    );

    assert.equal(
      adminNav.includes('name="AdminTemplates"'),
      false,
      "AdminNavigator must not mount placeholder AdminTemplates route"
    );
    assert.equal(
      adminPerms.includes('label: "Templates"'),
      false,
      "adminPermissions must not expose dead Templates in NAV_ITEMS"
    );
  });
});
