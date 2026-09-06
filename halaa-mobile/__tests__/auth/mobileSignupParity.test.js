const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createFormControl } = require("react-hook-form");
const { zodResolver } = require("@hookform/resolvers/zod");
const { vendorSignupSchema } = require("@halaa/shared/schemas/auth");
const { validVendorFormValues } = require("../../../shared/src/schemas/__fixtures__/auth.fixtures.js");
const { normalizeRNFile } = require("../../utils/fileUtils");
const { createInstance } = require("i18next");
const read = (file) => fs.readFileSync(path.join(__dirname, "../..", file), "utf8");

test("whole-step validation catches bilingual fields and optional uploads before summary", async () => {
  const form = createFormControl({ resolver: zodResolver(vendorSignupSchema()), defaultValues: {
    ...validVendorFormValues,
    serviceData: { ...validVendorFormValues.serviceData, aboutEn: "وصف عربي" },
    samplesAndPackages: { ...validVendorFormValues.samplesAndPackages, profileFile: { uri: "file:///bad.exe", name: "bad.exe", type: "application/octet-stream" } },
  }});
  assert.equal(await form.trigger("serviceData"), false);
  assert.ok(form.getFieldState("serviceData.aboutEn").error);
  assert.equal(await form.trigger("samplesAndPackages"), false);
  assert.ok(form.getFieldState("samplesAndPackages.profileFile").error);
  form.setValue("serviceData.aboutEn", "English description");
  assert.equal(await form.trigger("serviceData"), true);
});

test("empty uploads block step 3 and a native PDF/image selection passes", async () => {
  const form = createFormControl({ resolver: zodResolver(vendorSignupSchema()), defaultValues: {
    ...validVendorFormValues, samplesAndPackages: { portfolioImages: [], pricePackages: [] },
  }});
  assert.equal(await form.trigger("samplesAndPackages"), false);
  assert.ok(form.getFieldState("samplesAndPackages.portfolioImages").error);
  form.setValue("samplesAndPackages.portfolioImages", [normalizeRNFile({ uri: "file:///photo.jpg", fileName: "photo.jpg", fileSize: 100, type: "image" })]);
  form.setValue("samplesAndPackages.pricePackages", [normalizeRNFile({ uri: "file:///price.pdf", name: "price.pdf", size: 100, mimeType: "application/pdf" }, "mixed")]);
  assert.equal(await form.trigger("samplesAndPackages"), true);
});

test("Expo ImagePicker fileSize is preserved and the 10 MB cap is enforced", () => {
  const asset = { uri: "file:///photo.jpg", fileName: "photo.jpg", type: "image", fileSize: 11 * 1024 * 1024 };
  assert.throws(() => normalizeRNFile(asset), /10 MB/);
  assert.equal(normalizeRNFile({ ...asset, fileSize: 123 }).size, 123);
});

test("mobile screen and primitives retain the parity safeguards", () => {
  const screen = read("screens/auth/VendorSignupScreen.js");
  assert.ok(screen.includes("trigger(STEP_KEYS[currentStep - 1]"));
  assert.ok(screen.includes("trigger(STEP_KEYS[s - 1]"));
  const service = read("components/auth/vendor-signup/VendorStep2ServiceData.js");
  assert.equal((service.match(/labelDirection="(?:rtl|ltr)"/g) || []).length, 4);
  assert.ok(read("components/commen/PasswordInput.js").includes('textAlign={fieldDirection.input.writingDirection === "rtl" ? "right" : "left"}'));
  assert.ok(read("components/commen/MultiImageInput.js").includes("Array.isArray(error)"));
  assert.ok(read("components/commen/MobileInput.js").includes('useFieldDirection("ltr"'));
});

test("required vendor errors resolve in Arabic instead of English defaults or translation keys", async () => {
  const i18n = createInstance();
  const auth = JSON.parse(read("localization/locales/ar/auth.json"));
  await i18n.init({ lng: "ar", resources: { ar: { auth } } });
  const result = vendorSignupSchema(i18n.getFixedT("ar", "auth")).safeParse({
    ...validVendorFormValues,
    identity: { brandName: "", ownerFullName: "", phoneNumber: "", email: "", password: "", passwordConfirm: "" },
    samplesAndPackages: { portfolioImages: [], pricePackages: [] },
    commercialVerification: { commercialRecordNumber: "", nationalId: "", commercialRecordImage: null, nationalIdImage: null },
  });
  assert.equal(result.success, false);
  for (const issue of result.error.issues) assert.match(issue.message, /[\u0600-\u06ff]/, `${issue.path.join(".")}: ${issue.message}`);
});
