/**
 * Plans / summary / checkout direction contract (blueprint §8 rows
 * "Plans catalog" + "Checkout/summary", Priority 3 targets).
 *
 * Source-level assertions keep the whole component tree on the shared
 * contract: atomic price/count tokens, isolated store names, localized text
 * roles, LTR token fields, and no physical/row-reverse regressions.
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "../..");

const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

test("CurrentPlanCard: counts are locale-formatted ratio tokens and progress grows from start", () => {
  const src = read("components/plans/CurrentPlanCard.js");

  assert.ok(
    !src.includes("${used} / ${limit}"),
    "raw used/limit template must not come back — use countRatioToken"
  );
  assert.ok(src.includes("countRatioToken("), "stat values must be shared ratio tokens");
  assert.ok(src.includes("invitationBalance?.consumed"), "used invites must come from the canonical balance");
  assert.ok(src.includes("invitationBalance?.total"), "invite capacity must come from the canonical balance");
  assert.doesNotMatch(src, /subscription\.(?:invitePool|invitesConsumed)/);
  assert.ok(src.includes("countToken(singleValue"), "single numeric values (days) must be formatted tokens");
  assert.ok(/progressBar:\s*{[\s\S]*?alignItems:\s*"flex-start"/.test(src), "progress fill origin must be the logical start");
});

test("PlanSummaryCard: no JSX label+number concatenation; rows are interpolated keys", () => {
  const src = read("components/plans/PlanSummaryCard.js");
  assert.ok(!src.includes("`${isolateLtr(baseInvites)} ${t("), "invite label must move to an i18n key");
  assert.ok(src.includes('t("summary.poolInvitesRow"'), "pool invites row uses interpolation key");
  assert.ok(src.includes('t("summary.baseInvitesRow"'), "base invites row uses interpolation key");
  assert.ok(src.includes('t("summary.extraInvitesRow"'), "extra invites row uses interpolation key");
  assert.ok(src.includes('t("summary.compensationInvitesRow"'), "compensation row uses interpolation key");
  assert.ok(src.includes("AdaptiveText"), "backend plan name must follow its own script");
});

test("PaymentSummaryCard: every amount is an isolated token; minus sign stays glued", () => {
  const src = read("components/plans/PaymentSummaryCard.js");
  assert.ok(src.includes("priceToken(planPrice, sar)"), "plan row must use priceToken");
  assert.ok(src.includes("priceToken(addonTotal, sar)"), "addons row must use priceToken");
  assert.ok(src.includes("`-${formatSar(discountAmount"), "discount builds one -amount token");
  assert.ok(!src.includes("`${formatSar(planPrice"), "no raw concatenation may return");
});

test("DisclosureList + AddonsPurchaseScreen: store names isolated in Arabic copy", () => {
  const list = read("components/plans/DisclosureList.js");
  assert.ok(list.includes("isolateLtrTokens("), "disclosures must reuse the legal-token isolation");
  const screen = read("screens/host/AddonsPurchaseScreen.js");
  assert.ok(screen.includes("isolateLtrTokens("), "section disclosures isolate store tokens too");
  assert.ok(screen.includes("isolateLtr(readiness.priceString)"), "store price strings render as LTR tokens");
  assert.ok(screen.includes("AdaptiveText"), "bilingual backend addon names follow their own script");
});

test("DiscountCodeCard: code field is an explicit LTR token field with localized chrome", () => {
  const src = read("components/plans/DiscountCodeCard.js");
  assert.ok(src.includes('contentDirection="ltr"'), "code input declares ltr mode explicitly");
  assert.ok(src.includes("isolateLtr(appliedCode)"), "applied code is isolated inside the sentence");
  assert.ok(src.includes("isolateLtr(formattedAmount)"), "applied amount is isolated inside the sentence");
  assert.ok(src.includes("AdaptiveText"), "backend validation reason follows its own script");
  assert.ok(src.includes("LocalizedText"), "success line stays locale-directed");
});

test("PaymentMethodSelector: labels/errors use the shared field-direction chrome", () => {
  const src = read("components/plans/PaymentMethodSelector.js");
  assert.ok(src.includes("useFieldDirection("), "selector must use the shared contract");
  const labelCount = (src.match(/\[fieldChrome\.text, styles\.label\]/g) || []).length;
  const errorCount = (src.match(/\[fieldChrome\.text, styles\.errorText\]/g) || []).length;
  assert.ok(labelCount >= 5, `all labels migrated (${labelCount})`);
  assert.ok(errorCount >= 5, `all errors migrated (${errorCount})`);
  assert.ok(!src.includes('"Expiry date")'), "no inline English literal fallbacks");
});

test("PurchaseStatusModal: centered copy still pins writing direction via LocalizedText", () => {
  const src = read("components/plans/PurchaseStatusModal.js");
  const centered = (src.match(/<LocalizedText center/g) || []).length;
  assert.ok(centered >= 4, `title/body/action/hint use centered LocalizedText (${centered})`);
});

test("PlansSummaryScreen: atomic footer total and zero direct UI literals", () => {
  const src = read("screens/host/PlansSummaryScreen.js");
  assert.ok(src.includes('priceToken(finalTotal, t("summary.currency"))'), "footer total is one atomic token");
  assert.ok(!src.includes("إعادة المحاولة"), "Arabic literal removed from source");
  for (const literal of [
    '"Cardholder name is required"',
    '"Card number is required"',
    '"CVC is required"',
    '"Mobile number is required"',
    '"Restore Purchases"',
    '"Manage subscription"',
    '"Purchases restored"',
    '"Restoring..."',
  ]) {
    assert.ok(!src.includes(literal), `English literal fallback removed: ${literal}`);
  }
});

test("plans locales: interpolation keys exist with AR/EN parity", async () => {
  const ar = JSON.parse(fs.readFileSync(path.join(root, "localization/locales/ar/plans.json"), "utf8"));
  const en = JSON.parse(fs.readFileSync(path.join(root, "localization/locales/en/plans.json"), "utf8"));
  for (const key of ["baseInvitesRow", "poolInvitesRow", "extraInvitesRow", "compensationInvitesRow"]) {
    assert.ok(ar.summary[key], `ar.summary.${key} missing`);
    assert.ok(en.summary[key], `en.summary.${key} missing`);
  }
});

/* ------------------------------------------------------------------ */
/* Plans catalog screens (Individual + Business)                       */
/* ------------------------------------------------------------------ */

