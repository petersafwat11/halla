import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  buildVendorFormData,
  flattenVendorData,
  VENDOR_STEP_FIELDS,
} from "../../utils/authFormHelpers.js";
import {
  saveVendorDraft,
  loadVendorDraft,
  clearVendorDraft,
} from "../../utils/vendorDraftStorage.js";

test("Web Vendor Serialization: serializes canonical socialLinks with WhatsApp and Twitter, without dead cv", () => {
  const formValues = {
    identity: {
      email: "vendor@example.com",
      phoneNumber: "0501234567",
      password: "Password123!",
      passwordConfirm: "Password123!",
      brandName: "Al-Noor Events",
      ownerFullName: "Ahmed Al-Noor",
      preferredLanguage: "ar",
    },
    serviceData: {
      serviceDescription: "Professional event planning services across Riyadh.",
      taglineAr: "خدماتنا الأفضل",
      taglineEn: "Best services",
      aboutAr: "عن الشركة",
      aboutEn: "About company",
      eventPlanning: ["flowerAndDecoration", "partyAndWeddingCoordination"],
      serviceLocation: { regionId: 1, coverageType: "city" },
    },
    samplesAndPackages: {},
    commercialVerification: {
      commercialRecordNumber: "1010123456",
      nationalId: "1012345678",
    },
    socialLinks: {
      whatsapp: "0501234567",
      twitter: "https://x.com/alnoor",
      instagram: "https://instagram.com/alnoor",
      facebook: "https://facebook.com/alnoor",
      tiktok: "https://tiktok.com/@alnoor",
      linkedin: "https://linkedin.com/company/alnoor",
      youtube: "https://youtube.com/@alnoor",
      website: "https://alnoor.sa",
    },
  };

  const flattened = flattenVendorData(formValues);
  assert.equal(flattened.email, "vendor@example.com");
  assert.equal(flattened.socialLinks.whatsapp, "0501234567");
  assert.equal(flattened.socialLinks.twitter, "https://x.com/alnoor");
  assert.equal(flattened.socialLinks.instagram, "https://instagram.com/alnoor");
  assert.equal(flattened.socialLinks.linkedin, "https://linkedin.com/company/alnoor");
  assert.equal(flattened.socialLinks.youtube, "https://youtube.com/@alnoor");
  assert.equal(flattened.cv, undefined);

  const formData = buildVendorFormData(formValues);
  assert.equal(formData.get("email"), "vendor@example.com");
  assert.equal(formData.get("brandName"), "Al-Noor Events");
  assert.equal(formData.get("commercialRegistrationNumber"), "1010123456");
  assert.equal(formData.get("commercialRecordNumber"), null);
  assert.equal(formData.get("nationalId"), "1012345678");
  assert.equal(formData.get("cv"), null);

  assert.deepEqual(JSON.parse(formData.get("location")), formValues.serviceData.serviceLocation);
  assert.equal(formData.get("serviceLocation"), null);

  const parsedSocial = JSON.parse(formData.get("socialLinks"));
  assert.equal(parsedSocial.whatsapp, "0501234567");
  assert.equal(parsedSocial.twitter, "https://x.com/alnoor");
  assert.equal(parsedSocial.instagram, "https://instagram.com/alnoor");
  assert.equal(parsedSocial.linkedin, "https://linkedin.com/company/alnoor");
  assert.equal(parsedSocial.youtube, "https://youtube.com/@alnoor");
  assert.equal(parsedSocial.website, "https://alnoor.sa");

  const parsedCategories = JSON.parse(formData.get("serviceCategories"));
  assert.deepEqual(parsedCategories.eventPlanning, ["flowerAndDecoration", "partyAndWeddingCoordination"]);
});

