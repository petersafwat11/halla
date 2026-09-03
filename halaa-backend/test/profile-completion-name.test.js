const test = require("node:test");
const assert = require("node:assert/strict");

const { completeProfileSchema } = require("../src/modules/auth/auth.validation");

test("profile completion accepts Arabic full name via required field 'name'", () => {
  const result = completeProfileSchema.safeParse({
    name: "سارة محمد العتيبي",
    email: "sara@example.com",
    password: "simple123",
    passwordConfirm: "simple123",
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.name, "سارة محمد العتيبي");
  }
});

test("profile completion accepts English full name via required field 'name'", () => {
  const result = completeProfileSchema.safeParse({
    name: "Sara Al-Otaibi",
    email: "sara@example.com",
    password: "simple123",
    passwordConfirm: "simple123",
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.name, "Sara Al-Otaibi");
  }
});

test("profile completion REJECTS requests missing 'name' (no backward-compatibility username fallback)", () => {
  // Only username provided
  const resultUsernameOnly = completeProfileSchema.safeParse({
    username: "سارة محمد العتيبي",
    email: "sara@example.com",
    password: "simple123",
    passwordConfirm: "simple123",
  });
  assert.equal(resultUsernameOnly.success, false, "Must reject request when 'name' is missing");

  // No name or username
  const resultNoName = completeProfileSchema.safeParse({
    email: "sara@example.com",
    password: "simple123",
    passwordConfirm: "simple123",
  });
  assert.equal(resultNoName.success, false, "Must reject request without name");
});

test("profile completion rejects name shorter than 2 characters", () => {
  const result = completeProfileSchema.safeParse({
    name: "A",
    password: "simple123",
    passwordConfirm: "simple123",
  });
  assert.equal(result.success, false);
});

test("profile completion rejects name longer than 100 characters", () => {
  const result = completeProfileSchema.safeParse({
    name: "A".repeat(101),
    password: "simple123",
    passwordConfirm: "simple123",
  });
  assert.equal(result.success, false);
});