test("PlansScreen: billing pills and chrome copy use LocalizedText", () => {
  const src = read("screens/host/PlansScreen.js");
  assert.ok(src.includes("<LocalizedText"), "screen chrome must use LocalizedText");
  assert.ok(
    src.includes("styles.billingPillText") && src.includes("LocalizedText"),
    "billing pill labels must pin writing direction"
  );
  assert.ok(
    !/<Text\s+style=\{(?:\[[^\]]*\])?styles\.billingPillText/.test(src),
    "billing pill labels must not render through plain Text"
  );
  assert.ok(!src.includes("row-reverse"), "no row-reverse on plans screen");
});

test("BusinessPlansScreen: every visible t() string renders via LocalizedText", () => {
  const src = read("screens/host/BusinessPlansScreen.js");
  for (const marker of [
    "loadingText",
    "errorText",
    "retryButtonText",
    "pendingTitle",
    "pendingSubtitle",
    "tierPillText",
    "emptyText",
  ]) {
    const plainRe = new RegExp(`<Text\\s+style=\\{(?:\\[[^\\]]*\\])?styles\\.${marker}`);
    assert.ok(!plainRe.test(src), `${marker} must not render through plain Text`);
  }
  assert.ok(src.includes('import LocalizedText'), "screen imports the shared localized primitive");
  // Localized copy only — the screen has no adaptive/LTR values of its own.
  const plainCount = (src.match(/<Text[\s>]/g) || []).length;
  assert.equal(plainCount, 0, `no plain Text remains (${plainCount})`);
});

