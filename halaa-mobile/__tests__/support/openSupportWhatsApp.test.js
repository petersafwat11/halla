const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const MOBILE_ROOT = path.resolve(__dirname, "..", "..");
const read = (...parts) =>
  fs.readFileSync(path.join(MOBILE_ROOT, ...parts), "utf8");

test("openSupportWhatsApp behavioral test: app channel success via deep link", async () => {
  const { openSupportWhatsApp } = await import("../../services/support/openSupportWhatsApp.js");

  const openedUrls = [];
  const mockLinking = {
    canOpenURL: async (url) => url.startsWith("whatsapp://"),
    openURL: async (url) => {
      openedUrls.push(url);
    },
  };

  const result = await openSupportWhatsApp({
    language: "ar",
    source: "home_header",
    _linking: mockLinking,
  });

  assert.equal(result.opened, true);
  assert.equal(result.channel, "app");
  assert.equal(openedUrls.length, 1);
  assert.ok(openedUrls[0].startsWith("whatsapp://send?phone=966552619282&text="));
});

test("openSupportWhatsApp behavioral test: web fallback when deep link unavailable", async () => {
  const { openSupportWhatsApp } = await import("../../services/support/openSupportWhatsApp.js");

  const openedUrls = [];
  const mockLinking = {
    canOpenURL: async (url) => url.startsWith("https://wa.me/"),
    openURL: async (url) => {
      openedUrls.push(url);
    },
  };

  const result = await openSupportWhatsApp({
    language: "en",
    source: "managed_event",
    reference: { kind: "event", value: "evt_123" },
    _linking: mockLinking,
  });

  assert.equal(result.opened, true);
  assert.equal(result.channel, "web");
  assert.equal(openedUrls.length, 1);
  assert.ok(openedUrls[0].startsWith("https://wa.me/966552619282?text="));
  assert.ok(openedUrls[0].includes(encodeURIComponent("Event ID: evt_123")));
});

test("openSupportWhatsApp behavioral test: web fallback when deep link throws on open", async () => {
  const { openSupportWhatsApp } = await import("../../services/support/openSupportWhatsApp.js");

  const openedUrls = [];
  const mockLinking = {
    canOpenURL: async () => true,
    openURL: async (url) => {
      if (url.startsWith("whatsapp://")) {
        throw new Error("Deep link failed");
      }
      openedUrls.push(url);
    },
  };

  const result = await openSupportWhatsApp({
    language: "ar",
    source: "home_header",
    _linking: mockLinking,
  });

  assert.equal(result.opened, true);
  assert.equal(result.channel, "web");
  assert.equal(openedUrls.length, 1);
  assert.ok(openedUrls[0].startsWith("https://wa.me/966552619282?text="));
});

test("openSupportWhatsApp behavioral test: total failure surfaces localized Alert with contact number", async () => {
  const { openSupportWhatsApp } = await import("../../services/support/openSupportWhatsApp.js");

  const mockLinking = {
    canOpenURL: async () => false,
    openURL: async () => {},
  };

  const alertsShown = [];
  const mockAlert = {
    alert: (title, message) => {
      alertsShown.push({ title, message });
    },
  };

  const result = await openSupportWhatsApp({
    language: "ar",
    source: "managed_event",
    _linking: mockLinking,
    _alert: mockAlert,
  });

  assert.equal(result.opened, false);
  assert.equal(result.channel, "none");
  assert.equal(alertsShown.length, 1);
  assert.equal(alertsShown[0].title, "تواصل معنا");
  assert.ok(alertsShown[0].message.includes("966 55 261 9282"));

  // English alert
  const resultEn = await openSupportWhatsApp({
    language: "en",
    source: "managed_event",
    _linking: mockLinking,
    _alert: mockAlert,
  });

  assert.equal(resultEn.opened, false);
  assert.equal(alertsShown.length, 2);
  assert.equal(alertsShown[1].title, "Contact Support");
  assert.ok(alertsShown[1].message.includes("966 55 261 9282"));
});

test("CreateEventForm and HomeScreen both integrate openSupportWhatsApp with valid sources", () => {
  const createEventSource = read(
    "components",
    "admin-dashboard",
    "events",
    "CreateEventForm.js"
  );
  assert.ok(
    createEventSource.includes('import { openSupportWhatsApp } from "../../../services/support/openSupportWhatsApp"'),
    "CreateEventForm must import openSupportWhatsApp"
  );
  assert.ok(
    createEventSource.includes('source: "managed_event"'),
    "CreateEventForm must pass the canonical managed_event source"
  );

  const homeSource = read("screens", "host", "HomeScreen.js");
  assert.ok(
    homeSource.includes('import { openSupportWhatsApp } from "../../services/support/openSupportWhatsApp"'),
    "HomeScreen must import openSupportWhatsApp"
  );
  assert.ok(
    homeSource.includes('source: "home_header"'),
    "HomeScreen must pass source: 'home_header'"
  );
  assert.ok(
    homeSource.includes('testID="home-header-support-chat-button"'),
    "HomeScreen must have stable testID for support chat button"
  );
  assert.ok(
    homeSource.includes('accessibilityRole="button"'),
    "HomeScreen chat button must have accessibilityRole='button'"
  );
});

test("WhatsAppContactButton delegates to openSupportWhatsApp with source and reference", () => {
  const btnSource = read(
    "components",
    "shared",
    "WhatsAppContactButton.js"
  );
  assert.ok(
    btnSource.includes("openSupportWhatsApp"),
    "WhatsAppContactButton must call openSupportWhatsApp"
  );
  assert.ok(
    !btnSource.includes("WHATSAPP_CONTACT_NUMBER"),
    "WhatsAppContactButton must not declare hardcoded duplicate numbers"
  );
  assert.ok(
    !btnSource.includes("contextMessage"),
    "WhatsAppContactButton must not accept unbounded contextMessage"
  );
});
