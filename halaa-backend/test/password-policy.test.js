const test = require("node:test");
const assert = require("node:assert/strict");

const { completeProfileSchema } = require("../src/modules/auth/auth.validation");
const { updatePasswordSchema } = require("../src/modules/users/users.validation");

test("profile completion accepts a simple lowercase alphanumeric password", () => {
  const result = completeProfileSchema.safeParse({
    password: "simple123",
    passwordConfirm: "simple123",
  });
  assert.equal(result.success, true);
});

test("profile completion rejects symbols", () => {
  const result = completeProfileSchema.safeParse({
    password: "Simple123!",
    passwordConfirm: "Simple123!",
  });
  assert.equal(result.success, false);
});

test("profile completion requires both a letter and a number", () => {
  assert.equal(
    completeProfileSchema.safeParse({
      password: "lettersOnly",
      passwordConfirm: "lettersOnly",
    }).success,
    false
  );
  assert.equal(
    completeProfileSchema.safeParse({
      password: "12345678",
      passwordConfirm: "12345678",
    }).success,
    false
  );
});

test("password updates use the same policy", () => {
  assert.equal(
    updatePasswordSchema.safeParse({
      currentPassword: "old-password",
      newPassword: "updated123",
      passwordConfirm: "updated123",
    }).success,
    true
  );
  assert.equal(
    updatePasswordSchema.safeParse({
      currentPassword: "old-password",
      newPassword: "Updated123!",
      passwordConfirm: "Updated123!",
    }).success,
    false
  );
});
