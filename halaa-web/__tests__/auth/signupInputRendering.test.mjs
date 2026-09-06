import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { JSDOM } from "jsdom";
import InputGroup from "../../ui/commen/inputs/inputGroup/InputGroup.js";
import TextArea from "../../ui/commen/inputs/inputGroup/TextArea.js";
import StepFour from "../../ui/auth/signup/vendor/stepFour/StepFour.js";
import { FormProvider, useForm } from "react-hook-form";

function Form({ children }) {
  const methods = useForm();
  return React.createElement(FormProvider, methods, children);
}
async function render(component, language) {
  const i18n = createInstance();
  await i18n.init({ lng: language, resources: { [language]: { translation: {} } }, initImmediate: false });
  const html = renderToStaticMarkup(React.createElement(I18nextProvider, { i18n }, React.createElement(Form, null, component)));
  return new JSDOM(html).window.document;
}

for (const language of ["ar", "en"]) {
  test(`${language}: passwords follow the UI language while email stays LTR`, async () => {
    for (const type of ["email", "password"]) {
      const doc = await render(React.createElement(InputGroup, { name: type, type, label: "Label", iconPath: `auth/${type}.svg` }), language);
      assert.equal(doc.querySelector("input").dir, type === "password" && language === "ar" ? "rtl" : "ltr");
      assert.equal(doc.querySelector("label").dir, language === "ar" ? "rtl" : "ltr");
      assert.equal(doc.querySelectorAll("img").length, 0);
      assert.ok(doc.querySelector("svg"));
      if (type === "email") assert.equal(doc.querySelector("input").placeholder, "ahmed@gmail.com");
    }
  });
  test(`${language}: textarea decoration spacing survives validation errors`, async () => {
    for (const direction of ["ltr", "rtl"]) {
      const doc = await render(React.createElement(TextArea, {
        name: "description", label: "Description", direction, labelDirection: direction,
        iconPath: "auth/quote-circle.svg", prefixText: "Prefix", error: "Required",
      }), language);
      const field = doc.querySelector("textarea");
      assert.equal(field.dir, direction);
      assert.equal(field.parentElement.dir, direction);
      assert.equal(doc.querySelector("label").dir, direction);
      for (const name of ["input", "input_error", "input_with_icon", "input_with_prefix"]) assert.ok(field.classList.contains(name));
      assert.equal(doc.querySelectorAll("img").length, 0);
    }
  });
  test(`${language}: verification fields use numeric examples and inline icons`, async () => {
    const doc = await render(React.createElement(StepFour), language);
    const identifiers = [...doc.querySelectorAll('input[inputmode="numeric"]')];
    assert.equal(identifiers.length, 2);
    identifiers.forEach((input) => {
      assert.equal(input.placeholder, "1xxxxxxxxx");
      assert.equal(input.dir, "ltr");
      assert.equal(input.maxLength, 10);
    });
    assert.equal(doc.querySelectorAll('img[src*="/svg/auth/"]').length, 0);
  });
}