test("Web Draft Storage: strictly persists non-sensitive fields and excludes passwords, IDs, and files", () => {
  let mockStorage = {};
  global.window = {};
  global.localStorage = {
    getItem: (key) => mockStorage[key] || null,
    setItem: (key, val) => {
      mockStorage[key] = String(val);
    },
    removeItem: (key) => {
      delete mockStorage[key];
    },
  };

  const sensitiveFormValues = {
    identity: {
      brandName: "Dream Weddings",
      ownerFullName: "Sara Ali",
      phoneNumber: "0507654321",
      email: "sara@weddings.sa",
      password: "SecretPassword123!",
      passwordConfirm: "SecretPassword123!",
    },
    serviceData: {
      serviceDescription: "Luxury wedding coordination and design.",
      eventPlanning: ["weddingPlanning"],
      serviceLocation: { regionId: 2, coverageType: "city" },
    },
    samplesAndPackages: {
      portfolioImages: [{ name: "photo1.jpg" }],
      pricePackages: [{ name: "prices.pdf" }],
      businessLogo: { name: "logo.png" },
      profileFile: { name: "profile.pdf" },
    },
    commercialVerification: {
      nationalId: "1098765432",
      commercialRecordNumber: "1010998877",
      commercialRecordImage: { name: "cr.pdf" },
      nationalIdImage: { name: "id.pdf" },
    },
    socialLinks: {
      whatsapp: "0507654321",
      instagram: "https://instagram.com/dreamweddings",
    },
  };

  saveVendorDraft(sensitiveFormValues, "ar");

  const loaded = loadVendorDraft("ar");
  assert.ok(loaded, "Draft should be restored");
  assert.equal(loaded.identity.brandName, "Dream Weddings");
  assert.equal(loaded.identity.ownerFullName, undefined);
  assert.equal(loaded.identity.email, undefined);
  assert.equal(loaded.identity.phoneNumber, undefined);

  // STRICT SECURITY INVARIANTS:
  assert.equal(loaded.identity.password, undefined, "Draft must NEVER save password");
  assert.equal(loaded.identity.passwordConfirm, undefined, "Draft must NEVER save passwordConfirm");
  assert.equal(loaded.commercialVerification, undefined, "Draft must NEVER save commercial verification numbers/documents");
  assert.equal(loaded.samplesAndPackages, undefined, "Draft must NEVER save file objects/blobs");

  assert.equal(loaded.socialLinks.whatsapp, undefined);

  clearVendorDraft("ar");
  assert.equal(loadVendorDraft("ar"), null, "Draft should be wiped after clearVendorDraft");
});

test("Web Source Code Verification: Step 2 uses actual TextArea components and Step 1 delegates password visibility", () => {
  const stepOnePath = path.resolve("ui/auth/signup/vendor/stepOne/StepOne.js");
  const stepOneContent = fs.readFileSync(stepOnePath, "utf8");
  // National ID must NOT be in Step 1
  assert.equal(stepOneContent.includes("commercialVerification.nationalId"), false, "Step 1 must not contain nationalId");
  // Competing password visibility state must NOT exist in Step 1
  assert.equal(stepOneContent.includes("showPassword"), false, "Step 1 must delegate password visibility to InputGroup");

  const stepTwoPath = path.resolve("ui/auth/signup/vendor/stepTwo/StepTwo.js");
  const stepTwoContent = fs.readFileSync(stepTwoPath, "utf8");
  // Uses TextArea
  assert.ok(stepTwoContent.includes("<TextArea"), "Step 2 must use actual TextArea component");
  assert.ok(stepTwoContent.includes("serviceDescription"), "Step 2 TextArea must bind to serviceDescription");
  assert.ok(stepTwoContent.includes("aboutAr"), "Step 2 TextArea must bind to aboutAr");

  const stepThreePath = path.resolve("ui/auth/signup/vendor/stepThree/StepThree.js");
  const stepThreeContent = fs.readFileSync(stepThreePath, "utf8");
  assert.ok(stepThreeContent.includes("pricePackages"), "Step 3 must handle pricePackages");
  assert.ok(stepThreeContent.includes("profileFile"), "Step 3 must handle profileFile");

  const stepFourPath = path.resolve("ui/auth/signup/vendor/stepFour/StepFour.js");
  const stepFourContent = fs.readFileSync(stepFourPath, "utf8");
  assert.ok(stepFourContent.includes("acceptDocuments={true}"), "Step 4 must accept documents (PDFs)");

  const stepFivePath = path.resolve("ui/auth/signup/vendor/stepFive/StepFive.js");
  const stepFiveContent = fs.readFileSync(stepFivePath, "utf8");
  assert.ok(stepFiveContent.includes("socialLinks.whatsapp"), "Step 5 must bind to socialLinks.whatsapp");
  assert.ok(stepFiveContent.includes("socialLinks.twitter"), "Step 5 must bind to socialLinks.twitter");
});
