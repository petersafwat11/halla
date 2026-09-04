import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  deriveSupportReference,
  presentError,
  formatErrorDisplay,
} from "@halaa/shared/errors";
import { UPLOAD_LIMITS } from "@halaa/shared/constants";

const read = (relPath) => readFile(new URL(relPath, import.meta.url), "utf8");

test("PR3: upload limits in mobile match shared package contract", async () => {
  const imageUtilsSrc = await read("../../utils/invitationImage.js");

  assert.match(imageUtilsSrc, /import\s*\{\s*UPLOAD_LIMITS\s*\}\s*from\s*["']@halaa\/shared\/constants["']/);
  assert.match(imageUtilsSrc, /export\s+const\s+INVITATION_UPLOAD_TARGET_BYTES\s*=\s*UPLOAD_LIMITS\.CLIENT_INVITATION_TARGET_BYTES/);
  assert.match(imageUtilsSrc, /export\s+const\s+INVITATION_MAX_DIMENSION\s*=\s*UPLOAD_LIMITS\.INVITATION_MAX_DIMENSION/);

  assert.ok(UPLOAD_LIMITS.CLIENT_INVITATION_TARGET_BYTES < UPLOAD_LIMITS.SERVER_INVITATION_MAX_BYTES);
});

test("PR3: normalizeInvitationImage tags irreducible oversize with EVENT_IMAGE_TOO_LARGE", async () => {
  const imageUtilsSrc = await read("../../utils/invitationImage.js");

  assert.match(imageUtilsSrc, /err\.code\s*=\s*["']EVENT_IMAGE_TOO_LARGE["']/);
  assert.match(imageUtilsSrc, /throw\s+err;/);
  assert.match(imageUtilsSrc, /INVITATION_IMAGE_MISSING/);
});

test("F-16 / PR3: deriveSupportReference derives deterministic 12-char alphanumeric reference", () => {
  const fullUuid = "2cd3eb78-d7fb-4a7b-b611-173e35b66cdc";
  const ref = deriveSupportReference(fullUuid);
  assert.equal(ref.length, 12);
  assert.match(ref, /^[A-Z0-9]{12}$/);
  assert.equal(deriveSupportReference(fullUuid), ref);
});

test("F-16 / PR3: presentError maps mobile error codes without exposing raw UUIDs in visible message", () => {
  const fullUuid = "e306db51-5a6c-4155-b5dc-868c51860240";
  const errorPayload = {
    code: "EVENT_IMAGE_TOO_LARGE",
    message: "File too large. Maximum size is 10 MB.",
    requestId: fullUuid,
    status: 400,
  };

  const presentedAr = presentError(errorPayload, { language: "ar" });
  assert.equal(presentedAr.code, "EVENT_IMAGE_TOO_LARGE");
  assert.equal(presentedAr.fullRequestId, fullUuid);
  assert.equal(presentedAr.supportReference.length, 12);
  assert.ok(!presentedAr.actionMessage.includes(fullUuid));

  const displayAr = formatErrorDisplay(presentedAr, "ar");
  assert.ok(!displayAr.includes(fullUuid), "Formatted display must never leak raw UUID");
  assert.ok(displayAr.includes(presentedAr.supportReference), "Formatted display includes 12-char reference");

  const presentedEn = presentError(errorPayload, { language: "en" });
  assert.equal(presentedEn.code, "EVENT_IMAGE_TOO_LARGE");
  assert.ok(!presentedEn.actionMessage.includes(fullUuid));
  const displayEn = formatErrorDisplay(presentedEn, "en");
  assert.ok(!displayEn.includes(fullUuid));
  assert.ok(displayEn.includes(presentedEn.supportReference));
});

test("PR3: CreateEventScreen and CreateEventForm never expose raw UUID in visible copy", async () => {
  const [screenSrc, formSrc] = await Promise.all([
    read("../../screens/common/CreateEventScreen.js"),
    read("../../components/admin-dashboard/events/CreateEventForm.js"),
  ]);

  assert.match(screenSrc, /formatErrorDisplay/);
  assert.match(formSrc, /formatErrorDisplay/);

  assert.doesNotMatch(screenSrc, /toast\.error\(.*requestId.*\)/);
  assert.doesNotMatch(formSrc, /Alert\.alert\(.*err\.requestId.*\)/);
});

test("PR3: CreateEventForm generates one idempotency key per attempt and invalidates on edit", async () => {
  const formSrc = await read("../../components/admin-dashboard/events/CreateEventForm.js");

  assert.match(formSrc, /idempotencyKeyRef\s*=\s*useRef\(null\)/);
  assert.match(formSrc, /isSubmittingRef\s*=\s*useRef\(false\)/);

  assert.match(formSrc, /methods\.watch/);
  assert.match(formSrc, /idempotencyKeyRef\.current\s*=\s*null/);

  assert.match(formSrc, /if\s*\(isSubmittingRef\.current\)\s*return;/);

  assert.match(formSrc, /elapsedSeconds\s*>=\s*5/);
  assert.match(formSrc, /slowNotice/);

  assert.match(formSrc, /const formDataObj = new FormData\(\);/);
});

test("PR3: StepThree uses presentError to show deterministic error message on image failure", async () => {
  const stepThreeSrc = await read("../../components/createEvent/StepThree.js");

  assert.match(stepThreeSrc, /import\s*\{\s*presentError\s*\}\s*from\s*["']@halaa\/shared\/errors["']/);
  assert.match(stepThreeSrc, /presentError\(err,\s*\{\s*language:\s*locale/);
});

test("PR3: mutations pass Idempotency-Key header", async () => {
  const [useEventMutSrc, adminMutSrc] = await Promise.all([
    read("../../hooks/events/mutations/useEventMutation.js"),
    read("../../hooks/admin/mutations.js"),
  ]);

  assert.match(useEventMutSrc, /headers\["Idempotency-Key"\]\s*=\s*idempotencyKey/);
  assert.match(adminMutSrc, /"Idempotency-Key":\s*idempotencyKey/);
});
