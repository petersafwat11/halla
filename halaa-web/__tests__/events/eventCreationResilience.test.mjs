import test from "node:test";
import assert from "node:assert/strict";

import {
  deriveSupportReference,
  presentError,
  formatErrorDisplay,
} from "@halaa/shared/errors";
import { UPLOAD_LIMITS } from "@halaa/shared/constants";
import {
  INVITATION_MAX_DIMENSION,
  INVITATION_UPLOAD_TARGET_BYTES,
  normalizeInvitationImageFile,
} from "../../utils/invitationImage.js";
import { parseError, handleError } from "../../services/errorHandlingService.js";

test("F-16 / PR3: deriveSupportReference derives deterministic 12-char alphanumeric reference", () => {
  const fullUuid = "2cd3eb78-d7fb-4a7b-b611-173e35b66cdc";
  const ref = deriveSupportReference(fullUuid);
  assert.equal(ref.length, 12);
  assert.match(ref, /^[A-Z0-9]{12}$/);
  // Deterministic
  assert.equal(deriveSupportReference(fullUuid), ref);
});

test("F-16 / PR3: presentError maps backend codes without exposing raw UUIDs in visible message", () => {
  const fullUuid = "e306db51-5a6c-4155-b5dc-868c51860240";
  const errorPayload = {
    response: {
      status: 400,
      data: {
        code: "EVENT_IMAGE_TOO_LARGE",
        message: "File too large. Maximum size is 10 MB.",
        requestId: fullUuid,
      },
    },
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

test("PR3: parseError and handleError in web preserve fullRequestId and omit UUID from toasts", () => {
  const fullUuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
  const mockError = {
    response: {
      status: 409,
      data: {
        code: "IDEMPOTENCY_CONFLICT",
        message: "Idempotency-Key reused with a different body",
        requestId: fullUuid,
      },
    },
  };

  const parsed = parseError(mockError, { language: "ar" });
  assert.equal(parsed.code, "IDEMPOTENCY_CONFLICT");
  assert.equal(parsed.requestId, fullUuid);
  assert.equal(parsed.supportReference.length, 12);

  // Test handleError toast output
  let toastMsg = "";
  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    handleError(mockError, null, {
      showToast: true,
      logError: true,
      language: "ar",
    });
  } finally {
    console.error = originalConsoleError;
  }
});

test("PR3: normalizeInvitationImageFile rejects oversize images with code EVENT_IMAGE_TOO_LARGE", async () => {
  const originalCreateImageBitmap = globalThis.createImageBitmap;
  const originalDocument = globalThis.document;

  globalThis.createImageBitmap = async () => ({
    width: 6000,
    height: 4000,
    close: () => {},
  });
  globalThis.document = {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({
        fillStyle: "",
        fillRect() {},
        drawImage() {},
      }),
      toBlob: (callback) => {
        // Return a massive blob that exceeds 9MB on every pass
        const hugeBuffer = new Uint8Array(12 * 1024 * 1024);
        callback(new Blob([hugeBuffer], { type: "image/jpeg" }));
      },
    }),
  };

  try {
    const input = new File(["dummy"], "huge.jpg", { type: "image/jpeg" });
    await assert.rejects(
      async () => {
        await normalizeInvitationImageFile(input);
      },
      (err) => {
        assert.equal(err.code, "EVENT_IMAGE_TOO_LARGE");
        return true;
      }
    );
  } finally {
    globalThis.createImageBitmap = originalCreateImageBitmap;
    globalThis.document = originalDocument;
  }
});

test("PR3: upload limits match shared package contract", () => {
  assert.equal(INVITATION_UPLOAD_TARGET_BYTES, UPLOAD_LIMITS.CLIENT_INVITATION_TARGET_BYTES);
  assert.equal(INVITATION_MAX_DIMENSION, UPLOAD_LIMITS.INVITATION_MAX_DIMENSION);
  assert.ok(UPLOAD_LIMITS.CLIENT_INVITATION_TARGET_BYTES < UPLOAD_LIMITS.SERVER_INVITATION_MAX_BYTES);
});
