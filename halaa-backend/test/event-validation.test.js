/**
 * Backend Event Validation Tests (Session 1.1 — EVT-08)
 *
 * Verifies that createEventSchema and updateEventDetailsSchema enforce
 * minimum location and required event details.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createEventSchema,
  updateEventDetailsSchema,
} = require("../src/modules/events/events.validation");

const validBaseEvent = {
  eventDetails: {
    title: "Saudi National Day Celebration",
    type: "wedding",
    date: "2026-09-23",
    time: "08:00 PM",
    location: {
      address: "King Fahd Cultural Centre, Riyadh",
      city: "Riyadh",
      country: "Saudi Arabia",
      latitude: 24.7136,
      longitude: 46.6753,
    },
    description: "Annual national day gathering",
  },
  guestList: [
    { name: "Abdullah Al-Mansoor", phone: "0501234567" },
  ],
};

test("createEventSchema: accepts complete valid event payload", () => {
  const result = createEventSchema.safeParse(validBaseEvent);
  assert.equal(result.success, true, "Valid event payload must parse successfully");
});

test("createEventSchema: rejects missing or empty title", () => {
  const payload = JSON.parse(JSON.stringify(validBaseEvent));
  delete payload.eventDetails.title;

  const result1 = createEventSchema.safeParse(payload);
  assert.equal(result1.success, false);

  payload.eventDetails.title = "   ";
  const result2 = createEventSchema.safeParse(payload);
  assert.equal(result2.success, false);
});

test("createEventSchema: rejects missing or invalid event type", () => {
  const payload = JSON.parse(JSON.stringify(validBaseEvent));
  delete payload.eventDetails.type;

  const result1 = createEventSchema.safeParse(payload);
  assert.equal(result1.success, false);

  payload.eventDetails.type = "non_existent_category";
  const result2 = createEventSchema.safeParse(payload);
  assert.equal(result2.success, false);
});

test("createEventSchema: rejects missing event date and time", () => {
  const payload = JSON.parse(JSON.stringify(validBaseEvent));
  delete payload.eventDetails.date;

  const resultDate = createEventSchema.safeParse(payload);
  assert.equal(resultDate.success, false);

  payload.eventDetails.date = "2026-09-23";
  delete payload.eventDetails.time;

  const resultTime = createEventSchema.safeParse(payload);
  assert.equal(resultTime.success, false);
});

test("createEventSchema (EVT-08): rejects missing location and empty location address", () => {
  const payloadMissingLoc = JSON.parse(JSON.stringify(validBaseEvent));
  delete payloadMissingLoc.eventDetails.location;

  const res1 = createEventSchema.safeParse(payloadMissingLoc);
  assert.equal(res1.success, false, "Must reject missing location");

  const payloadEmptyAddr = JSON.parse(JSON.stringify(validBaseEvent));
  payloadEmptyAddr.eventDetails.location = { address: "   " };

  const res2 = createEventSchema.safeParse(payloadEmptyAddr);
  assert.equal(res2.success, false, "Must reject blank address");
  const issue = res2.error.issues.find((i) => i.path.includes("address"));
  assert.ok(issue, "Must produce field-addressable error on address");
});

test("updateEventDetailsSchema: validates partial updates and rejects blank address", () => {
  // Valid partial update
  const validPartial = { title: "Updated Event Title" };
  const res1 = updateEventDetailsSchema.safeParse(validPartial);
  assert.equal(res1.success, true);

  // Empty object rejected
  const emptyRes = updateEventDetailsSchema.safeParse({});
  assert.equal(emptyRes.success, false);

  // Blank address in location rejected
  const blankAddr = { location: { address: "   " } };
  const res2 = updateEventDetailsSchema.safeParse(blankAddr);
  assert.equal(res2.success, false);

  // Valid location update
  const validLoc = { location: { address: "Olaya St, Riyadh" } };
  const res3 = updateEventDetailsSchema.safeParse(validLoc);
  assert.equal(res3.success, true);
});
