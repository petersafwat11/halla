import test from "node:test";
import assert from "node:assert/strict";

import {
  getScheduleWindow,
  getScheduleTimeBounds,
  parseClockParts,
  riyadhWallClockInstant,
  validateScheduleSelection,
} from "../src/utils/schedulingWindow.js";

test("clock parser accepts the app's 12h and 24h tokens", () => {
  assert.deepEqual(parseClockParts("12:05 AM"), { hour: 0, minute: 5 });
  assert.deepEqual(parseClockParts("9:30:PM"), { hour: 21, minute: 30 });
  assert.deepEqual(parseClockParts("23:45"), { hour: 23, minute: 45 });
  assert.equal(parseClockParts("25:00"), null);
});

test("time bounds disable too-early and too-late clock values on boundary days", () => {
  const window = getScheduleWindow({
    isTrial: true,
    eventDate: "2026-09-03",
    eventTime: "18:00",
    now: new Date("2026-08-27T09:00:30.000Z"),
  });
  assert.deepEqual(getScheduleTimeBounds("2026-08-27", window), {
    minimumMinutes: 12 * 60 + 16,
    maximumMinutes: 1439,
  });
  assert.deepEqual(getScheduleTimeBounds("2026-08-31", window), {
    minimumMinutes: 0,
    maximumMinutes: 18 * 60,
  });
});

test("Riyadh wall-clock conversion matches the backend UTC interpretation", () => {
  assert.equal(
    riyadhWallClockInstant("2026-08-30T00:00:00.000Z", "18:30").toISOString(),
    "2026-08-30T15:30:00.000Z"
  );
});

test("serialized Riyadh midnight keeps its intended event day and 12h time", () => {
  assert.equal(
    riyadhWallClockInstant("2026-09-11T21:00:00.000Z", "08:00:PM").toISOString(),
    "2026-09-12T17:00:00.000Z"
  );
});

test("trial and paid scheduling windows use 15 minutes and 24 hours", () => {
  const now = new Date("2026-08-27T09:00:00.000Z");
  const common = {
    eventDate: "2026-09-03T00:00:00.000Z",
    eventTime: "18:00",
    now,
  };

  const trial = getScheduleWindow({ ...common, isTrial: true });
  const paid = getScheduleWindow({ ...common, isTrial: false });
  assert.equal(trial.earliestInstant.toISOString(), "2026-08-27T09:15:00.000Z");
  assert.equal(paid.earliestInstant.toISOString(), "2026-08-28T09:00:00.000Z");
  assert.equal(trial.latestInstant.toISOString(), "2026-08-31T15:00:00.000Z");
  assert.equal(paid.latestInstant.toISOString(), "2026-08-31T15:00:00.000Z");
});

test("exact selected time is checked inside the day-granular picker bounds", () => {
  const now = new Date("2026-08-27T09:00:00.000Z");
  const input = {
    date: "2026-08-27",
    isTrial: true,
    eventDate: "2026-09-03",
    eventTime: "18:00",
    now,
  };

  assert.equal(validateScheduleSelection({ ...input, time: "12:05" }).reason, "tooSoon");
  assert.equal(validateScheduleSelection({ ...input, time: "12:20" }).valid, true);
  assert.equal(
    validateScheduleSelection({ ...input, date: "2026-09-01", time: "12:00" }).reason,
    "tooLate"
  );
});
