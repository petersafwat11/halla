import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import React, { act } from "react";
import { JSDOM } from "jsdom";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ContinueSignupForm from "../../ui/auth/signup/host/continueSignupForm/ContinueSignupForm.js";
import { hostProfileCompletionSchema, completeProfileSchema } from "@halaa/shared/schemas/auth";

for (const language of ["ar", "en"]) {
  test(`${language}: actual host form directions survive password toggle and empty submission`, async () => {
    const dom = new JSDOM('<div id="root"></div>', { url: "http://localhost/" });
    globalThis.window = dom.window;
    globalThis.document = dom.window.document;
    globalThis.HTMLElement = dom.window.HTMLElement;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    // Load the DOM renderer only after installing JSDOM so React detects
    // modern input-event support instead of its legacy IE fallback.
    const { createRoot } = await import("react-dom/client");
    const i18n = createInstance();
    const resources = {};
    for (const ns of ["signup", "common", "continueSignup"]) resources[ns] = JSON.parse(fs.readFileSync(new URL(`../../localization/locales/${language}/${ns}.json`, import.meta.url)));
    await i18n.init({ lng: language, resources: { [language]: resources } });
    const client = new QueryClient();
    const root = createRoot(document.getElementById("root"));
    try {
      await act(async () => root.render(React.createElement(QueryClientProvider, { client }, React.createElement(I18nextProvider, { i18n }, React.createElement(ContinueSignupForm)))));
      assert.equal(document.getElementById("name").dir, "auto");
      assert.equal(document.getElementById("email").dir, "ltr");
      assert.equal(document.getElementById("email").placeholder, "ahmed@gmail.com");
      const expected = language === "ar" ? "rtl" : "ltr";
      for (const name of ["password", "passwordConfirm"]) {
        const field = document.getElementById(name);
        assert.equal(field.dir, expected);
        assert.equal(document.querySelector(`label[for="${name}"]`).dir, expected);
        await act(async () => field.parentElement.querySelector("button").click());
        assert.equal(field.type, "text");
        assert.equal(field.dir, expected);
      }
      await act(async () => document.querySelector("form").dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })));
      assert.equal(document.querySelectorAll('input[aria-invalid="true"]').length, 4);
      assert.equal(document.querySelectorAll('img[src*="/svg/auth/"]').length, 0);
    } finally {
      await act(async () => root.unmount());
      client.clear();
      dom.window.close();
      delete globalThis.window;
      delete globalThis.document;
      delete globalThis.HTMLElement;
      delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    }
  });
}

test("web/mobile host schemas agree on trimming, valid email characters, and passwords", () => {
  for (const [schema, name, confirm] of [[hostProfileCompletionSchema(), "name", "passwordConfirm"], [completeProfileSchema(), "fullName", "confirmPassword"]]) {
    const values = { [name]: " Ahmed Ali ", email: " o'hara@gmail.com ", password: "Password123!", [confirm]: "Password123!" };
    const parsed = schema.parse(values);
    assert.equal(parsed[name], "Ahmed Ali");
    assert.equal(parsed.email, "o'hara@gmail.com");
    assert.equal(schema.safeParse({ ...values, [name]: "   " }).success, false);
    assert.equal(schema.safeParse({ ...values, [confirm]: "different" }).success, false);
  }
});
