import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, "..", "..");
const read = (...parts) =>
  fs.readFileSync(path.join(WEB_ROOT, ...parts), "utf8");

// ============================================================
// SET-01 — Web identity fields: full name must bind to `name`,
// username must have its own field, payload sends both.
// ============================================================

test("SET-01: AccountSettings binds Full Name to the name field, not username", () => {
  const source = read(
    "app",
    "[lang]",
    "host",
    "settings",
    "_components",
    "AccountSettings.js"
  );

  // A dedicated `name` input exists and is labelled as the full name.
  const nameInput = source.match(/<InputGroup\s+name="name"[\s\S]*?\/>/);
  assert.ok(nameInput, "AccountSettings must render an InputGroup bound to name");
  assert.match(
    nameInput[0],
    /full_name/,
    "the name input must use the full_name label"
  );

  // The username field keeps its own distinct binding + label.
  const usernameInput = source.match(/<InputGroup\s+name="username"[\s\S]*?\/>/);
  assert.ok(usernameInput, "username must remain its own field");
  assert.doesNotMatch(
    usernameInput[0],
    /full_name/,
    "the username input must NOT be labelled full_name"
  );
});

test("SET-01: AccountSettings submits both name and username in the profile payload", () => {
  const source = read(
    "app",
    "[lang]",
    "host",
    "settings",
    "_components",
    "AccountSettings.js"
  );

  assert.match(
    source,
    /profileData\s*=\s*\{\s*name:\s*formData\.name,\s*username:\s*formData\.username,\s*email:\s*formData\.email,?\s*\}/,
    "profile update payload must carry name, username, and email"
  );
  assert.match(
    source,
    /formData\.name !== \(user\.name \|\| ""\)/,
    "change detection must include the name field"
  );
});

test("SET-01: settings page passes name and username without collapsing them", () => {
  const source = read("app", "[lang]", "host", "settings", "page.js");

  assert.match(source, /name:\s*user\?\.name\s*\|\|\s*""/);
  assert.doesNotMatch(
    source,
    /username:\s*user\?\.username\s*\|\|\s*user\?\.name/,
    "page must not collapse username into the user's name"
  );
});

test("SET-01: shared web account settings form defaults include name", () => {
  const source = read(
    "app",
    "[lang]",
    "host",
    "settings",
    "_components",
    "AccountSettings.js"
  );
  assert.match(
    source,
    /defaultValues:\s*\{[\s\S]*?name:\s*user\.name\s*\|\|\s*""/,
    "form defaults must seed the name field from the user"
  );
});

// ============================================================
// SET-02 — Verification UI is derived from emailVerified and
// success updates canonical user state everywhere.
// ============================================================

test("SET-02: verification offer is gated on emailVerified with a verified badge", () => {
  const source = read(
    "app",
    "[lang]",
    "host",
    "settings",
    "_components",
    "AccountSettings.js"
  );

  // Send-code button only when not yet verified.
  const sendButton = source.match(
    /\{!\s*user\.emailVerified\s*&&\s*!showVerificationInput && \([\s\S]*?<Button[\s\S]*?\/>\s*\)\}/
  );
  assert.ok(sendButton, "send-verification button block must exist");
  assert.match(
    sendButton[0],
    /!user\.emailVerified/,
    "verify button must be hidden for already-verified users"
  );

  // Verified badge rendered from the same flag.
  assert.match(
    source,
    /\{user\.emailVerified && \([\s\S]*?email_verified/,
    "verified badge must show when user.emailVerified is true"
  );
});

test("SET-02: verifyEmail mutation syncs the persisted auth store user", () => {
  const source = read("hooks", "auth", "mutations.js");

  const verifyBlock = source.match(/verifyEmail:\s*\{[\s\S]*?\n    \},/);
  assert.ok(verifyBlock, "verifyEmail mutation config must exist");
  assert.match(
    verifyBlock[0],
    /updateUser/,
    "onSuccess must merge the verified user into the persisted auth store"
  );
  assert.match(
    verifyBlock[0],
    /emailVerified:\s*true/,
    "store update must flip emailVerified immediately"
  );
  assert.match(
    verifyBlock[0],
    /usersKeys\.myProfile\(\)/,
    "canonical profile query must be invalidated"
  );
});
