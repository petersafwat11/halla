import { test } from "node:test";
import assert from "node:assert/strict";

import {
  accountSettingsSchema,
  mobileAccountSettingsSchema,
} from "../src/schemas/settings.js";

// ============================================================
// SET-01 — Identity single field: name is the sole user identity
// field. Schemas accept name, validate its bounds, and do not
// retain user-domain username.
// ============================================================

test("SET-01: web accountSettingsSchema accepts name as single identity field", () => {
  const schema = accountSettingsSchema((k) => k);
  const result = schema.safeParse({
    name: "Ahmed Al-Saud",
    email: "ahmed@example.com",
    currentPassword: "",
    password: "",
    confirmPassword: "",
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.name, "Ahmed Al-Saud");
    assert.equal(result.data.username, undefined);
  }
});

test("SET-01: editing full name updates name cleanly", () => {
  const schema = accountSettingsSchema((k) => k);

  const result = schema.safeParse({
    name: "New Full Name",
    email: "u@example.com",
  });
  assert.equal(result.success, true);
  assert.equal(result.data.name, "New Full Name");
  assert.equal(result.data.username, undefined);
});

test("SET-01: web accountSettingsSchema rejects too-short/too-long name", () => {
  const schema = accountSettingsSchema((k) => k);

  const shortName = schema.safeParse({
    name: "A",
    email: "v@example.com",
  });
  assert.equal(shortName.success, false);
  const shortErr = shortName.error.issues.find((i) => i.path.includes("name"));
  assert.ok(shortErr, "short name must report a field error on name");

  const longName = schema.safeParse({
    name: "x".repeat(101),
    email: "v@example.com",
  });
  assert.equal(longName.success, false);
  const longErr = longName.error.issues.find((i) => i.path.includes("name"));
  assert.ok(longErr, "overlong name must report a field error on name");
});

test("SET-01: mobile accountSettingsSchema accepts name as single identity field", () => {
  const result = mobileAccountSettingsSchema().safeParse({
    name: "Ahmed Al-Saud",
    email: "ahmed@example.com",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.name, "Ahmed Al-Saud");
    assert.equal(result.data.username, undefined);
  }
});

test("SET-01: mobile accountSettingsSchema rejects invalid name lengths", () => {
  const short = mobileAccountSettingsSchema().safeParse({
    name: "A",
    email: "a@example.com",
  });
  assert.equal(short.success, false);
  assert.ok(
    short.error.issues.some((i) => i.path.includes("name")),
    "short name must error on the name path"
  );

  const long = mobileAccountSettingsSchema().safeParse({
    name: "x".repeat(101),
    email: "a@example.com",
  });
  assert.equal(long.success, false);
  assert.ok(
    long.error.issues.some((i) => i.path.includes("name")),
    "overlong name must error on the name path"
  );
});
