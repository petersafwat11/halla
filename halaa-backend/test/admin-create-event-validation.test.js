/**
 * Admin create-for-host validation: the route must enforce the same event
 * contract as the host create route while keeping the admin target fields.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { createEventForHostSchema } = require("../src/modules/admin/admin.validation");

const targetUserId = "66cc33333333333333333333";
const event = {
  eventDetails: {
    title: "Admin Created Wedding",
    type: "wedding",
    date: "2026-10-15",
    time: "07:30 PM",
    location: { address: "Riyadh Front", latitude: 24.7136, longitude: 46.6753 },
  },
  guestList: [{ name: "Guest", phone: "0501234567" }],
  staffList: [],
  visualTemplate: { templateRef: "507f1f77bcf86cd799439011", fieldValues: {} },
};

const issuePaths = (result) => result.error.issues.map((issue) => issue.path.join("."));

test("admin create-for-host validates the event and preserves targetUserId", () => {
  const result = createEventForHostSchema.safeParse({ ...event, targetUserId });
  assert.equal(result.success, true);
  assert.equal(result.data.targetUserId, targetUserId);
  assert.equal(result.data.createForSelf, false);
  assert.equal(result.data.eventDetails.title, "Admin Created Wedding");
  assert.equal(result.data.guestList[0].phone, "0501234567");
});

test("multipart createForSelf strings become booleans the controller understands", () => {
  const self = createEventForHostSchema.safeParse({ ...event, createForSelf: "true" });
  assert.equal(self.success, true);
  assert.equal(self.data.createForSelf, true);

  const notSelf = createEventForHostSchema.safeParse({ ...event, createForSelf: "false", targetUserId });
  assert.equal(notSelf.data.createForSelf, false);
});

test("a malformed or missing target is rejected on targetUserId", () => {
  const malformed = createEventForHostSchema.safeParse({ ...event, targetUserId: "not-an-id" });
  assert.equal(malformed.success, false);
  assert.deepEqual(issuePaths(malformed), ["targetUserId"]);

  const missing = createEventForHostSchema.safeParse(event);
  assert.equal(missing.success, false);
  assert.deepEqual(issuePaths(missing), ["targetUserId"]);

  const byPhone = createEventForHostSchema.safeParse({ ...event, phoneNumber: "0501234567", hostName: "Host" });
  assert.equal(byPhone.success, true);
});

test("invalid event fields fail with step-routable field paths", () => {
  const result = createEventForHostSchema.safeParse({
    ...event,
    targetUserId,
    eventDetails: { ...event.eventDetails, title: "" },
    guestList: [{ name: "Guest", phone: "+201001234567" }],
  });
  assert.equal(result.success, false);
  const paths = issuePaths(result);
  assert.ok(paths.includes("eventDetails.title"), paths.join(","));
  assert.ok(paths.includes("guestList.0.phone"), paths.join(","));
});

test("Taqnyat template aliases normalize exactly like the host create schema", () => {
  const result = createEventForHostSchema.safeParse({
    ...event,
    targetUserId,
    selectedTemplate: { _id: "507f1f77bcf86cd799439012" },
  });
  assert.equal(result.success, true);
  assert.deepEqual(result.data.taqnyatTemplate, { templateRef: "507f1f77bcf86cd799439012" });
});

test("the admin create route validates after multipart parsing and before idempotency", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "../src/modules/admin/admin.events.routes.js"),
    "utf8"
  );
  const route = source.slice(source.indexOf("router.post('/events/create-for-host'"));
  const parse = route.indexOf("parseFormDataJsonFields(");
  const validate = route.indexOf("validateZod(adminValidation.createEventForHostSchema)");
  const idempotent = route.indexOf("idempotency(");
  const controller = route.indexOf("adminController.createEventForHost");
  assert.ok(parse > -1 && validate > parse, "validation runs on parsed JSON fields");
  assert.ok(idempotent > validate, "invalid bodies never reserve an idempotency key");
  assert.ok(controller > idempotent);
});
