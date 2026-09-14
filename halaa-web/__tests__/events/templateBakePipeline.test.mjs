import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { htmlToImageConvert, shouldIgnoreForCapture } from "../../utils/index.js";
import { normalizeInvitationImageFile } from "../../utils/invitationImage.js";
import { bakeTemplateImage } from "../../app/[lang]/host/create-event/_components/templateForm/useTemplateBake.js";
import { layoutTemplateFields } from "../../app/[lang]/host/create-event/_components/templateForm/templateFieldLayout.js";
import { templateBakeErrorKey } from "@halaa/shared/utils/invitationImagePlan";

const withBrowserStubs = async (fn) => {
  const saved = {
    document: globalThis.document,
    FileReader: globalThis.FileReader,
    createImageBitmap: globalThis.createImageBitmap,
    consoleError: console.error,
  };
  const calls = { fileReader: 0, decode: 0 };
  globalThis.document = { fonts: { status: "loaded", ready: Promise.resolve() } };
  globalThis.FileReader = class {
    readAsDataURL() {
      calls.fileReader += 1;
    }
  };
  globalThis.createImageBitmap = async () => {
    calls.decode += 1;
    throw new Error("unexpected decode");
  };
  console.error = () => {};
  try {
    return await fn(calls);
  } finally {
    globalThis.document = saved.document;
    globalThis.FileReader = saved.FileReader;
    globalThis.createImageBitmap = saved.createImageBitmap;
    console.error = saved.consoleError;
  }
};

const fakePreview = ({ imageLoaded = true } = {}) => {
  const img = {
    complete: true,
    naturalWidth: imageLoaded ? 1200 : 0,
    getAttribute: () => "/uploads/templates/t1/original.jpg",
  };
  const attributes = new Map();
  return {
    attributes,
    current: {
      querySelectorAll: () => [img],
      getBoundingClientRect: () => ({ width: 420, height: 746.5 }),
      setAttribute: (name, value) => attributes.set(name, value),
      removeAttribute: (name) => attributes.delete(name),
    },
  };
};

const fakeRenderer = (encodes, received) => async (element, options) => {
  received.push({ element, options });
  const rect = element.getBoundingClientRect?.() || { width: 400, height: 500 };
  return {
    width: Math.round(rect.width * options.scale),
    height: Math.round(rect.height * options.scale),
    toBlob(callback, type, quality) {
      encodes.push({ type, quality, width: this.width, height: this.height });
      callback(new Blob([new Uint8Array(4096)], { type }));
    },
  };
};

test("template bake captures once at the bounded natural size and returns a real JPEG File", () =>
  withBrowserStubs(async (calls) => {
    const encodes = [];
    const received = [];
    const phases = [];
    const preview = fakePreview();
    const file = await bakeTemplateImage(preview, {
      naturalWidth: 1200,
      naturalHeight: 2133,
      onPhase: (phase) => phases.push(phase),
      renderer: fakeRenderer(encodes, received),
    });

    assert.deepEqual(phases, ["preparing", "generating", "optimizing"]);
    assert.equal(received.length, 1);
    assert.equal(Math.round(746.5 * received[0].options.scale), 2048);
    // The clone is pinned to the live layout size, then the marker is removed.
    const clone = { style: {} };
    received[0].options.onclone({ querySelector: () => clone });
    assert.equal(clone.style.width, "420px");
    assert.equal(clone.style.height, "746.5px");
    assert.equal(preview.attributes.size, 0);
    assert.deepEqual(encodes.map((e) => e.type), ["image/jpeg"]);
    assert.ok(Math.max(encodes[0].width, encodes[0].height) <= 2048);
    assert.ok(file instanceof File);
    assert.equal(file.type, "image/jpeg");
    assert.equal(file.name, "template-image.jpg");
    assert.equal(calls.fileReader, 0, "no base64 data URL is produced");
    assert.equal(calls.decode, 0, "a fitting JPEG is not decoded and re-encoded");
  }));

test("direct capture encodes JPEG into a File without FileReader", () =>
  withBrowserStubs(async (calls) => {
    const encodes = [];
    const result = await htmlToImageConvert(fakePreview(), "template-image", {
      returnBlob: true,
      scale: 1,
      quality: 0.9,
      renderer: fakeRenderer(encodes, []),
    });
    assert.deepEqual(encodes, [{ type: "image/jpeg", quality: 0.9, width: 420, height: 747 }]);
    assert.ok(result.file instanceof File);
    assert.equal(result.file.type, "image/jpeg");
    assert.equal(result.width, 420);
    assert.equal(calls.fileReader, 0);
  }));

