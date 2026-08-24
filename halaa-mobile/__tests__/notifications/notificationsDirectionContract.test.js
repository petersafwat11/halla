const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const MOBILE_ROOT = path.resolve(__dirname, "..", "..");
const read = (rel) => fs.readFileSync(path.join(MOBILE_ROOT, rel), "utf8");

const stripComments = (source) =>
  source
    .replace(/\{\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return !trimmed.startsWith("//") && !trimmed.startsWith("*");
    })
    .join("\n");

test("NotificationItem: backend title/message are adaptive; timestamps are localized chrome", () => {
  const item = read("components/notifications/NotificationItem.js");

  assert.match(
    item,
    /<AdaptiveText[^>]*styles\.notifTitle/,
    "notification title is user/backend content → first-strong direction"
  );
  assert.match(item, /<AdaptiveText[^>]*styles\.notifMessage/);
  assert.match(
    item,
    /<LocalizedText[^>]*styles\.notifTime/,
    "relative time is app-authored copy → follows UI locale"
  );

  // Relative time uses locale digits + plural interpolation, never raw toLocale*.
  assert.ok(item.includes("localizeDigits"));
  assert.ok(!item.includes("toLocale"));

  // Unread accent anchors at the logical start edge, never physically.
  assert.match(item, /unreadAccent[\s\S]*?start:\s*0/);
  assert.ok(!/\bleft:\s*0|\bright:\s*0/.test(item));

  // Icon-only delete action exposes a localized accessibility label.
  assert.match(item, /accessibilityLabel=\{t\("notifications\.delete"\)\}/);
});

test("NotificationsScreen: shell stays logical with localized empty state and labelled actions", () => {
  const screen = read("screens/common/NotificationsScreen.js");

  // Empty/footer copy lives in NotificationItem's shared exports and renders
  // through localized roles; the screen consumes them.
  const item = read("components/notifications/NotificationItem.js");
  assert.ok(item.includes("LocalizedText"));
  assert.match(screen, /EmptyState|LoadMoreFooter/);
  assert.ok(!screen.includes("row-reverse"));
  assert.ok(
    !/<TextInput/.test(screen),
    "notifications screen renders no direct native inputs"
  );
  // Header icon actions keep 44×44 targets and localized labels.
  assert.match(screen, /width:\s*44,\s*\r?\n\s*height:\s*44/);
  assert.match(screen, /accessibilityLabel=\{t\("notifications\.markAllRead"\)\}/);
});

test("Toast messages render through the adaptive BiDi primitive", () => {
  const toast = read("contexts/ToastContext.js");

  assert.match(
    toast,
    /import AdaptiveText from "\.\.\/components\/commen\/AdaptiveText"/,
    "toast must reuse the shared first-strong primitive"
  );
  assert.match(toast, /<AdaptiveText[^>]*styles\.message/);
  assert.ok(
    !/import\s+\{[\s\S]*?\bText\b[\s\S]*?\}\s+from\s+"react-native"/.test(toast),
    "plain Text must not bypass the adaptive primitive"
  );

  // Toast chrome was already logical — keep it that way.
  assert.match(toast, /start:\s*20/);
  assert.match(toast, /end:\s*20/);
  assert.match(toast, /borderStartWidth/);
  assert.ok(!toast.includes("row-reverse"));
  assert.ok(!/\bleft:\s*\d|\bright:\s*\d/.test(stripComments(toast)));
});

test("P3 sweep: stats/guest/moderator rows carry no hardcoded Arabic UI literals", () => {
  for (const rel of [
    "components/events/StatsCards.js",
    "components/events/GuestListItem.js",
    "components/events/ModeratorListItem.js",
    "components/home/MakeYourFirst.js",
    "components/home/dropdownModal.js",
  ]) {
    const source = stripComments(read(rel));
    assert.ok(
      !/[\u0600-\u06FF]/.test(source),
      `${rel} must resolve visible copy through translation keys`
    );
  }
});

test("dead PrefLang settings component was removed", () => {
  assert.ok(
    !fs.existsSync(path.join(MOBILE_ROOT, "components", "settings", "PrefLang.js")),
    "PrefLang.js is empty/dead and must not come back"
  );
});
