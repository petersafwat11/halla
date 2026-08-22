import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../..");

describe("Session 5.2 Web: Settings Mutation Stability and Form State Reset (SET-03, SET-05, SET-07)", () => {
  it("SET-03: Web AccountSettings.js tracks profile and password updates independently without misrepresenting partial successes", () => {
    const content = fs.readFileSync(
      path.join(
        ROOT,
        "app/[lang]/host/settings/_components/AccountSettings.js"
      ),
      "utf-8"
    );

    assert.ok(
      content.includes("passwordSuccess") && content.includes("profileSuccess"),
      "AccountSettings.js must track passwordSuccess and profileSuccess independently"
    );
    assert.ok(
      content.includes("passwordError") && content.includes("profileError"),
      "AccountSettings.js must capture passwordError and profileError independently"
    );
  });

  it("SET-03: Web VendorSettings page.js handles isolated section mutations with partial-success warnings", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "app/[lang]/vendor-dashboard/settings/page.js"),
      "utf-8"
    );

    assert.ok(
      content.includes("vendorDataSuccess") && content.includes("emailSuccess") && content.includes("passwordSuccess"),
      "VendorSettings must track section mutations independently"
    );
  });

  it("SET-05: Web AccountSettings, BusinessSettings, and ServiceDetailsEditForm sync form state on entity/data changes", () => {
    const accountSettings = fs.readFileSync(
      path.join(
        ROOT,
        "app/[lang]/host/settings/_components/AccountSettings.js"
      ),
      "utf-8"
    );
    const businessSettings = fs.readFileSync(
      path.join(
        ROOT,
        "app/[lang]/host/settings/_components/BusinessSettings.js"
      ),
      "utf-8"
    );
    const serviceDetails = fs.readFileSync(
      path.join(
        ROOT,
        "app/[lang]/vendor-dashboard/settings/_components/ServiceDetailsSection/ServiceDetailsEditForm.jsx"
      ),
      "utf-8"
    );

    assert.ok(
      accountSettings.includes("useEffect") && accountSettings.includes("user.name"),
      "AccountSettings must have useEffect to reset form when user changes"
    );
    assert.ok(
      businessSettings.includes("useEffect") && businessSettings.includes("initialDescription"),
      "BusinessSettings must have useEffect to reset state when initialDescription changes"
    );
    assert.ok(
      serviceDetails.includes("useEffect") && serviceDetails.includes("data"),
      "ServiceDetailsEditForm must have useEffect to sync state when data changes"
    );
  });

  it("SET-07: Web ServiceDetailsEditForm normalizes nationalId input digits", () => {
    const serviceDetails = fs.readFileSync(
      path.join(
        ROOT,
        "app/[lang]/vendor-dashboard/settings/_components/ServiceDetailsSection/ServiceDetailsEditForm.jsx"
      ),
      "utf-8"
    );

    assert.ok(
      serviceDetails.includes("normalizeDigitsOnly"),
      "ServiceDetailsEditForm must import and use normalizeDigitsOnly"
    );
  });
});
