import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openSupportWhatsAppWeb } from "../../services/support/openSupportWhatsApp.js";
import { SUPPORT_SOURCE } from "@halaa/shared/support";
import { LEGAL_CONTACT } from "@halaa/shared/legal/contact";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WEB_ROOT = path.resolve(__dirname, "..", "..");

const read = (...parts) =>
  fs.readFileSync(path.join(WEB_ROOT, ...parts), "utf8");

test("openSupportWhatsAppWeb behavioral test: opens window with safe parameters", () => {
  const originalWindow = globalThis.window;
  const calls = [];

  globalThis.window = {
    open: (url, target, features) => {
      calls.push({ url, target, features });
      return { closed: false };
    },
  };

  try {
    const result = openSupportWhatsAppWeb({
      language: "ar",
      source: SUPPORT_SOURCE.MANAGED_EVENT,
      reference: { kind: "event", value: "evt_web_123" },
    });

    assert.equal(result.opened, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].target, "_blank");
    assert.equal(calls[0].features, "noopener,noreferrer");
    assert.ok(calls[0].url.startsWith("https://wa.me/966552619282?text="));
    assert.ok(calls[0].url.includes(encodeURIComponent("evt_web_123")));
  } finally {
    globalThis.window = originalWindow;
  }
});

test("openSupportWhatsAppWeb behavioral test: handles popup blocker / window.open failure", () => {
  const originalWindow = globalThis.window;
  let failureCalled = false;

  globalThis.window = {
    open: () => null, // Popup blocked
  };

  try {
    const result = openSupportWhatsAppWeb({
      language: "en",
      source: SUPPORT_SOURCE.GENERAL,
      onFailure: (err, meta) => {
        failureCalled = true;
        assert.ok(err);
        assert.equal(meta.displayNumber, LEGAL_CONTACT.whatsapp.display);
      },
    });

    assert.equal(result.opened, false);
    assert.equal(failureCalled, true);
  } finally {
    globalThis.window = originalWindow;
  }
});

test("WhatsAppContactButton delegates to buildSupportRequest without contextMessage or hardcoded number", () => {
  const buttonSource = read(
    "ui",
    "commen",
    "whatsappButton",
    "WhatsAppContactButton.jsx"
  );

  assert.ok(
    buttonSource.includes('from "@halaa/shared/support"'),
    "Must import from @halaa/shared/support"
  );
  assert.ok(
    !buttonSource.includes("966552619282"),
    "Must not hardcode phone numbers in component source"
  );
  assert.ok(
    !buttonSource.includes("contextMessage"),
    "Must not accept unbounded contextMessage"
  );
  assert.ok(
    buttonSource.includes("buildSupportRequest"),
    "Must call buildSupportRequest"
  );
});
