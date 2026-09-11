import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createInstance } from "i18next";
import { authErrorMessage } from "@halaa/shared/errors";

const read = (relativePath) =>
  fs.readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");

test("verified host signup navigates to profile completion after auth persistence", () => {
  const source = read("ui/auth/signup/host/OTPVerification.jsx");
  const verification = source.indexOf("await verifyOTP(");
  const redirect = source.indexOf(
    "window.location.replace(\n          `/${currentLocale}/signup/continue-signup`"
  );

  assert.ok(verification >= 0, "OTP verification is awaited");
  assert.ok(redirect > verification, "profile redirect happens after verification resolves");
  assert.match(source, /result\?\.profileCompleted === false/);
});

for (const language of ["en", "ar"]) {
  test(`${language}: duplicate mobile error offers another number or login`, async () => {
    const common = JSON.parse(
      read(`localization/locales/${language}/common.json`)
    );
    const i18n = createInstance();
    await i18n.init({
      lng: language,
      resources: { [language]: { common } },
      defaultNS: "common",
    });

    const presented = authErrorMessage(
      { status: 409, code: "CONFLICT", field: "phone" },
      i18n.getFixedT(language, "common")
    );

    assert.equal(presented.type, "duplicate");
    assert.equal(presented.actionLink, "login");
    if (language === "en") {
      assert.match(presented.message, /another number or log in/i);
    } else {
      assert.match(presented.message, /رقماً آخر أو سجّل الدخول/);
    }
  });
}