test("picked uploads without known dimensions are still normalized", () =>
  withBrowserStubs(async (calls) => {
    const upload = new File([new Uint8Array(10)], "card.jpg", { type: "image/jpeg" });
    await assert.rejects(normalizeInvitationImageFile(upload), /unexpected decode/);
    assert.equal(calls.decode, 1);
  }));

test("a background that failed to load stops before capture with an actionable error", () =>
  withBrowserStubs(async () => {
    const received = [];
    await assert.rejects(
      bakeTemplateImage(fakePreview({ imageLoaded: false }), {
        naturalWidth: 1200,
        naturalHeight: 2133,
        renderer: fakeRenderer([], received),
      }),
      (error) => {
        assert.equal(error.code, "TEMPLATE_BACKGROUND_LOAD_FAILED");
        assert.equal(templateBakeErrorKey(error), "template_background_failed");
        return true;
      }
    );
    assert.equal(received.length, 0);
  }));

test("capture failures are tagged so the editor can offer a retry", () =>
  withBrowserStubs(async () => {
    await assert.rejects(
      bakeTemplateImage(fakePreview(), {
        naturalWidth: 1200,
        naturalHeight: 2133,
        renderer: async () => {
          throw new Error("html2canvas crashed");
        },
      }),
      (error) => {
        assert.equal(error.code, "TEMPLATE_CAPTURE_FAILED");
        assert.equal(templateBakeErrorKey(error), "template_capture_failed");
        return true;
      }
    );
    await assert.rejects(bakeTemplateImage({ current: null }), { code: "TEMPLATE_CAPTURE_FAILED" });
  }));

test("capture pruning keeps styles, ancestors and the preview but drops placeholders and the rest", () => {
  const node = (tagName, children = [], attributes = {}) => {
    const element = {
      tagName,
      children,
      hasAttribute: (name) => Object.prototype.hasOwnProperty.call(attributes, name),
      contains: (other) => other === element || children.some((child) => child.contains(other)),
    };
    return element;
  };
  const placeholder = node("DIV", [], { "data-template-placeholder": "" });
  const overlay = node("DIV");
  const preview = node("DIV", [overlay, placeholder]);
  const modal = node("DIV", [preview]);
  const appRoot = node("DIV");

  assert.equal(shouldIgnoreForCapture(appRoot, preview, true), true);
  assert.equal(shouldIgnoreForCapture(modal, preview, true), false);
  assert.equal(shouldIgnoreForCapture(preview, preview, true), false);
  assert.equal(shouldIgnoreForCapture(overlay, preview, true), false);
  assert.equal(shouldIgnoreForCapture(node("STYLE"), preview, true), false);
  assert.equal(shouldIgnoreForCapture(node("LINK"), preview, true), false);
  assert.equal(shouldIgnoreForCapture(node("SCRIPT"), preview, true), true);
  assert.equal(shouldIgnoreForCapture(placeholder, preview, true), true);
  assert.equal(shouldIgnoreForCapture(placeholder, preview, false), true);
  assert.equal(shouldIgnoreForCapture(appRoot, preview, false), false);
});

test("the two-column template form expands a field left alone on its row", () => {
  const fields = [
    { key: "openingVerse", type: "text" },
    { key: "invitationMessage", type: "textarea" },
    { key: "hostName", type: "text" },
    { key: "eventNote", type: "text" },
    { key: "groomName", type: "text" },
    { key: "closingMessage", type: "text" },
    { key: "eventDate", type: "date" },
    { key: "eventTime", type: "time" },
    { key: "venue", type: "text" },
  ];
  assert.deepEqual(
    layoutTemplateFields(fields).map(({ field, fullWidth }) => `${field.key}:${fullWidth ? "full" : "half"}`),
    [
      "openingVerse:full",
      "invitationMessage:full",
      "hostName:half",
      "eventNote:half",
      "groomName:half",
      "closingMessage:half",
      "eventDate:half",
      "eventTime:half",
      "venue:full",
    ]
  );
  assert.deepEqual(layoutTemplateFields([{ key: "c", type: "color" }]).map((row) => row.fullWidth), [true]);
});

test("template editor subscribes with useWatch, guards duplicate saves and previews field labels", async () => {
  const source = await readFile(
    new URL("../../app/[lang]/host/create-event/_components/templateForm/DynamicTemplateForm.jsx", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(source, /\bwatch\(\)/);
  assert.match(source, /useWatch\(\{ control \}\)/);
  assert.match(source, /createSingleFlight/);
  assert.match(source, /if \(saveFlight\.busy\) return/);
  assert.match(source, /showPlaceholders/);
  assert.match(source, /t\("template_retry"\)/);
});
