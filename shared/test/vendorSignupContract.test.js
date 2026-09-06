import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  vendorSignupSchema,
  canonicalVendorApplicationSchema,
  AUTHORITATIVE_CATEGORY_OPTIONS,
  ALLOWED_CATEGORY_KEYS,
} from "../src/schemas/auth.js";
import {
  validCanonicalVendorPayload,
  validVendorFormValues,
  invalidVendorPayloads,
} from "../src/schemas/__fixtures__/auth.fixtures.js";

describe("Phase 2: Shared Vendor Signup Contract & Fixtures", () => {
  test("validCanonicalVendorPayload passes canonicalVendorApplicationSchema", () => {
    const result = canonicalVendorApplicationSchema().safeParse(validCanonicalVendorPayload);
    assert.equal(result.success, true, result.error ? JSON.stringify(result.error.issues) : "");
  });

  test("validVendorFormValues passes vendorSignupSchema", () => {
    const result = vendorSignupSchema().safeParse(validVendorFormValues);
    assert.equal(result.success, true, result.error ? JSON.stringify(result.error.issues) : "");
  });

  test("password with symbols is allowed in both schemas", () => {
    const formWithSymbols = {
      ...validVendorFormValues,
      identity: {
        ...validVendorFormValues.identity,
        password: "SafePassword@2026#$",
        passwordConfirm: "SafePassword@2026#$",
      },
    };
    assert.equal(vendorSignupSchema().safeParse(formWithSymbols).success, true);

    const canonicalWithSymbols = {
      ...validCanonicalVendorPayload,
      password: "SafePassword@2026#$",
      passwordConfirm: "SafePassword@2026#$",
    };
    assert.equal(canonicalVendorApplicationSchema().safeParse(canonicalWithSymbols).success, true);
  });

  test("password mismatch is rejected with passwordConfirm path in both schemas", () => {
    const result1 = canonicalVendorApplicationSchema().safeParse(invalidVendorPayloads.passwordMismatch);
    assert.equal(result1.success, false);
    assert.equal(result1.error.issues.some((i) => i.path.includes("passwordConfirm")), true);

    const mismatchedForm = {
      ...validVendorFormValues,
      identity: {
        ...validVendorFormValues.identity,
        passwordConfirm: "Mismatch123!",
      },
    };
    const result2 = vendorSignupSchema().safeParse(mismatchedForm);
    assert.equal(result2.success, false);
    assert.equal(result2.error.issues.some((i) => i.path.includes("passwordConfirm")), true);
  });

  test("passwords missing letters or numbers are rejected", () => {
    assert.equal(canonicalVendorApplicationSchema().safeParse(invalidVendorPayloads.passwordNoLetters).success, false);
    assert.equal(canonicalVendorApplicationSchema().safeParse(invalidVendorPayloads.passwordNoNumbers).success, false);
  });

  test("serviceDescription limits (10 to 500 characters) are enforced", () => {
    assert.equal(canonicalVendorApplicationSchema().safeParse(invalidVendorPayloads.shortServiceDescription).success, false);
    assert.equal(canonicalVendorApplicationSchema().safeParse(invalidVendorPayloads.longServiceDescription).success, false);

    const shortForm = {
      ...validVendorFormValues,
      serviceData: {
        ...validVendorFormValues.serviceData,
        serviceDescription: "Short",
      },
    };
    assert.equal(vendorSignupSchema().safeParse(shortForm).success, false);
  });

  test("empty serviceCategories is rejected across both schemas", () => {
    assert.equal(canonicalVendorApplicationSchema().safeParse(invalidVendorPayloads.emptyCategories).success, false);

    const emptyCategoriesForm = {
      ...validVendorFormValues,
      serviceData: {
        ...validVendorFormValues.serviceData,
        eventPlanning: [],
        foodAndBeverages: [],
      },
    };
    const res = vendorSignupSchema().safeParse(emptyCategoriesForm);
    assert.equal(res.success, false);
  });

  test("unknown category keys and option IDs are rejected", () => {
    assert.equal(canonicalVendorApplicationSchema().safeParse(invalidVendorPayloads.unknownCategoryKey).success, false);
    assert.equal(canonicalVendorApplicationSchema().safeParse(invalidVendorPayloads.unknownCategoryOption).success, false);

    const invalidOptionForm = {
      ...validVendorFormValues,
      serviceData: {
        ...validVendorFormValues.serviceData,
        eventPlanning: ["unknownOptionId"],
      },
    };
    assert.equal(vendorSignupSchema().safeParse(invalidOptionForm).success, false);
  });

  test("all live web/mobile category option IDs are accepted", () => {
    const form = {
      ...validVendorFormValues,
      serviceData: {
        ...validVendorFormValues.serviceData,
        eventPlanning: ["flowerAndDecoration", "partyAndWeddingCoordination", "digitalAndPrintedInvitation", "hospitalityServices"],
        mediaProduction: ["photoAndVideoForOccasions", "eventVideoEditing", "aerialDronePhotography", "eventVideoMontage"],
      },
    };
    const result = vendorSignupSchema().safeParse(form);
    assert.equal(result.success, true, result.error ? JSON.stringify(result.error.issues) : "");
  });

  test("client file rules reject oversized, mismatched, and unsupported mixed files", () => {
    const oversized = {
      ...validVendorFormValues,
      samplesAndPackages: {
        ...validVendorFormValues.samplesAndPackages,
        pricePackages: [{ name: "prices.pdf", type: "application/pdf", size: 11 * 1024 * 1024 }],
      },
    };
    assert.equal(vendorSignupSchema().safeParse(oversized).success, false);

    const docxPrice = {
      ...validVendorFormValues,
      samplesAndPackages: {
        ...validVendorFormValues.samplesAndPackages,
        pricePackages: [{ name: "prices.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }],
      },
    };
    assert.equal(vendorSignupSchema().safeParse(docxPrice).success, false);
  });

  test("national ID and commercial registration number validation", () => {
    assert.equal(canonicalVendorApplicationSchema().safeParse(invalidVendorPayloads.invalidNationalIdStart).success, false);
    assert.equal(canonicalVendorApplicationSchema().safeParse(invalidVendorPayloads.invalidNationalIdLength).success, false);
    assert.equal(canonicalVendorApplicationSchema().safeParse(invalidVendorPayloads.invalidCrNumberLength).success, false);
  });

  test("verification documents are required in vendorSignupSchema", () => {
    const missingCrImage = {
      ...validVendorFormValues,
      commercialVerification: {
        ...validVendorFormValues.commercialVerification,
        commercialRecordImage: null,
      },
    };
    assert.equal(vendorSignupSchema().safeParse(missingCrImage).success, false);

    const missingIdImage = {
      ...validVendorFormValues,
      commercialVerification: {
        ...validVendorFormValues.commercialVerification,
        nationalIdImage: null,
      },
    };
    assert.equal(vendorSignupSchema().safeParse(missingIdImage).success, false);
  });

  test("portfolio and price package file limits are enforced", () => {
    const missingPortfolio = {
      ...validVendorFormValues,
      samplesAndPackages: {
        ...validVendorFormValues.samplesAndPackages,
        portfolioImages: [],
      },
    };
    assert.equal(vendorSignupSchema().safeParse(missingPortfolio).success, false);

    const missingPackages = {
      ...validVendorFormValues,
      samplesAndPackages: {
        ...validVendorFormValues.samplesAndPackages,
        pricePackages: [],
      },
    };
    assert.equal(vendorSignupSchema().safeParse(missingPackages).success, false);
  });

  test("social links and WhatsApp validation", () => {
    assert.equal(canonicalVendorApplicationSchema().safeParse(invalidVendorPayloads.invalidSocialUrl).success, false);
    assert.equal(canonicalVendorApplicationSchema().safeParse(invalidVendorPayloads.invalidWhatsApp).success, false);

    const invalidWaForm = {
      ...validVendorFormValues,
      socialLinks: {
        ...validVendorFormValues.socialLinks,
        whatsapp: "invalid-phone",
      },
    };
    assert.equal(vendorSignupSchema().safeParse(invalidWaForm).success, false);
  });

  test("authoritative categories and keys are exported and frozen", () => {
    assert.equal(Array.isArray(ALLOWED_CATEGORY_KEYS), true);
    assert.equal(ALLOWED_CATEGORY_KEYS.length, 11);
    assert.equal(Object.isFrozen(AUTHORITATIVE_CATEGORY_OPTIONS), true);
    assert.equal(Object.isFrozen(ALLOWED_CATEGORY_KEYS), true);
  });
});
