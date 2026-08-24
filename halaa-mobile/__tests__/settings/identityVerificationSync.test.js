const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const MOBILE_ROOT = path.resolve(__dirname, "..", "..");
const read = (...parts) =>
  fs.readFileSync(path.join(MOBILE_ROOT, ...parts), "utf8");

const {
  mobileAccountSettingsSchema,
} = require("../../../shared/src/schemas/settings.js");

// Resolve either export shape (zod object or factory returning one).
const schema =
  typeof mobileAccountSettingsSchema === "function"
    ? mobileAccountSettingsSchema()
    : mobileAccountSettingsSchema;

// ============================================================
// SET-01 — Mobile identity fields: full name binds to `name`,
// username keeps its own field and label, payload sends both.
// ============================================================

test("SET-01: mobile AccountSettings renders a distinct name field labelled as full name", () => {
  const source = read("components", "settings", "AccountSettings.js");

  const nameInput = source.match(/<TextInput\s+name="name"[\s\S]*?\/>/);
  assert.ok(nameInput, "AccountSettings must render a TextInput bound to name");
  assert.match(
    nameInput[0],
    /account\.fullName/,
    "the name input must use the fullName label"
  );

  const usernameInput = source.match(/<TextInput\s+name="username"[\s\S]*?\/>/);
  assert.ok(usernameInput, "username must remain its own field");
  assert.doesNotMatch(
    usernameInput[0],
    /account\.fullName/,
    "the username input must NOT use the fullName label"
  );
});

test("SET-01: mobile AccountSettings submits name alongside username and email", () => {
  const source = read("components", "settings", "AccountSettings.js");

  assert.match(
    source,
    /profileData\s*=\s*\{\s*name:\s*data\.name,\s*username:\s*data\.username,\s*email:\s*data\.email,?\s*\}/,
    "mobile profile payload must include name, username, email"
  );
  assert.match(
    source,
    /defaultValues:\s*\{[\s\S]*?name:\s*user\?\.name\s*\|\|\s*""/,
    "form defaults must seed the name field"
  );
});

test("SET-01: mobile schema accepts the full settings form with name", () => {
  const result = schema.safeParse({
    name: "Ahmed Al-Saud",
    username: "ahmed_s",
    email: "ahmed@example.com",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  assert.equal(result.success, true);
});

// ============================================================
// SET-02 — Mobile verification success must update the persisted
// auth-store user AND invalidate the canonical profile query.
// ============================================================

test("SET-02: a canonical useVerifyEmail mutation updates auth store + profile cache", () => {
  const mutations = read("hooks", "users", "mutations.js");

  assert.match(
    mutations,
    /export function useVerifyEmail\(\)/,
    "users mutations must expose useVerifyEmail"
  );

  const hookBody = mutations.match(
    /export function useVerifyEmail\(\)\s*\{[\s\S]*?\n\}/
  );
  assert.ok(hookBody, "useVerifyEmail body must be readable");

  assert.match(
    hookBody[0],
    /settingsApi\.verifyEmail/,
    "useVerifyEmail must call the settings API"
  );
  assert.match(
    hookBody[0],
    /emailVerified:\s*true/,
    "on success the user snapshot must flip emailVerified"
  );
  assert.match(
    hookBody[0],
    /saveUserShadow|setUser/,
    "the persisted user shadow/store must be updated on success"
  );
  assert.match(
    hookBody[0],
    /usersKeys\.profile\(\)/,
    "canonical profile query key must be invalidated"
  );
});

test("SET-02: EmailVerificationSection consumes useVerifyEmail instead of raw API", () => {
  const section = read(
    "components",
    "settings",
    "_components",
    "EmailVerificationSection.js"
  );

  assert.match(section, /useVerifyEmail/, "section must use the mutation hook");
  assert.doesNotMatch(
    section,
    /settingsApi\.verifyEmail/,
    "raw API call must be replaced by the canonical mutation"
  );
});
