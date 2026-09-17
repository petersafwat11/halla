import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import i18next from "i18next";
import { initReactI18next, I18nextProvider } from "react-i18next";
import { setupDom } from "../helpers/domSetup.mjs";
import TextArea from "../../ui/commen/inputs/inputGroup/TextArea.js";

/**
 * `dir="auto"` resolves from the first strong character, so an EMPTY field has
 * none and the browser falls back to LTR — which left-aligns the placeholder
 * and caret inside an otherwise RTL form. The component holds the locale
 * direction until there is content to detect.
 */
const renderWithLocale = async (lng, props) => {
  setupDom();
  const { render } = await import("@testing-library/react");
  const i18n = i18next.createInstance();
  await i18n.use(initReactI18next).init({ lng, resources: {}, fallbackLng: lng });
  const wrapper = ({ children }) =>
    React.createElement(I18nextProvider, { i18n }, children);
  return render(React.createElement(TextArea, props), { wrapper });
};

test('an empty direction="auto" textarea follows the UI locale, not LTR', async () => {
  const view = await renderWithLocale("ar", {
    name: "note",
    placeholder: "أدخل ملاحظة",
    direction: "auto",
    value: "",
    onChange: () => {},
  });
  const field = view.container.querySelector("textarea");
  assert.equal(field.getAttribute("dir"), "rtl");
  view.unmount();
});

test('a filled direction="auto" textarea hands direction back to the browser', async () => {
  const view = await renderWithLocale("ar", {
    name: "note",
    placeholder: "أدخل ملاحظة",
    direction: "auto",
    value: "Written in English",
    onChange: () => {},
  });
  const field = view.container.querySelector("textarea");
  assert.equal(field.getAttribute("dir"), "auto");
  view.unmount();
});

test("an explicit direction is always honoured", async () => {
  const view = await renderWithLocale("ar", {
    name: "note",
    direction: "ltr",
    value: "",
    onChange: () => {},
  });
  assert.equal(view.container.querySelector("textarea").getAttribute("dir"), "ltr");
  view.unmount();
});
