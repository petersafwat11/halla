const test = require("node:test");
const assert = require("node:assert/strict");

const { mobileAccountSettingsSchema } = require("../../../shared/src/schemas/settings.js");

test("mobileAccountSettingsSchema accepts valid profile without password changes", () => {
  const result = mobileAccountSettingsSchema.safeParse({
    username: "ahmed123",
    email: "ahmed@example.com",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  assert.equal(result.success, true);
});

test("mobileAccountSettingsSchema accepts valid password change", () => {
  const result = mobileAccountSettingsSchema.safeParse({
    username: "ahmed123",
    email: "ahmed@example.com",
    currentPassword: "OldPassword123",
    newPassword: "NewPassword123",
    confirmPassword: "NewPassword123",
  });
  assert.equal(result.success, true);
});

test("mobileAccountSettingsSchema rejects currentPassword when newPassword is missing", () => {
  const result = mobileAccountSettingsSchema.safeParse({
    username: "ahmed123",
    email: "ahmed@example.com",
    currentPassword: "OldPassword123",
    newPassword: "",
    confirmPassword: "",
  });
  assert.equal(result.success, false);
  const newPassErr = result.error.issues.find((i) => i.path.includes("newPassword"));
  assert.ok(newPassErr, "Should have error on newPassword");
  assert.equal(newPassErr.message, "validation.newPasswordRequired");
});

test("mobileAccountSettingsSchema rejects newPassword when currentPassword is missing", () => {
  const result = mobileAccountSettingsSchema.safeParse({
    username: "ahmed123",
    email: "ahmed@example.com",
    currentPassword: "",
    newPassword: "NewPassword123",
    confirmPassword: "NewPassword123",
  });
  assert.equal(result.success, false);
  const currentPassErr = result.error.issues.find((i) => i.path.includes("currentPassword"));
  assert.ok(currentPassErr, "Should have error on currentPassword");
  assert.equal(currentPassErr.message, "validation.currentPasswordRequired");
});

test("mobileAccountSettingsSchema rejects mismatched new and confirm passwords", () => {
  const result = mobileAccountSettingsSchema.safeParse({
    username: "ahmed123",
    email: "ahmed@example.com",
    currentPassword: "OldPassword123",
    newPassword: "NewPassword123",
    confirmPassword: "DifferentPassword123",
  });
  assert.equal(result.success, false);
  const mismatchErr = result.error.issues.find((i) => i.path.includes("confirmPassword"));
  assert.ok(mismatchErr, "Should have error on confirmPassword");
  assert.equal(mismatchErr.message, "validation.passwordsDoNotMatch");
});

test("mobileAccountSettingsSchema rejects password not meeting complexity policy", () => {
  const result = mobileAccountSettingsSchema.safeParse({
    username: "ahmed123",
    email: "ahmed@example.com",
    currentPassword: "OldPassword123",
    newPassword: "letters_only!",
    confirmPassword: "letters_only!",
  });
  assert.equal(result.success, false);
});

test("mobileAccountSettingsSchema rejects confirmPassword when newPassword is missing", () => {
  const result = mobileAccountSettingsSchema.safeParse({
    username: "ahmed123",
    email: "ahmed@example.com",
    currentPassword: "OldPassword123",
    newPassword: "",
    confirmPassword: "NewPassword123",
  });
  assert.equal(result.success, false);
  const newPassErr = result.error.issues.find((i) => i.path.includes("newPassword"));
  assert.ok(newPassErr, "Should have error on newPassword");
});