/* ------------------------------------------------------------------ */
/* Checkout summary footer/method chrome                               */
/* ------------------------------------------------------------------ */

test("PlansSummaryScreen: remaining plain Text is limited to isolated price tokens", () => {
  const src = read("screens/host/PlansSummaryScreen.js");
  const plainTextSlots = src.match(/<Text\s+style=\{([^}]*)\}/g) || [];
  assert.ok(
    plainTextSlots.every((slot) => slot.includes("footerTotalAmount")),
    `plain Text allowed only for atomic price tokens, found: ${plainTextSlots.join(" | ")}`
  );
  for (const marker of ["methodCardTitle", "footerTotalLabel", "proceedButtonText"]) {
    assert.ok(
      !new RegExp(`<Text\\\\s+style=\\\\{[^}]*${marker}`).test(src),
      `${marker} must use LocalizedText`
    );
  }
  const localizedCentered = (src.match(/<LocalizedText/g) || []).length;
  assert.ok(localizedCentered >= 6, `localized chrome present (${localizedCentered})`);
});

/* ------------------------------------------------------------------ */
/* Add-ons purchase surface                                            */
/* ------------------------------------------------------------------ */

test("AddonsPurchaseScreen: history rows interpolate a translation key, not JSX concatenation", () => {
  const screen = read("screens/host/AddonsPurchaseScreen.js");
  assert.ok(screen.includes('t("addons.history.itemRow"'), "history row uses one interpolation key");
  assert.ok(
    !screen.includes("` · ${"),
    "no manual 'label · count' JSX concatenation may return"
  );
});

test("AddonsPurchaseScreen: chrome copy is localized; mixed slots are adaptive", () => {
  const screen = read("screens/host/AddonsPurchaseScreen.js");
  const plainRe = /<Text\s+style=/g;
  assert.ok(!plainRe.test(screen), "no plain Text slots remain — tokens/adaptive/localized only");
  assert.ok(screen.includes("<AdaptiveText style={styles.addonPrice}>"), "price/unavailable slot follows its own script");
});

test("plans locales: addons.history.itemRow exists with AR/EN parity", () => {
  const ar = JSON.parse(fs.readFileSync(path.join(root, "localization/locales/ar/plans.json"), "utf8"));
  const en = JSON.parse(fs.readFileSync(path.join(root, "localization/locales/en/plans.json"), "utf8"));
  assert.ok(ar.addons?.history?.itemRow, "ar add-ons history itemRow missing");
  assert.ok(en.addons?.history?.itemRow, "en add-ons history itemRow missing");
  assert.ok(ar.addons.history.itemRow.includes("{{count}}"), "ar itemRow interpolates count");
  assert.ok(en.addons.history.itemRow.includes("{{label}}"), "en itemRow interpolates label");
});

/* ------------------------------------------------------------------ */
/* Payments history                                                    */
/* ------------------------------------------------------------------ */

test("PaymentsScreen: amounts/refunds are atomic isolated tokens", () => {
  const src = read("screens/host/PaymentsScreen.js");
  assert.ok(src.includes("priceToken(item.amount, item.currency)"), "base amount is one atomic token");
  assert.ok(src.includes("isolateLtr(\n        `(- "), "refund keeps minus+parentheses inside one LTR isolate");
  assert.ok(
    !src.includes("${item.amount}") && !src.includes("`${base} (-"),
    "raw amount concatenation must not return"
  );
});

