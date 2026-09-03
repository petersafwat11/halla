import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SUPPORT_SOURCE,
  buildSupportMessage,
  buildSupportRequest,
  validateSupportReference,
} from "../src/support/index.js";
import { LEGAL_CONTACT } from "../src/legal/contact.js";

test("SUPPORT_SOURCE enum defines expected source values", () => {
  assert.equal(SUPPORT_SOURCE.MANAGED_EVENT, "managed_event");
  assert.equal(SUPPORT_SOURCE.HOME_HEADER, "home_header");
  assert.equal(SUPPORT_SOURCE.EVENT_DETAILS, "event_details");
  assert.equal(SUPPORT_SOURCE.ADDON_FULFILLMENT, "addon_fulfillment");
  assert.equal(SUPPORT_SOURCE.GENERAL, "general");
});

test("validateSupportReference accepts valid references", () => {
  assert.equal(validateSupportReference(null), null);
  assert.equal(validateSupportReference(undefined), null);

  const eventRef = validateSupportReference({ kind: "event", value: "evt_12345" });
  assert.deepEqual(eventRef, { kind: "event", value: "evt_12345" });

  const addonRef = validateSupportReference({ kind: "addon", value: "addon-67890" });
  assert.deepEqual(addonRef, { kind: "addon", value: "addon-67890" });

  const reqRef = validateSupportReference({ kind: "request", value: "REQ_ABCD" });
  assert.deepEqual(reqRef, { kind: "request", value: "REQ_ABCD" });
});

test("validateSupportReference rejects invalid kinds or values with PII/special characters", () => {
  assert.throws(() => validateSupportReference("not an object"), TypeError);
  assert.throws(() => validateSupportReference({ kind: "unknown", value: "123" }), /Invalid support reference kind/);
  assert.throws(() => validateSupportReference({ kind: "event", value: "user@example.com" }), /invalid token/i);
  assert.throws(() => validateSupportReference({ kind: "event", value: "+966555123456" }), /invalid token/i);
  assert.throws(() => validateSupportReference({ kind: "event", value: "has spaces in id" }), /invalid token/i);
  assert.throws(() => validateSupportReference({ kind: "event", value: "line1\nline2" }), /invalid token/i);
  assert.throws(() => validateSupportReference({ kind: "event", value: "a".repeat(65) }), /invalid token/i);
});

test("buildSupportMessage formats localized messages with and without reference", () => {
  // Managed event
  const arManaged = buildSupportMessage({
    language: "ar",
    source: SUPPORT_SOURCE.MANAGED_EVENT,
    reference: { kind: "event", value: "evt_999" },
  });
  assert.ok(arManaged.includes("دعوتك علينا"));
  assert.ok(arManaged.includes("رقم المناسبة: evt_999"));

  const enManaged = buildSupportMessage({
    language: "en",
    source: SUPPORT_SOURCE.MANAGED_EVENT,
    reference: { kind: "event", value: "evt_999" },
  });
  assert.ok(enManaged.includes("managed event service"));
  assert.ok(enManaged.includes("Event ID: evt_999"));

  // Home header without reference
  const arHome = buildSupportMessage({ language: "ar", source: SUPPORT_SOURCE.HOME_HEADER });
  assert.ok(arHome.includes("مساعدة بخصوص حسابي"));
  assert.ok(!arHome.includes("رقم المناسبة"));

  // Addon fulfillment
  const arAddon = buildSupportMessage({
    language: "ar",
    source: SUPPORT_SOURCE.ADDON_FULFILLMENT,
    reference: { kind: "addon", value: "660c1234abcd" },
  });
  assert.ok(arAddon.includes("طلب التصميم"));
  assert.ok(arAddon.includes("رقم الطلب: 660c1234abcd"));
});

test("buildSupportRequest constructs compliant deepLinkUrl, webUrl, and displayNumber", () => {
  const result = buildSupportRequest({
    language: "ar",
    source: SUPPORT_SOURCE.MANAGED_EVENT,
    reference: { kind: "event", value: "evt_123" },
  });

  const cleanNumber = LEGAL_CONTACT.whatsapp.value.replace(/\D/g, "");
  assert.equal(result.displayNumber, LEGAL_CONTACT.whatsapp.display);
  assert.ok(result.deepLinkUrl.startsWith(`whatsapp://send?phone=${cleanNumber}&text=`));
  assert.ok(result.webUrl.startsWith(`https://wa.me/${cleanNumber}?text=`));

  // Verify decoded URL query parameter matches text
  const urlObj = new URL(result.webUrl);
  assert.equal(urlObj.searchParams.get("text"), result.text);
});
