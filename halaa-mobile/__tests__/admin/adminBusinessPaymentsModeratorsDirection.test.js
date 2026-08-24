const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const MOBILE_ROOT = path.resolve(__dirname, "..", "..");
const read = (rel) => fs.readFileSync(path.join(MOBILE_ROOT, rel), "utf8");
const readJson = (rel) => JSON.parse(read(rel));

// Every component reachable from Businesses / Payments / Moderators,
// including the shared admin primitives they render through.
const PAGE_TREE = [
  // Businesses
  "screens/admin/admin-dashboard/AdminBusinessesScreen.js",
  "screens/admin/admin-dashboard/BusinessDetailsScreen.js",
  "components/admin-dashboard/businesses/BusinessListItem.js",
  "components/admin-dashboard/businesses/AddBusinessModal.js",
  "components/admin-dashboard/businesses/ReplaceLogoModal.js",
  "components/admin-dashboard/common/ManagePlanModal.js",
  "components/admin-dashboard/hosts/HostSectionCard.js",
  // Payments
  "screens/admin/admin-dashboard/AdminPaymentsScreen.js",
  "screens/admin/admin-dashboard/PaymentDetailScreen.js",
  "components/admin-dashboard/payments/PaymentList.js",
  "components/admin-dashboard/payments/PaymentListItem.js",
  "components/admin-dashboard/payments/PaymentStats.js",
  "components/admin-dashboard/common/AdminPageHeader.js",
  "components/admin-dashboard/common/ExportButton.js",
  "components/admin-dashboard/common/StatCard.js",
  // Moderators
  "screens/admin/admin-dashboard/AdminModeratorsScreen.js",
  "components/admin-dashboard/moderators/ModeratorList.js",
  "components/admin-dashboard/moderators/ModeratorListItem.js",
  "components/admin-dashboard/moderators/AddModeratorModal.js",
  "components/admin-dashboard/common/BulkActionsBar.js",
  // Shared list shell
  "components/admin-dashboard/common/AdminListItem.js",
  "components/admin-dashboard/common/AdminFlatList.js",
  "components/admin-dashboard/common/SearchBar.js",
  "components/admin-dashboard/common/StatusBadge.js",
];

test("businesses/payments/moderators keep the root direction architecture", () => {
  for (const rel of PAGE_TREE) {
    const source = read(rel);
    assert.ok(
      !source.includes("row-reverse"),
      `${rel} must not use flexDirection: row-reverse`
    );
    assert.ok(
      !/TextInput\s+as\s+RNTextInput/.test(source),
      `${rel} must not import the native TextInput directly`
    );
    assert.ok(
      !/import\s*\{[^}]*\bTextInput\b[^}]*\}\s*from\s*"react-native"/.test(source),
      `${rel} must use DirectionalTextInput or the shared form fields`
    );
    const lines = source.split("\n");
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;
      assert.ok(
        !/\b(marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth)\s*:/.test(
          trimmed
        ),
        `${rel}:${idx + 1} uses physical directional style: ${trimmed}`
      );
    });
  }
});

test("no deprecated BiDi embedding marks anywhere in the trees", () => {
  for (const rel of PAGE_TREE) {
    const source = read(rel);
    assert.ok(
      !/[\u202A-\u202E]/.test(source),
      `${rel} must use the shared isolateLtr/isolateAuto helpers, not U+202A-U+202E`
    );
  }
});

// ── Businesses ──────────────────────────────────────────────────────────

test("AdminBusinessesScreen: filter chips follow the UI locale via LocalizedText", () => {
  const screen = read("screens/admin/admin-dashboard/AdminBusinessesScreen.js");
  assert.ok(screen.includes("LocalizedText"), "chip labels are app copy");
  assert.ok(
    !/<Text[\s>]/.test(screen),
    "plain Text must not bypass the localized role primitive"
  );
});

