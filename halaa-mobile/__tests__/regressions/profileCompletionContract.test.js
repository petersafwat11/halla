const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const MOBILE_ROOT = path.resolve(__dirname, "..", "..");
const read = (...parts) =>
  fs.readFileSync(path.join(MOBILE_ROOT, ...parts), "utf8");

test("CompleteProfileForm contains no user-facing username input or validation copy", () => {
  const formSource = read("components", "auth", "CompleteProfileForm.js");

  // Form uses fullName, email, password, confirmPassword
  assert.ok(
    formSource.includes('name="fullName"'),
    "CompleteProfileForm must use fullName input"
  );
  assert.ok(
    !formSource.includes('name="username"'),
    "CompleteProfileForm must not render a username input"
  );
  assert.ok(
    !formSource.includes("usernameRules"),
    "CompleteProfileForm must not display username rules"
  );
});

test("auth API completeProfile sends only 'name' without legacy 'username'", () => {
  const apiSource = read("hooks", "auth", "_api.js");
  const completeProfileSnippet = apiSource.slice(
    apiSource.indexOf("export const completeProfile =")
  );

  assert.ok(
    completeProfileSnippet.includes("name"),
    "_api.js completeProfile must accept and send name"
  );
  assert.ok(
    !completeProfileSnippet.includes("username"),
    "_api.js completeProfile must have zero backward-compatibility username references"
  );
});

test("authStore completeProfile sends only 'name: fullName' without 'username'", () => {
  const storeSource = read("stores", "authStore.js");
  const completeProfileSnippet = storeSource.slice(
    storeSource.indexOf("completeProfile: async")
  );

  assert.ok(
    completeProfileSnippet.includes("name: fullName"),
    "authStore.completeProfile must map fullName to name"
  );
  assert.ok(
    !completeProfileSnippet.includes("username"),
    "authStore.completeProfile must not send legacy username"
  );
});

test("HomeScreen greeting does not fallback to legacy username", () => {
  const homeSource = read("screens", "host", "HomeScreen.js");

  assert.ok(
    homeSource.includes('user?.name || t("guest")'),
    "HomeScreen greeting must use user?.name directly without username fallback"
  );
  assert.ok(
    !homeSource.includes("user?.username"),
    "HomeScreen must not reference user?.username"
  );
});
