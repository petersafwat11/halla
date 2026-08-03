"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  EVENT_CATEGORY_VALUES,
  TEMPLATE_FAMILY_TO_EVENT_CATEGORY,
  GENERAL_EVENT_FALLBACK_CATEGORIES,
} = require("@halaa/shared/constants/eventCategories.cjs");
const Event = require("../models/EventModel");

test("backend event enum is sourced from the shared category catalog", () => {
  const modelValues = Event.schema.path("eventDetails.type").enumValues;
  assert.deepEqual(modelValues, [...EVENT_CATEGORY_VALUES]);
  assert.equal(new Set(EVENT_CATEGORY_VALUES).size, EVENT_CATEGORY_VALUES.length);
});

test("owner template families map to distinct Hala categories", () => {
  assert.equal(TEMPLATE_FAMILY_TO_EVENT_CATEGORY.ladies_event, "ladies_event");
  assert.equal(TEMPLATE_FAMILY_TO_EVENT_CATEGORY.baby_shower, "baby_shower");
  assert.equal(TEMPLATE_FAMILY_TO_EVENT_CATEGORY.general_event, "other");
  assert.deepEqual(GENERAL_EVENT_FALLBACK_CATEGORIES, ["graduation", "meeting"]);
});
