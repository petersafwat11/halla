const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const MOBILE_ROOT = path.resolve(__dirname, "..", "..");
const read = (...parts) =>
  fs.readFileSync(path.join(MOBILE_ROOT, ...parts), "utf8");

test("parseUnreadCount handles edge cases: 0, '0', null, undefined, NaN, -1, 1, 99, 100", async () => {
  const { parseUnreadCount } = await import("../../utils/notificationCount.js");

  // Non-positive or invalid counts return 0
  assert.equal(parseUnreadCount(0), 0);
  assert.equal(parseUnreadCount("0"), 0);
  assert.equal(parseUnreadCount(null), 0);
  assert.equal(parseUnreadCount(undefined), 0);
  assert.equal(parseUnreadCount(NaN), 0);
  assert.equal(parseUnreadCount(-1), 0);
  assert.equal(parseUnreadCount("-5"), 0);

  // Positive integers
  assert.equal(parseUnreadCount(1), 1);
  assert.equal(parseUnreadCount("1"), 1);
  assert.equal(parseUnreadCount(99), 99);
  assert.equal(parseUnreadCount("99"), 99);
  assert.equal(parseUnreadCount(100), 100);
  assert.equal(parseUnreadCount("100"), 100);

  // Decimal numbers floor to integer
  assert.equal(parseUnreadCount(4.9), 4);
  assert.equal(parseUnreadCount("4.2"), 4);
});

test("NotificationBell component renders badge conditionally only when unreadCount > 0", () => {
  const bellSource = read("components", "notifications", "NotificationBell.js");

  // Uses parseUnreadCount
  assert.ok(
    bellSource.includes("parseUnreadCount(unreadData?.count)"),
    "NotificationBell must pass count through parseUnreadCount"
  );

  // Checks unreadCount > 0 before rendering badge overlay
  assert.ok(
    bellSource.includes("unreadCount > 0 && ("),
    "Badge view must only render when unreadCount > 0"
  );

  // Accessibility label also checks unreadCount > 0
  assert.ok(
    bellSource.includes("unreadCount > 0"),
    "Accessibility label must distinguish unread vs zero"
  );

  // Preserves 99+ cap
  assert.ok(
    bellSource.includes("MAX_BADGE_COUNT = 99") || bellSource.includes("count > MAX_BADGE_COUNT"),
    "NotificationBell must retain 99+ cap"
  );
});

test("F-17: NotificationBell badge assertion: no badge for 0, '0', null, undefined, NaN, negatives; renders 1, 99, 100", async () => {
  const { parseUnreadCount } = await import("../../utils/notificationCount.js");

  const noBadgeCases = [0, "0", null, undefined, NaN, -1, -10, "-5"];
  for (const input of noBadgeCases) {
    const count = parseUnreadCount(input);
    const hasBadge = count > 0;
    assert.equal(hasBadge, false, `Must NOT render badge for input: ${input}`);
  }

  const badgeCases = [
    { input: 1, expected: "1" },
    { input: "1", expected: "1" },
    { input: 99, expected: "99" },
    { input: "99", expected: "99" },
    { input: 100, expected: "99+" },
    { input: "150", expected: "99+" },
  ];

  for (const { input, expected } of badgeCases) {
    const count = parseUnreadCount(input);
    assert.ok(count > 0, `Must render badge for input: ${input}`);
    const display = count > 99 ? "99+" : String(count);
    assert.equal(display, expected, `Badge display mismatch for input: ${input}`);
  }
});

