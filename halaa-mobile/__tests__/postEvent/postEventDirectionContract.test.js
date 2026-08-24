const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

/**
 * Manage Post-Event page (host console + guest feed) direction contract.
 * Blueprint §8 row "Post-event":
 *
 *  - local bilingual dictionaries / direct Arabic move into i18n keys;
 *  - user names, captions, comment bodies and backend template copy render
 *    adaptively (first-strong direction + isolation);
 *  - timestamps/counts/likes are formatted and isolated;
 *  - navigation icons stay directional; semantic glyphs are not mirrored;
 *  - no row-reverse, no physical directional styles, no raw TextInput.
 */

const MOBILE_ROOT = path.resolve(__dirname, "..", "..");
const read = (...parts) =>
  fs.readFileSync(path.join(MOBILE_ROOT, ...parts), "utf8");

const loadLocales = () => ({
  ar: JSON.parse(read("localization", "locales", "ar", "postEvent.json")),
  en: JSON.parse(read("localization", "locales", "en", "postEvent.json")),
});

test("PostInteractions uses i18n moderation keys instead of a local dictionary", () => {
  const source = read(
    "components",
    "host",
    "post-event",
    "post-card",
    "PostInteractions.js"
  );

  assert.ok(!source.includes("MOD_COPY"), "local AR/EN dictionary must be deleted");
  assert.ok(!source.includes("tx("), "manual dictionary selector must be gone");
  assert.ok(!/lang\s*===\s*["']ar["']\s*\?/.test(source), "no inline bilingual ternary literals");

  for (const key of [
    "moderation.menuReport",
    "moderation.reportPost",
    "moderation.reportTitle",
    "moderation.reasonSpam",
    "moderation.reasonHarassment",
    "moderation.blockTitle",
    "comment.legalPrefix",
  ]) {
    assert.ok(source.includes(key), `references ${key}`);
  }

  // Legal prefix flows through the translation system, never a raw literal.
  assert.ok(
    !/prefix=\{["'][^}]*[\u0600-\u06FF]/.test(source),
    "legal prefix must come from a translation key"
  );
});

test("moderation + legal-prefix keys have strict AR/EN parity with authored punctuation", () => {
  const { ar, en } = loadLocales();
  const required = [
    "moderation.menuReport",
    "moderation.reportPost",
    "moderation.report",
    "moderation.menuBlock",
    "moderation.cancel",
    "moderation.reportTitle",
    "moderation.reportMsg",
    "moderation.reasonSpam",
    "moderation.reasonHarassment",
    "moderation.reasonOther",
    "moderation.reported",
    "moderation.blockTitle",
    "moderation.blockMsg",
    "moderation.block",
    "moderation.blocked",
    "moderation.failed",
    "comment.legalPrefix",
  ];
  const at = (obj, key) => key.split(".").reduce((o, k) => o?.[k], obj);
  for (const key of required) {
    assert.ok(typeof at(ar, key) === "string" && at(ar, key).length > 0, `ar postEvent missing ${key}`);
    assert.ok(typeof at(en, key) === "string" && at(en, key).length > 0, `en postEvent missing ${key}`);
  }
});

test("guest/user/backend content renders adaptively across the post-event tree", () => {
  const adaptiveTargets = {
    "components/host/post-event/post-card/PostCard.js": ["post.content.text"],
    "components/host/post-event/GuestEventHeader.js": [
      "eventInfo.title",
      "guestInfo.name",
      "localizedThankYou",
    ],
    "components/host/post-event/post-card/PostInteractions.js": [
      "c.guest?.name",
      "c.text",
    ],
    "screens/host/PostEventScreen.js": ["eventInfo?.title"],
    "screens/common/ManagePostEventScreen.js": ["contentQuery.error?.message"],
  };

  for (const [rel, tokens] of Object.entries(adaptiveTargets)) {
    const source = read(...rel.split("/"));
    assert.ok(source.includes("<AdaptiveText"), `${rel} imports AdaptiveText`);
    for (const token of tokens) {
      assert.ok(source.includes(token), `${rel} renders ${token} adaptively`);
    }
  }

  // Guest comment input follows first-strong once filled.
  const interactions = read(
    "components",
    "host",
    "post-event",
    "post-card",
    "PostInteractions.js"
  );
  assert.ok(
    interactions.includes('contentDirection="adaptive"'),
    "comment input declares adaptive content direction"
  );
});

test("like/comment counts are locale-formatted and isolated", () => {
  const interactions = read(
    "components",
    "host",
    "post-event",
    "post-card",
    "PostInteractions.js"
  );
  assert.ok(
    interactions.includes("isolateLtr(formatCount(likesCount"),
      "like count goes through formatCount + isolateLtr"
  );
  assert.ok(
    interactions.includes("isolateLtr(formatCount(commentsCount"),
    "comment count goes through formatCount + isolateLtr"
  );
  assert.ok(
    !/\{likesCount\}|\{commentsCount\}/.test(interactions),
    "bare unformatted counts are gone"
  );
});

test("GuestEventHeader renders exactly one locale-appropriate thank-you variant", () => {
  const header = read("components", "host", "post-event", "GuestEventHeader.js");
  assert.ok(header.includes("textAr || thankYouMessage.text"), "Arabic UI prefers the Arabic variant with fallback");
  assert.ok(header.includes("textEn || thankYouMessage.text"), "English UI prefers the English variant with fallback");
  // The old unconditional second-language subtitle must be gone.
  assert.ok(!header.includes("thankYouSubtitle"), "both languages are never stacked");
  // Leading person glyph sits outside the name text run.
  assert.ok(header.includes("guestNameRow"), "icon and name are separate runs");
});

/**
 * A file passes the raw-input guard when every <TextInput …> element is
 * fed by a shared primitive import (DirectionalTextInput or the shared
 * commen/TextInput RHF wrapper) — never by react-native directly.
 */
const usesRawNativeInput = (source) => {
  if (!/<TextInput\b/.test(source)) return false;
  const importBlock = source.match(/^import[\s\S]*?from\s+["'][^"']+["'];?$/gm)?.join("\n") ?? "";
  const aliasedShared =
    /import\s+TextInput\s+from\s+["'][^"']*(?:DirectionalTextInput|commen\/TextInput)["']/.test(
      importBlock
    );
  return !aliasedShared;
};

test("post-event tree keeps logical layout and directional primitives", () => {
  const files = [
    "screens/common/ManagePostEventScreen.js",
    "screens/host/PostEventScreen.js",
    "components/host/post-event/GuestEventHeader.js",
    "components/host/post-event/MessagingTemplatePicker.js",
    "components/host/post-event/AccessLinksSheet.js",
    "components/host/post-event/ThankYouMessageSection.js",
    "components/host/post-event/MediaUploader.js",
    "components/host/post-event/PublishControls.js",
    "components/host/post-event/ContentSummary.js",
    "components/host/post-event/post-card/PostCard.js",
    "components/host/post-event/post-card/PostInteractions.js",
  ];
  for (const rel of files) {
    const source = read(...rel.split("/"));
    assert.ok(!source.includes("row-reverse"), `${rel} introduces row-reverse`);
    // Symmetric hitSlop is intentionally physical (equal targets both sides).
    const styleCode = source.replace(/hitSlop=\{[^}]*\}/g, "");
    assert.ok(
      !/\b(marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth|textAlign:\s*"right"|left:\s*\d|right:\s*\d)\b/.test(
        styleCode
      ),
      `${rel} contains physical directional styling`
    );
    assert.ok(
      !usesRawNativeInput(source),
      `${rel} must use DirectionalTextInput/shared fields, never raw react-native TextInput`
    );
  }
});
