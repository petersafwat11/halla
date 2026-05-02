#!/usr/bin/env node
/**
 * Timezone utility unit checks (PIPELINE-F05).
 *
 * Asserts that `parseEventTime` and `isDue` give the right answer
 * regardless of the host's timezone. The test temporarily sets
 * `process.env.TZ` to several values and re-requires the module, since
 * Node honours the TZ change for new Date instances.
 */

const path = require("path");
const TZS = ["UTC", "Asia/Riyadh", "America/Los_Angeles", "Asia/Tokyo"];

let total = 0;
let failed = 0;

const expect = (name, cond, detail) => {
  total++;
  if (cond) {
    console.log(`PASS  ${name}`);
  } else {
    failed++;
    console.error(`FAIL  ${name}\n      ${detail || ""}`);
  }
};

for (const tz of TZS) {
  process.env.TZ = tz;
  delete require.cache[require.resolve("../../../labbe-backend-/src/shared/utils/timezone.js")];
  const { parseEventTime, isDue } = require(path.resolve(
    __dirname,
    "../../../labbe-backend-/src/shared/utils/timezone.js"
  ));

  // Event: scheduled for 2026-05-02 at 18:30 Riyadh time.
  // Riyadh is UTC+3 (no DST), so the absolute UTC instant is 15:30Z.
  const eventDoc = {
    launchSettings: {
      scheduledDate: new Date("2026-05-02T00:00:00Z"),
      scheduledTime: "18:30",
    },
  };

  const utc = parseEventTime(eventDoc);
  expect(
    `[${tz}] parseEventTime returns 2026-05-02T15:30:00Z`,
    utc.toISOString() === "2026-05-02T15:30:00.000Z",
    `got ${utc?.toISOString()}`
  );

  // 30 seconds after the scheduled instant — should be due.
  const tickDue = new Date("2026-05-02T15:30:30Z");
  expect(`[${tz}] isDue at +30s -> true`, isDue(eventDoc, tickDue, 60));

  // 5 minutes after — should NOT be due (outside 60s window).
  const tickLate = new Date("2026-05-02T15:35:00Z");
  expect(`[${tz}] isDue at +5min -> false`, !isDue(eventDoc, tickLate, 60));

  // 1 minute before — should NOT be due.
  const tickEarly = new Date("2026-05-02T15:29:00Z");
  expect(`[${tz}] isDue at -1min -> false`, !isDue(eventDoc, tickEarly, 60));
}

if (failed) {
  console.error(`\n${failed} of ${total} checks failed.`);
  process.exit(1);
}
console.log(`\nAll ${total} timezone checks passed.`);
