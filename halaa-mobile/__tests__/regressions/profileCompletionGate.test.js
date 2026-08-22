import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mobileRoot = path.resolve(__dirname, "../..");

test("AUTH-01: AppNavigator implements the profile-completion gate", () => {
  const navSource = fs.readFileSync(path.join(mobileRoot, "navigation/AppNavigator.js"), "utf8");

  // Asserts CompleteProfileStack exists and imports CompleteProfileScreen
  assert.ok(
    navSource.includes("CompleteProfileScreen"),
    "AppNavigator must import CompleteProfileScreen"
  );
  assert.ok(
    navSource.includes("function CompleteProfileStack()"),
    "AppNavigator must define CompleteProfileStack"
  );

  // Asserts gate condition logic
  assert.ok(
    navSource.includes('role === "host" && user?.roleData?.profileCompleted === false'),
    "AppNavigator must gate strictly on role === 'host' && user?.roleData?.profileCompleted === false"
  );

  // Asserts mustChangePassword takes precedence before profile gate
  const passwordIndex = navSource.indexOf("user?.mustChangePassword === true");
  const profileIndex = navSource.indexOf('user?.roleData?.profileCompleted === false');
  const roleSwitchIndex = navSource.indexOf("switch (role)");

  assert.ok(passwordIndex !== -1, "mustChangePassword check exists");
  assert.ok(profileIndex !== -1, "profileCompleted check exists");
  assert.ok(roleSwitchIndex !== -1, "switch (role) exists");

  assert.ok(
    passwordIndex < profileIndex,
    "mustChangePassword gate must precede profileCompleted gate"
  );
  assert.ok(
    profileIndex < roleSwitchIndex,
    "profileCompleted gate must precede role switch"
  );
});

test("AUTH-01: CompleteProfileScreen contains SafeAreaView, TopBar, and logout affordance", () => {
  const screenSource = fs.readFileSync(
    path.join(mobileRoot, "screens/auth/CompleteProfileScreen.js"),
    "utf8"
  );

  assert.ok(screenSource.includes("CompleteProfileForm"), "Must render CompleteProfileForm");
  assert.ok(screenSource.includes("logout"), "Must include logout action");
  assert.ok(screenSource.includes("SafeAreaView"), "Must wrap in SafeAreaView");
  assert.ok(screenSource.includes("TopBar"), "Must render TopBar");
  assert.ok(screenSource.includes("rightContent="), "TopBar must receive rightContent prop for logout button");
});

test("AUTH-01: auth API completeProfile routes through apiFetch (auto-refresh and 401 retry)", () => {
  const apiSource = fs.readFileSync(
    path.join(mobileRoot, "hooks/auth/_api.js"),
    "utf8"
  );

  // completeProfile must call apiFetch instead of raw patchJson
  const completeProfileSnippet = apiSource.slice(
    apiSource.indexOf("export const completeProfile =")
  );
  assert.ok(
    completeProfileSnippet.includes("apiFetch("),
    "completeProfile in _api.js must route through apiFetch"
  );
});

test("AUTH-01: authStore preserves profileCompleted and delegates token refresh to apiFetch", () => {
  const storeSource = fs.readFileSync(
    path.join(mobileRoot, "stores/authStore.js"),
    "utf8"
  );

  assert.ok(
    storeSource.includes("verifySignupOTPAPI"),
    "verifySignupOTP exists"
  );
  assert.ok(
    storeSource.includes("profileCompleted !== undefined"),
    "store actions preserve profileCompleted from backend payloads"
  );

  // completeProfile in store does not require token to be non-null up-front
  const completeProfileInStore = storeSource.slice(
    storeSource.indexOf("completeProfile: async")
  );
  assert.ok(
    !completeProfileInStore.slice(0, 150).includes('if (!token) return'),
    "store.completeProfile must not throw early on null in-memory token"
  );
});
