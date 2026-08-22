import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../..");

describe("Session 5.2 Mobile: Settings Mutation Stability and Form State Reset (SET-03, SET-05, SET-07)", () => {
  it("SET-03: Mobile AccountSettings.js tracks profile and password updates independently without misrepresenting partial successes", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "components/settings/AccountSettings.js"),
      "utf-8"
    );

    assert.ok(
      content.includes("profileSuccess") && content.includes("passwordSuccess"),
      "AccountSettings.js must track profileSuccess and passwordSuccess independently"
    );
    assert.ok(
      content.includes("profileError") && content.includes("passwordError"),
      "AccountSettings.js must capture profileError and passwordError independently"
    );
  });

  it("SET-05: Mobile AccountSettings and BusinessSettings sync form state on entity/user changes", () => {
    const accountSettings = fs.readFileSync(
      path.join(ROOT, "components/settings/AccountSettings.js"),
      "utf-8"
    );
    const businessSettings = fs.readFileSync(
      path.join(ROOT, "components/settings/BusinessSettings.js"),
      "utf-8"
    );

    assert.ok(
      accountSettings.includes("useEffect") && accountSettings.includes("user?.name"),
      "AccountSettings must have useEffect to reset form when user changes"
    );
    assert.ok(
      businessSettings.includes("useEffect") && businessSettings.includes("initialDescription"),
      "BusinessSettings must have useEffect to reset state when initialDescription changes"
    );
  });

  it("SET-05: Mobile LocationSelector cascading state machine resets downstream city and districts on parent changes", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "components/commen/LocationSelector.js"),
      "utf-8"
    );

    assert.ok(
      content.includes("handleRegionChange") &&
        content.includes("setValue(`${basePath}.cityId`, undefined)") &&
        content.includes("setValue(`${basePath}.districtIds`, [])"),
      "LocationSelector must clear cityId and districtIds when region changes"
    );
    assert.ok(
      content.includes("handleCityChange") &&
        content.includes("setValue(`${basePath}.districtIds`, [])"),
      "LocationSelector must clear districtIds when city changes"
    );
  });
});