test("BusinessListItem: LTR phone, adaptive plan value, interpolated copy", () => {
  const item = read("components/admin-dashboard/businesses/BusinessListItem.js");

  assert.match(item, /isolateLtr\(phoneNumber\)/, "phone digits are LTR-isolated");
  assert.match(item, /isolateAuto\(name\)/, "alert names are first-strong isolated");
  assert.ok(
    item.includes('t("common.joinedDate"'),
    "joined date is one interpolated translation key"
  );
  assert.ok(
    /adaptive:\s*Boolean\(planName\)/.test(item),
    "plan display name is backend content; the No-plan fallback stays localized"
  );
  assert.ok(
    !/\$\{t\(/.test(item),
    "never concatenate t() output inside template strings"
  );
});

test("AddBusinessModal: shared fields with explicit adaptive user-content modes", () => {
  const modal = read("components/admin-dashboard/businesses/AddBusinessModal.js");

  assert.ok(modal.includes("LocalizedText"), "kicker/title are localized roles");
  const adaptiveUses = modal.split("CONTENT_DIRECTIONS.ADAPTIVE").length - 1;
  assert.ok(
    adaptiveUses >= 2,
    `business name + description must be adaptive, found ${adaptiveUses}`
  );
  // Email/phone/password come from the specialised shared fields which pin
  // ltr/ltr/phone internally — they must not be downgraded to plain inputs.
  for (const shared of ["EmailInput", "MobileInput", "PasswordInput"]) {
    assert.ok(modal.includes(shared), `${shared} keeps its intrinsic direction mode`);
  }
  assert.ok(
    !/<Text[\s>]/.test(modal),
    "plain Text must not bypass the localized role primitive"
  );
});

test("ReplaceLogoModal: localized chrome, adaptive business name", () => {
  const modal = read("components/admin-dashboard/businesses/ReplaceLogoModal.js");
  assert.ok(modal.includes("LocalizedText"), "kicker/title are localized roles");
  assert.ok(modal.includes("AdaptiveText"), "the business name is backend content");
  assert.ok(!/<Text[\s>]/.test(modal), "no plain Text bypass");
});

test("AdminListItem: avatar initials survive BiDi-isolated titles", () => {
  const item = read("components/admin-dashboard/common/AdminListItem.js");
  assert.match(
    item,
    /BIDI_CONTROL_RE/,
    "isolate marks must be stripped before taking the avatar initial"
  );
  // Behavioural: a price token passed as title must yield a visible glyph.
  const BIDI = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;
  const isolatedTitle = "\u2068SAR 150.00\u2069";
  const stripped = String(isolatedTitle).replace(BIDI, "");
  assert.equal(stripped.charAt(0), "S", "first visible glyph survives stripping");
});

// ── Business details ─────────────────────────────────────────────────────

test("BusinessDetailsScreen: contact rows declare explicit field modes", () => {
  const screen = read("screens/admin/admin-dashboard/BusinessDetailsScreen.js");
  assert.match(screen, /value=\{business\.phoneNumber\} mode="phone"/,
    "phone digits are LTR once filled (phone mode)");
  assert.match(screen, /value=\{business\.email\} mode="ltr"/,
    "email is an intrinsically LTR token");
  assert.match(screen, /mode="localized" last/,
    "locale-formatted join date follows the UI locale");
  assert.ok(
    !/\$\{t\(/.test(screen),
    "never concatenate t() output inside template strings"
  );
});

test("BusinessDetailsScreen: subscription badge and assignment meta are translated keys", () => {
  const screen = read("screens/admin/admin-dashboard/BusinessDetailsScreen.js");

  assert.match(
    screen,
    /assignments\.status\.\$\{subStatus\}/,
    "the subscription status enum is translated, never title-cased raw"
  );
  assert.match(screen, /assignments\.meta/, "meta line is one interpolation key");
  assert.match(screen, /assignments\.metaNoAmount/,
    "amount-less assignments use their own key");
  assert.match(screen, /amountToken = isolateLtr\(/,
    "the assignment amount stays one LTR-isolated atomic token");
  assert.ok(
    !/`\s*·\s*\$\{/.test(screen),
    "separators live inside translation strings, not JSX concatenation"
  );
});

// ── Payments ────────────────────────────────────────────────────────────

test("PaymentListItem: price is ONE atomic locale token; card/ID tokens isolated", () => {
  const item = read("components/admin-dashboard/payments/PaymentListItem.js");

  assert.ok(item.includes("formatCurrency("), "price uses the shared currency formatter");
  assert.match(item, /isolateAuto\(formatCurrency/, "price token is first-strong isolated");
  assert.ok(
    !/title=\{`/.test(item) && !/`\$\{payment\.amount\}/.test(item),
    "the amount must never be re-assembled as a raw template literal"
  );
  assert.match(item, /isolateLtr\(`\$\{methodType\}/, "method + last4 form one LTR token");
  assert.match(
    item,
    /isolateLtr\(payment\.moyasarPaymentId\)/,
    "the payment processor id is an isolated LTR token"
  );
  assert.ok(item.includes("statusDomain=\"payment\""), "status badge stays domain-aware");
});

test("StatCard: label/value/trend render through localized roles with locale formatting", () => {
  const card = read("components/admin-dashboard/common/StatCard.js");
  assert.ok(card.includes("LocalizedText"), "stat text uses the localized role primitive");
  assert.ok(card.includes("formatPercent("), "trend percent is locale-formatted, never 'x%' concat");
  assert.ok(!/<Text[\s>]/.test(card), "no plain Text bypass");
});

test("PaymentStats: revenue and counts use shared locale formatters", () => {
  const stats = read("components/admin-dashboard/payments/PaymentStats.js");
  assert.ok(stats.includes("formatCurrency("), "revenue is a formatted currency token");
  assert.ok(stats.includes("formatCount("), "counts follow the UI locale digits");
  assert.ok(stats.includes("isolateAuto(formatCurrency"), "revenue is one atomic token");
  assert.ok(!/\.toLocaleString\(/.test(stats), "render sites never call toLocaleString directly");
});

test("AdminPageHeader: logical slot names and locale-formatted filter badge counts", () => {
  const header = read("components/admin-dashboard/common/AdminPageHeader.js");
  assert.ok(header.includes("actionRowStart") && header.includes("actionRowEnd"),
    "action slots are named logically, not left/right");
  assert.ok(header.includes("formatCount(opt.count"), "badge counts are locale-formatted");
});

test("PaymentDetailScreen: localized status row, authored labels, LTR ID rows", () => {
  const detail = read("screens/admin/admin-dashboard/PaymentDetailScreen.js");

  assert.match(detail, /payments\.status\.\$\{status\}/,
    "the raw status enum is never rendered untranslated");
  assert.ok(
    !/\}\s*\(\{currency\}\)/.test(detail) && !detail.includes(`({currency})`),
    "the currency must not be concatenated with parentheses in JSX"
  );
  assert.match(detail, /amountWithCurrency/, "currency lives inside the translation string");
  assert.match(detail, /isolateLtr\(currency\)/,
    "the currency code is an isolated LTR token inside Arabic copy");
  assert.match(detail, /refundEntry/,
    "refund amount + reason is one interpolated key per locale");
  assert.match(detail, /refundedTagWithAmount/,
    "the refunded tag + amount is one interpolated key");
  // Canonical identifiers stay pinned LTR through the mono Row slot.
  const monoRows = (detail.match(/\bmono\b/g) || []).length;
  assert.ok(monoRows >= 6, `id/method/moyasar/subscription/addon rows pin LTR, found ${monoRows}`);
  assert.ok(!/<Text[\s>]/.test(detail), "no plain Text bypass");
});

test("StatusBadge probes the payments status vocabulary as a gap filler", () => {
  const badge = read("components/admin-dashboard/common/StatusBadge.js");
  const groups = badge.split("STATUS_LABEL_GROUPS")[1];
  assert.ok(groups.includes('"payments.status"'),
    "payment-only statuses resolve to localized labels on list and detail");
});

// ── Moderators ──────────────────────────────────────────────────────────

test("AddModeratorModal: full field-direction contract", () => {
  const modal = read("components/admin-dashboard/moderators/AddModeratorModal.js");

  assert.ok(modal.includes("DirectionalTextInput"), "inputs go through the shared primitive");
  assert.match(modal, /contentDirection=\{CONTENT_DIRECTIONS\.ADAPTIVE\}/,
    "moderator name is arbitrary user content");
  assert.ok(modal.includes("LocalizedText"), "labels/errors/title/buttons are localized roles");
  assert.ok(modal.includes("secureTextEntry"), "password stays on its inferred LTR mode");
  assert.ok(modal.includes('keyboardType="phone-pad"'), "phone keeps the phone mode");
  // Required marker must be a nested run, never string concatenation.
  assert.ok(!modal.includes('+ " *"') && !modal.includes('" *" +'),
    "required marker must not be concatenated onto translated copy");
  assert.ok(!/<Text[\s>]/.test(modal), "no plain Text bypass");
  assert.ok(!/[\u0600-\u06FF]/.test(modal), "no direct Arabic UI literals");
});

test("ModeratorListItem: LTR phone detail and interpolated joined date", () => {
  const item = read("components/admin-dashboard/moderators/ModeratorListItem.js");
  assert.match(item, /isolateLtr\(phone\)/, "phone digits are LTR-isolated");
  assert.match(item, /ltr:\s*true/, "phone uses the shared LTR detail slot");
  assert.ok(item.includes('t("common.joinedDate"'), "joined date is one interpolated key");
});

test("AdminModeratorsScreen + ModeratorList: confirmations are interpolated keys", () => {
  const screen = read("screens/admin/admin-dashboard/AdminModeratorsScreen.js");
  const list = read("components/admin-dashboard/moderators/ModeratorList.js");

  for (const [rel, src] of [["screen", screen], ["list", list]]) {
    assert.ok(!/\}\s*"\s*\?/.test(src), `${rel} must not assemble alert sentences`);
    assert.ok(!/\$\{t\(/.test(src), `${rel} must not interpolate t() inside template strings`);
  }
  assert.match(screen, /moderators\.confirm\.(suspend|activate)/);
  assert.match(screen, /isolateAuto\(name\)/, "alert names are first-strong isolated");
  assert.match(screen, /moderators\.delete\.confirmMessage/);
});

// ── Locale resources ────────────────────────────────────────────────────

const INTERPOLATED_KEYS = [
  "businesses.actions.statusConfirmBody",
  "businesses.actions.deleteConfirmBody",
  "businessDetails.assignments.meta",
  "businessDetails.assignments.metaNoAmount",
  "paymentDetail.amountWithCurrency",
  "paymentDetail.refundedTagWithAmount",
  "paymentDetail.refundEntry",
];

const PAYMENT_STATUS_KEYS = [
  "authorized",
  "captured",
  "paid",
  "partially_refunded",
  "voided",
];

function dig(obj, dotted) {
  return dotted.split(".").reduce((acc, part) => (acc == null ? acc : acc[part]), obj);
}

test("interpolated business confirmation keys exist in BOTH bundles with their placeholders", () => {
  const ar = readJson("localization/locales/ar/admin.json");
  const en = readJson("localization/locales/en/admin.json");
  for (const key of INTERPOLATED_KEYS) {
    for (const [lang, bundle] of [["ar", ar], ["en", en]]) {
      const value = dig(bundle, key);
      assert.equal(typeof value, "string", `${lang}/admin.json -> ${key}`);
      assert.ok(value.trim().length > 0, `${lang}/admin.json -> ${key} is empty`);
    }
  }
  for (const placeholder of ["{{name}}", "{{action}}"]) {
    assert.ok(
      dig(en, INTERPOLATED_KEYS[0]).includes(placeholder),
      `en statusConfirmBody must contain ${placeholder}`
    );
    assert.ok(
      dig(ar, INTERPOLATED_KEYS[0]).includes(placeholder),
      `ar statusConfirmBody must contain ${placeholder}`
    );
    assert.ok(dig(en, INTERPOLATED_KEYS[1]).includes("{{name}}"),
      "en deleteConfirmBody must contain {{name}}");
    assert.ok(dig(ar, INTERPOLATED_KEYS[1]).includes("{{name}}"),
      "ar deleteConfirmBody must contain {{name}}");
  }
});

test("payment-only status labels exist in BOTH bundles", () => {
  const ar = readJson("localization/locales/ar/admin.json");
  const en = readJson("localization/locales/en/admin.json");
  for (const key of PAYMENT_STATUS_KEYS) {
    assert.equal(typeof dig(ar, `payments.status.${key}`), "string", `ar -> ${key}`);
    assert.equal(typeof dig(en, `payments.status.${key}`), "string", `en -> ${key}`);
  }
});

test("detail-screen interpolation keys resolve through real i18next", async () => {
  const ar = readJson("localization/locales/ar/admin.json");
  const en = readJson("localization/locales/en/admin.json");
  const i18next = require("i18next");
  const instance = i18next.createInstance();
  await instance.init({
    lng: "ar",
    fallbackLng: "ar",
    compatibilityJSON: "v4",
    resources: { ar: { admin: ar }, en: { admin: en } },
  });

  // Arabic meta line keeps the logical order mode → amount → date and embeds
  // the isolated LTR amount token verbatim.
  const meta = instance.t("admin:businessDetails.assignments.meta", {
    mode: "منح مباشر",
    amount: "\u20661200 SAR\u2069",
    date: "١٥ أغسطس ٢٠٢٦",
  });
  assert.ok(meta.indexOf("منح مباشر") < meta.indexOf("SAR"), "mode precedes the amount in Arabic");
  assert.ok(meta.includes("١٥ أغسطس"), "the localized date is embedded");

  const enAmount = instance.t("admin:paymentDetail.amountWithCurrency", {
    currency: "SAR",
    lng: "en",
  });
  assert.equal(enAmount, "Amount (SAR)");

  const enRefund = instance.t("admin:paymentDetail.refundEntry", {
    amount: "SAR 50.00",
    reason: "duplicate charge",
    lng: "en",
  });
  assert.equal(enRefund, "SAR 50.00 — duplicate charge");

  const arPaid = instance.t("admin:payments.status.paid");
  assert.ok(arPaid.length > 0 && !arPaid.includes("paid"), "Arabic paid label resolves");

  const enVoided = instance.t("admin:payments.status.voided", { lng: "en" });
  assert.equal(enVoided, "Voided");
});

test("moderator confirmations resolve through real i18next interpolation", async () => {
  const ar = readJson("localization/locales/ar/admin.json");
  const en = readJson("localization/locales/en/admin.json");
  const i18next = require("i18next");
  const instance = i18next.createInstance();
  await instance.init({
    lng: "ar",
    fallbackLng: "ar",
    compatibilityJSON: "v4",
    resources: { ar: { admin: ar }, en: { admin: en } },
  });

  const arSuspend = instance.t("admin:moderators.confirm.suspend", {
    name: "\u0639\u0644\u064A",
  });
  assert.ok(arSuspend.includes("\u0639\u0644\u064A"), "Arabic body embeds the isolated name");
  assert.ok(!arSuspend.includes("{{name}}"), "placeholder must resolve, not print");

  const enDelete = instance.t("admin:moderators.delete.confirmMessage", {
    name: "Ali",
    lng: "en",
  });
  assert.ok(enDelete.includes("Ali"), "English delete body embeds the name");
});
