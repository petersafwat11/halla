const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const MOBILE_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath) =>
  fs.readFileSync(path.join(MOBILE_ROOT, relativePath), "utf8");

const countJsx = (source, component) =>
  (source.match(new RegExp(`<${component}\\b`, "g")) || []).length;

const assertSingleAwareOwner = (relativePath) => {
  const source = read(relativePath);

  assert.match(
    source,
    /import\s+KeyboardAwareFormScrollView\s+from\s+["'][^"']*\/keyboard\/KeyboardAwareFormScrollView["']/,
    `${relativePath} must use the shared full-form keyboard owner`
  );
  assert.equal(
    countJsx(source, "KeyboardAwareFormScrollView"),
    1,
    `${relativePath} must render exactly one keyboard-aware vertical owner`
  );
  assert.equal(
    countJsx(source, "ScrollView"),
    0,
    `${relativePath} must not retain a competing raw vertical ScrollView`
  );
};

test("settings and editable full-screen pages use one shared keyboard-aware owner", () => {
  [
    "components/settings/AccountSettings.js",
    "screens/host/PlansSummaryScreen.js",
    "screens/common/ManagePostEventScreen.js",
  ].forEach(assertSingleAwareOwner);
});

test("event details keeps the paginated guest list as its sole vertical owner", () => {
  const source = read("screens/common/EventDetailsScreen.js");
  assert.equal(countJsx(source, "FlatList"), 1);
  assert.equal(countJsx(source, "ScrollView"), 0);
  assert.equal(countJsx(source, "KeyboardAwareFormScrollView"), 0);
  assert.match(source, /keyboardShouldPersistTaps="handled"/);
  assert.match(source, /ListHeaderComponent=/);
  assert.match(source, /onEndReached=/);
});

test("vendor account setup owns scrolling and child sections never nest vertical owners", () => {
  assertSingleAwareOwner("screens/vendor/VendorAccountSetupScreen.js");

  const childSections = [
    "components/vendor/PersonalInfoForm.js",
    "components/vendor/ServiceDetailsForm.js",
    "components/vendor/ImagesAndPricingForm.js",
    "components/vendor/AdditionalLinksForm.js",
  ];

  for (const relativePath of childSections) {
    const source = read(relativePath);
    assert.equal(
      countJsx(source, "ScrollView"),
      0,
      `${relativePath} must leave vertical scrolling to VendorAccountSetupScreen`
    );
    assert.equal(
      countJsx(source, "KeyboardAwareFormScrollView"),
      0,
      `${relativePath} must not create a nested keyboard-aware owner`
    );
  }
});

test("guest invitation makes only the editable RSVP branch keyboard-aware", () => {
  const source = read("screens/guest-portal/InvitationScreen.js");

  assert.equal(
    countJsx(source, "KeyboardAwareFormScrollView"),
    1,
    "the invited RSVP branch must have one keyboard-aware owner"
  );
  assert.equal(
    countJsx(source, "ScrollView"),
    2,
    "read-only invitation and confirmed branches should remain ordinary scroll views"
  );

  const invitedBranch = source.slice(source.indexOf("// ---- Invited (RSVP buttons)"));
  assert.match(invitedBranch, /<KeyboardAwareFormScrollView\b/);
  assert.doesNotMatch(invitedBranch, /<ScrollView\b/);
});

test("create/update StepFour delegates vertical scrolling to the wizard owner", () => {
  const source = read("components/createEvent/StepFour.js");

  assert.equal(
    countJsx(source, "ScrollView"),
    0,
    "StepFour must not nest a raw vertical ScrollView inside the wizard owner"
  );
  assert.equal(
    countJsx(source, "KeyboardAwareFormScrollView"),
    0,
    "StepFour must not create a second keyboard-aware owner"
  );
});
