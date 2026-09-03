import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hostProfileCompletionSchema } from "@halaa/shared/schemas/auth";
import { LEGAL_CONTACT } from "@halaa/shared/legal/contact";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WEB_ROOT = path.resolve(__dirname, "..", "..");

const read = (...parts) =>
  fs.readFileSync(path.join(WEB_ROOT, ...parts), "utf8");

test("hostProfileCompletionSchema enforces required 'name' and eliminates 'username'", () => {
  const schema = hostProfileCompletionSchema();

  // Valid payload with 'name'
  const valid = schema.safeParse({
    name: "سارة محمد العتيبي",
    email: "sara@example.com",
    password: "Password123",
    passwordConfirm: "Password123",
  });
  assert.equal(valid.success, true);
  if (valid.success) {
    assert.equal(valid.data.name, "سارة محمد العتيبي");
  }

  // Missing 'name' is rejected
  const missingName = schema.safeParse({
    email: "sara@example.com",
    password: "Password123!",
    passwordConfirm: "Password123!",
  });
  assert.equal(missingName.success, false, "Must reject payload missing 'name'");

  // Legacy payload with only 'username' is rejected
  const legacyUsernameOnly = schema.safeParse({
    username: "سارة محمد العتيبي",
    email: "sara@example.com",
    password: "Password123!",
    passwordConfirm: "Password123!",
  });
  assert.equal(legacyUsernameOnly.success, false, "Must reject legacy payload containing only 'username'");
});

test("ContinueSignupForm binds to 'name' and submits 'name' without legacy 'username'", () => {
  const formSource = read(
    "ui",
    "auth",
    "signup",
    "host",
    "continueSignupForm",
    "ContinueSignupForm.js"
  );

  // defaultValues includes name, does not include username
  assert.match(formSource, /defaultValues:\s*\{[\s\S]*?name:\s*"",/);
  assert.doesNotMatch(formSource, /defaultValues:\s*\{[\s\S]*?username:/);

  // InputGroup uses name="name"
  assert.match(formSource, /<InputGroup[^>]*name="name"/);
  assert.doesNotMatch(formSource, /<InputGroup[^>]*name="username"/);

  // onSubmit sends name: formData.name
  assert.match(formSource, /completeProfile\(\s*\{[\s\S]*?name:\s*formData\.name,/);
  assert.doesNotMatch(formSource, /completeProfile\(\s*\{[\s\S]*?username:/);
});

test("WhatsAppContactButton uses canonical shared support without hardcoded numbers", () => {
  const buttonSource = read(
    "ui",
    "commen",
    "whatsappButton",
    "WhatsAppContactButton.jsx"
  );

  assert.ok(
    buttonSource.includes('from "@halaa/shared/support"'),
    "Must import from @halaa/shared/support"
  );
  assert.ok(
    !buttonSource.includes("966552619282"),
    "Must not hardcode phone numbers in component source"
  );
  assert.equal(
    LEGAL_CONTACT.whatsapp.value.replace(/\D/g, ""),
    "966552619282"
  );
});
