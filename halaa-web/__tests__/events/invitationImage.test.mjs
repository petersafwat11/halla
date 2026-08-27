import test from "node:test";
import assert from "node:assert/strict";

import {
  INVITATION_MAX_DIMENSION,
  INVITATION_UPLOAD_TARGET_BYTES,
  normalizeInvitationImageFile,
} from "../../utils/invitationImage.js";

test("invitation images are downscaled and encoded below the upload boundary", async () => {
  const originalCreateImageBitmap = globalThis.createImageBitmap;
  const originalDocument = globalThis.document;
  let closed = false;
  let canvas;
  let encodedDimensions;

  globalThis.createImageBitmap = async () => ({
    width: 5000,
    height: 2500,
    close: () => { closed = true; },
  });
  globalThis.document = {
    createElement: () => {
      canvas = {
        width: 0,
        height: 0,
        getContext: () => ({
          fillStyle: "",
          fillRect() {},
          drawImage() {},
        }),
        toBlob: (callback) => {
          encodedDimensions = { width: canvas.width, height: canvas.height };
          callback(new Blob(["jpeg"], { type: "image/jpeg" }));
        },
      };
      return canvas;
    },
  };

  try {
    const input = new File(["source"], "invitation.png", { type: "image/png" });
    const output = await normalizeInvitationImageFile(input);

    assert.equal(encodedDimensions.width, INVITATION_MAX_DIMENSION);
    assert.equal(encodedDimensions.height, Math.round(INVITATION_MAX_DIMENSION / 2));
    assert.equal(output.name, "invitation.jpg");
    assert.equal(output.type, "image/jpeg");
    assert.ok(output.size <= INVITATION_UPLOAD_TARGET_BYTES);
    assert.equal(closed, true);
  } finally {
    globalThis.createImageBitmap = originalCreateImageBitmap;
    globalThis.document = originalDocument;
  }
});
