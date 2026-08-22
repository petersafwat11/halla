const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "../../..");

test("Session 2.6 Mobile: Admin Creation Forms & Password/Phone Handling (ADM-10, ADM-11)", () => {
  // 1. AddHostModal.js omits empty password from payload
  const hostModalPath = path.join(
    repoRoot,
    "halaa-mobile/components/admin-dashboard/hosts/AddHostModal.js"
  );
  const hostContent = fs.readFileSync(hostModalPath, "utf-8");

  assert.match(hostContent, /if\s*\(data\.password\s*&&\s*data\.password\.trim\(\)\)/);
  assert.match(hostContent, /payload\.password\s*=\s*data\.password\.trim\(\)/);

  // 2. AddBusinessModal.js allows optional password (auto-generate if omitted)
  const businessModalPath = path.join(
    repoRoot,
    "halaa-mobile/components/admin-dashboard/businesses/AddBusinessModal.js"
  );
  const businessContent = fs.readFileSync(businessModalPath, "utf-8");

  assert.match(businessContent, /if\s*\(values\.password\s*&&\s*values\.password\.trim\(\)\)/);
  assert.match(businessContent, /placeholder=\{\s*cb\(\s*"passwordPlaceholder",\s*"Leave blank to auto-generate"\s*\)\s*\}/);

  // 3. AddModeratorModal.js allows optional password on creation and enforces min 8 chars if provided
  const modModalPath = path.join(
    repoRoot,
    "halaa-mobile/components/admin-dashboard/moderators/AddModeratorModal.js"
  );
  const modContent = fs.readFileSync(modModalPath, "utf-8");

  assert.match(modContent, /if\s*\(!isEdit\s*&&\s*formData\.password\.trim\(\)\s*&&\s*formData\.password\.trim\(\)\.length\s*<\s*8\)/);
  assert.match(modContent, /if\s*\(!isEdit\s*&&\s*formData\.password\s*&&\s*formData\.password\.trim\(\)\)/);
});
