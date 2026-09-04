import test from "node:test";
import assert from "node:assert/strict";

import {
  deriveSupportReference,
  presentError,
  formatErrorDisplay,
} from "../src/errors/errorPresenter.js";
import { validateSupportReference } from "../src/support/supportContact.js";

test("deriveSupportReference: returns empty string for empty / nullish values", () => {
  assert.equal(deriveSupportReference(null), "");
  assert.equal(deriveSupportReference(undefined), "");
  assert.equal(deriveSupportReference(""), "");
  assert.equal(deriveSupportReference("   "), "");
});

test("deriveSupportReference: derives a 12-character uppercase alphanumeric reference from UUID", () => {
  const fullUuid = "c8110f3e-a0e1-4248-993c-5b88c1f85e0b";
  const ref = deriveSupportReference(fullUuid);

  assert.equal(ref.length, 12);
  assert.match(ref, /^[A-Z0-9]{12}$/);
  assert.equal(ref, "C8110F3EA0E1");

  // Must be deterministic
  assert.equal(deriveSupportReference(fullUuid), ref);

  // Must pass support reference validation as request kind
  const validated = validateSupportReference({ kind: "request", value: ref });
  assert.equal(validated.value, ref);
});

test("deriveSupportReference: handles request IDs and strips non-alphanumeric chars", () => {
  const reqId = "req_1725458291024_a1b2c3d4";
  const ref = deriveSupportReference(reqId);

  assert.equal(ref.length, 12);
  assert.match(ref, /^[A-Z0-9]{12}$/);
  assert.equal(ref, "REQ172545829");
});

test("deriveSupportReference: pads short IDs deterministically to 12 chars", () => {
  const shortId = "abc";
  const ref = deriveSupportReference(shortId);

  assert.equal(ref.length, 12);
  assert.match(ref, /^[A-Z0-9]{12}$/);
  assert.ok(ref.startsWith("ABC"));
  assert.equal(deriveSupportReference(shortId), ref);
});

test("presentError: maps EVENT_IMAGE_TOO_LARGE and LIMIT_FILE_SIZE to actionable Arabic/English text", () => {
  const err = { code: "EVENT_IMAGE_TOO_LARGE", requestId: "c8110f3e-a0e1-4248-993c-5b88c1f85e0b" };
  const ar = presentError(err, { language: "ar" });
  const en = presentError(err, { language: "en" });

  assert.equal(ar.code, "EVENT_IMAGE_TOO_LARGE");
  assert.equal(ar.supportReference, "C8110F3EA0E1");
  assert.equal(ar.fullRequestId, "c8110f3e-a0e1-4248-993c-5b88c1f85e0b");
  assert.equal(ar.isRetryable, true);
  assert.match(ar.actionMessage, /حجم صورة الدعوة كبير جداً/);
  assert.match(en.actionMessage, /The invitation image is too large/);

  // formatErrorDisplay must never include the raw UUID
  const arDisplay = formatErrorDisplay(ar, "ar");
  const enDisplay = formatErrorDisplay(en, "en");

  assert.ok(!arDisplay.includes("c8110f3e-a0e1-4248-993c-5b88c1f85e0b"));
  assert.ok(!enDisplay.includes("c8110f3e-a0e1-4248-993c-5b88c1f85e0b"));
  assert.match(arDisplay, /رقم المرجع:\s*C8110F3EA0E1/);
  assert.match(enDisplay, /Reference ID:\s*C8110F3EA0E1/);
});

test("presentError: maps EVENT_IMAGE_UNPROCESSABLE and decode/encode failures", () => {
  const err = { code: "EVENT_IMAGE_UNPROCESSABLE" };
  const ar = presentError(err, { language: "ar" });
  const en = presentError(err, { language: "en" });

  assert.equal(ar.code, "EVENT_IMAGE_UNPROCESSABLE");
  assert.match(ar.actionMessage, /تعذر معالجة صورة الدعوة/);
  assert.match(en.actionMessage, /Could not process the invitation image/);
  assert.equal(ar.isRetryable, true);
});

test("presentError: maps EVENT_CREATE_TIMEOUT and timeout errors with form preservation note", () => {
  const err = { code: "EVENT_CREATE_TIMEOUT" };
  const ar = presentError(err, { language: "ar" });
  const en = presentError(err, { language: "en" });

  assert.equal(ar.code, "EVENT_CREATE_TIMEOUT");
  assert.match(ar.actionMessage, /بياناتك محفوظة/);
  assert.match(en.actionMessage, /Your form data is saved/);
  assert.equal(ar.isRetryable, true);
});

test("presentError: maps IDEMPOTENCY_CONFLICT and IDEMPOTENCY_PENDING", () => {
  const conflict = presentError({ code: "IDEMPOTENCY_CONFLICT", status: 409 });
  assert.equal(conflict.code, "IDEMPOTENCY_CONFLICT");
  assert.equal(conflict.isRetryable, false);
  assert.match(conflict.actionMessage, /تم إرسال طلب مكرر ببيانات مختلفة/);

  const pending = presentError({ code: "IDEMPOTENCY_PENDING" });
  assert.equal(pending.code, "IDEMPOTENCY_PENDING");
  assert.equal(pending.isRetryable, true);
  assert.match(pending.actionMessage, /جاري إنشاء المناسبة حالياً/);
});

test("presentError: preserves fullRequestId for telemetry without leaking to display", () => {
  const fullUuid = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
  const presented = presentError({
    status: 500,
    requestId: fullUuid,
  });

  assert.equal(presented.fullRequestId, fullUuid);
  assert.equal(presented.supportReference, "F47AC10B58CC");

  const display = formatErrorDisplay(presented, "ar");
  assert.ok(display.includes("F47AC10B58CC"));
  assert.ok(!display.includes(fullUuid));
});
