import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../..");

describe("Session 5.3 Web: Settings Navigation and Role Cross-links (SET-09)", () => {
  it("HostSettingsPage.js integrates buildDashboardUrl for role-aware back navigation", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "app/[lang]/host/settings/page.js"),
      "utf-8"
    );

    assert.ok(
      content.includes("buildDashboardUrl"),
      "HostSettingsPage must import and use buildDashboardUrl"
    );
  });

  it("AdminSettingsClient.js integrates buildDashboardUrl and does not collapse username", () => {
    const content = fs.readFileSync(
      path.join(
        ROOT,
        "app/[lang]/admin-dash/settings/_components/AdminSettingsClient.js"
      ),
      "utf-8"
    );

    assert.ok(
      content.includes("buildDashboardUrl"),
      "AdminSettingsClient must import and use buildDashboardUrl"
    );
    assert.equal(
      content.includes("username: apiUser?.username || apiUser?.name || \"\""),
      false,
      "AdminSettingsClient must not collapse username to name"
    );
  });
});
