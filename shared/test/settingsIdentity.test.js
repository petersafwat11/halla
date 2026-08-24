import { test } from "node:test";
import assert from "node:assert/strict";

import {
  accountSettingsSchema,
  mobileAccountSettingsSchema,
} from "../src/schemas/settings.js";

// ============================================================
// SET-01 — Identity fields: name vs username must be distinct,
// validated independently, and accepted by both client schemas.
// ============================================================

test("SET-01: web accountSettingsSchema accepts distinct name and username", () => {
  const schema = accountSettingsSchema((k) => k);
  const result = schema.safeParse({
    name: "Ahmed Al-Saud",
    username: "ahmed_s",
    email: "ahmed@example.com",
    currentPassword: "",
    password: "",
    confirmPassword: "",
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.name, "Ahmed Al-Saud");
    assert.equal(result.data.username, "ahmed_s");
  }
});

test("SET-01: editing full name does not alter username and vice versa", () => {
  const schema = accountSettingsSchema((k) => k);

  const nameOnly = schema.safeParse({
    name: "New Full Name",
    username: "unchanged_user",
    email: "u@example.com",
  });
  assert.equal(nameOnly.success, true);
  assert.equal(nameOnly.data.username, "unchanged_user");
  assert.equal(nameOnly.data.name, "New Full Name");

  const usernameOnly = schema.safeParse({
    name: "Stable Name",
    username: "renamed_user",
    email: "u@example.com",
  });
  assert.equal(usernameOnly.success, true);
  assert.equal(usernameOnly.data.name, "Stable Name");
  assert.equal(usernameOnly.data.username, "renamed_user");
});

test("SET-01: web accountSettingsSchema rejects too-short/too-long name", () => {
  const schema = accountSettingsSchema((k) => k);

  const shortName = schema.safeParse({
    name: "A",
    username: "valid_user",
    email: "v@example.com",
  });
  assert.equal(shortName.success, false);
  const shortErr = shortName.error.issues.find((i) => i.path.includes("name"));
  assert.ok(shortErr, "short name must report a field error on name");

  const longName = schema.safeParse({
    name: "x".repeat(101),
    username: "valid_user",
    email: "v@example.com",
  });
  assert.equal(longName.success, false);
  const longErr = longName.error.issues.find((i) => i.path.includes("name"));
  assert.ok(longErr, "overlong name must report a field error on name");
});

test("SET-01: mobile accountSettingsSchema accepts distinct name and username", () => {
  const result = mobileAccountSettingsSchema().safeParse({
    name: "Ahmed Al-Saud",
    username: "ahmed_s",
    email: "ahmed@example.com",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.name, "Ahmed Al-Saud");
    assert.equal(result.data.username, "ahmed_s");
  }
});

test("SET-01: mobile accountSettingsSchema rejects invalid name lengths", () => {
  const short = mobileAccountSettingsSchema().safeParse({
    name: "A",
    username: "ahmed_s",
    email: "a@example.com",
  });
  assert.equal(short.success, false);
  assert.ok(
    short.error.issues.some((i) => i.path.includes("name")),
    "short name must error on the name path"
  );

  const long = mobileAccountSettingsSchema().safeParse({
    name: "x".repeat(101),
    username: "ahmed_s",
    email: "a@example.com",
  });
  assert.equal(long.success, false);
  assert.ok(
    long.error.issues.some((i) => i.path.includes("name")),
    "overlong name must error on the name path"
  );
});
