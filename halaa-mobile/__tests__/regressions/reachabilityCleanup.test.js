const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const MOBILE_ROOT = path.resolve(__dirname, "..", "..");
const exists = (...parts) => fs.existsSync(path.join(MOBILE_ROOT, ...parts));
const read = (...parts) => fs.readFileSync(path.join(MOBILE_ROOT, ...parts), "utf8");

test("EVT-18: Orphaned EventHeroCard, UpdateEventForm, and useCreateEventForm are removed", () => {
  // 1. Files are removed
  assert.equal(
    exists("components", "admin-dashboard", "events", "UpdateEventForm.js"),
    false,
    "UpdateEventForm.js must be removed"
  );
  assert.equal(
    exists("hooks", "useCreateEventForm.js"),
    false,
    "useCreateEventForm.js must be removed"
  );

  // 2. Barrel exports in components/admin-dashboard/events/index.js do not expose EventHeroCard or UpdateEventForm
  const eventsIndex = read("components", "admin-dashboard", "events", "index.js");
  assert.equal(
    eventsIndex.includes("EventHeroCard"),
    false,
    "EventHeroCard must not be exported from admin-dashboard/events"
  );
  assert.equal(
    eventsIndex.includes("UpdateEventForm"),
    false,
    "UpdateEventForm must not be exported from admin-dashboard/events"
  );

  // 3. EventActionsSection does not define EventHeroCard
  const actionsSection = read("components", "admin-dashboard", "events", "EventActionsSection.js");
  assert.equal(
    actionsSection.includes("EventHeroCard"),
    false,
    "EventActionsSection.js must not define EventHeroCard"
  );
});

test("MKT-09: Orphaned vendor StatsCards component is removed", () => {
  // 1. File is removed
  assert.equal(
    exists("components", "vendor", "home", "StatsCards.js"),
    false,
    "components/vendor/home/StatsCards.js must be removed"
  );

  // 2. Barrel export does not expose VendorStatsCards
  const vendorHomeIndex = read("components", "vendor", "home", "index.js");
  assert.equal(
    vendorHomeIndex.includes("VendorStatsCards"),
    false,
    "VendorStatsCards must not be exported from components/vendor/home"
  );
});

test("EVT-18: CreateEventScreen delegates creation cleanly without dead update branches", () => {
  const createScreen = read("screens", "common", "CreateEventScreen.js");
  assert.equal(
    createScreen.includes("isUpdate"),
    false,
    "CreateEventScreen.js must not contain dead isUpdate logic"
  );
  assert.equal(
    createScreen.includes("useUpdateAdminEvent"),
    false,
    "CreateEventScreen.js must not import useUpdateAdminEvent"
  );
  assert.match(
    createScreen,
    /<CreateEventForm\s+mode="host"\s*\/>/,
    "CreateEventScreen must render host CreateEventForm"
  );
});