test("PaymentsScreen: service name adaptive, transaction id LTR-isolated, pager ratio token", () => {
  const src = read("screens/host/PaymentsScreen.js");
  assert.ok(src.includes("<AdaptiveText style={styles.service}"), "backend service name follows its own script");
  assert.ok(src.includes("isolateLtr(item.transactionId)"), "transaction id is an LTR token");
  assert.match(src, /ltrToken:\s*{[\s\S]*?writingDirection:\s*"ltr"/, "transaction id pins ltr writing direction");
  assert.ok(
    src.includes("countRatioToken(pagination.page, pagination.pages, currentLanguage)"),
    "page/pages ratio is one locale-formatted token"
  );
  assert.ok(
    !src.includes("${pagination.page} /"),
    "raw page ratio template must not return"
  );
});

test("PaymentsScreen: reuses the shared StatusBadge with payment domain + localized label", () => {
  const src = read("screens/host/PaymentsScreen.js");
  assert.ok(
    src.includes('from "../../components/admin-dashboard/common/StatusBadge"'),
    "local duplicate badge removed in favour of the shared primitive"
  );
  assert.ok(src.includes('domain="payment"'), "payment tone overrides apply (completed = success)");
  assert.ok(
    src.includes("t(`table.status.${item.status}`"),
    "badge label comes from the payments locale subtree"
  );
  assert.ok(!src.includes("STATUS_COLORS"), "local color map removed — shared statusColors owns tones");
});

test("PaymentsScreen: filter chips, dates and empty/error/pager chrome stay localized", () => {
  const src = read("screens/host/PaymentsScreen.js");
  const plainRe = /<Text\s+style=\{(?:\[[^\]]*\])?styles\.(filterChipText|errorText|emptyText|pagerBtnText|date)/;
  assert.ok(!plainRe.test(src), "localized chrome must not render through plain Text");
  assert.ok(src.includes("formatDateTime(iso, currentLanguage)"), "dates keep the shared locale formatter");
});

/* ------------------------------------------------------------------ */
/* Payment return / processing result                                  */
/* ------------------------------------------------------------------ */

test("PaymentReturnScreen: title/body/status/action all pin writing direction", () => {
  const src = read("screens/host/PaymentReturnScreen.js");
  const centered = (src.match(/<LocalizedText center/g) || []).length;
  assert.ok(centered >= 5, `title/body/status/btn localized & centered (${centered})`);
  const plainRe = /<Text\s+style=\{styles\.(title|body|statusText|btnText)\}/g;
  assert.ok(!plainRe.test(src), "processing/result copy must not render through plain Text");
});

/* ------------------------------------------------------------------ */
/* Shared legal links used by checkout                                 */
/* ------------------------------------------------------------------ */

test("LegalLinks (checkout legal links): link labels follow the UI locale", () => {
  const src = read("components/legal/LegalLinks.js");
  assert.ok(src.includes("LocalizedText"), "legal link chrome uses the shared localized primitive");
  const plainRe = /<Text\s+style=\{styles\.(prefix|link|sep)\}/g;
  assert.ok(!plainRe.test(src), "link labels/separators must not render through plain Text");
});

test("plans component tree resolves every text-primitive import (no phantom common/AdaptiveText)", () => {
  const tree = [
    "screens/host/PlansScreen.js",
    "screens/host/BusinessPlansScreen.js",
    "screens/host/PlansSummaryScreen.js",
    "screens/host/AddonsPurchaseScreen.js",
    "screens/host/PaymentsScreen.js",
    "screens/host/PaymentReturnScreen.js",
    "components/plans/BusinessPlanCard.js",
    "components/legal/LegalLinks.js",
  ];
  for (const rel of tree) {
    const src = read(rel);
    const imports = [...src.matchAll(/from\s+"([^"]*AdaptiveText)"|from\s+"([^"]*LocalizedText)"/g)];
    for (const match of imports) {
      const specifier = match[1] || match[2];
      assert.ok(
        !specifier.includes("/common/"),
        `${rel} imports "${specifier}" — the shared text primitives live under components/commen`
      );
    }
    assert.ok(
      fs.existsSync(path.join(root, rel)),
      `${rel} must exist`
    );
  }
});
