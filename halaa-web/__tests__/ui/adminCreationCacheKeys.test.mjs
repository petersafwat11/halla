import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../..");

describe("Session 2.6 Web: Admin Creation Forms, Phone/Password, and Cache Keys (ADM-09, ADM-10, ADM-11, ADM-12)", () => {
  it("manage-plans page.js SSR prefetch key matches useAdminPlans queryKey identically", () => {
    const pagePath = path.join(
      repoRoot,
      "halaa-web/app/[lang]/admin-dash/manage-plans/page.js"
    );
    const keysPath = path.join(
      repoRoot,
      "halaa-web/hooks/admin/keys.js"
    );
    const pageContent = fs.readFileSync(pagePath, "utf-8");
    const keysContent = fs.readFileSync(keysPath, "utf-8");

    // Pre-fetch must use exact queryKey matching useAdminPlans client key: adminKeys.plans({})
    assert.match(pageContent, /queryKey:\s*adminKeys\.plans\(\{\}\)/);
    assert.match(keysContent, /plans:\s*\(filters\s*=\s*\{\}\)\s*=>/);
  });

  it("AddHostPopup.jsx omits empty password from creation payload", () => {
    const popupPath = path.join(
      repoRoot,
      "halaa-web/app/[lang]/admin-dash/hosts/_components/AddHostPopup.jsx"
    );
    const content = fs.readFileSync(popupPath, "utf-8");

    assert.match(content, /if\s*\(!payload\.password\)\s*delete\s*payload\.password/);
  });

  it("AddModeratorPopup.jsx and EditModeratorPopup.jsx use toE164 phone normalization without prepend bugs", () => {
    const addPath = path.join(
      repoRoot,
      "halaa-web/app/[lang]/admin-dash/moderators/_components/AddModeratorPopup.jsx"
    );
    const editPath = path.join(
      repoRoot,
      "halaa-web/app/[lang]/admin-dash/moderators/_components/EditModeratorPopup.jsx"
    );
    const addContent = fs.readFileSync(addPath, "utf-8");
    const editContent = fs.readFileSync(editPath, "utf-8");

    assert.match(addContent, /import\s*\{\s*toE164\s*\}\s*from\s*["']@halaa\/shared\/utils\/phone["']/);
    assert.match(addContent, /phoneNumber:\s*toE164\(data\.phoneNumber\)/);
    assert.doesNotMatch(addContent, /data\.phoneNumber\.startsWith\("\+966"\)/);

    assert.match(editContent, /import\s*\{\s*toE164\s*\}\s*from\s*["']@halaa\/shared\/utils\/phone["']/);
    assert.match(editContent, /phoneNumber:\s*toE164\(formData\.phoneNumber\)/);
    assert.doesNotMatch(editContent, /rawPhone\.replace\(\/\^\\\+966\/,/);
  });

  it("AddBusinessPopup.jsx normalizes phone and treats password as optional", () => {
    const popupPath = path.join(
      repoRoot,
      "halaa-web/app/[lang]/admin-dash/businesses/_components/AddBusinessPopup.jsx"
    );
    const content = fs.readFileSync(popupPath, "utf-8");

    assert.match(content, /toE164\(values\.phoneNumber\)/);
    assert.match(content, /if\s*\(values\.password\s*&&\s*values\.password\.trim\(\)\)/);
  });
});
