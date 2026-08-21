import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SERVICE_LIMITS,
  SERVICE_TYPES,
  PREDEFINED_TAGS,
  normalizeArabicDigits,
  vendorServiceFormSchema,
} from "../src/schemas/vendor.js";
import { keyFromSignedUrl, resolveImageUrl } from "../src/utils/media.js";

test("Vendor Service Form: canonical limits and constants", () => {
  assert.equal(SERVICE_LIMITS.NAME_MIN, 2);
  assert.equal(SERVICE_LIMITS.NAME_MAX, 200);
  assert.equal(SERVICE_LIMITS.NAME_AR_MAX, 200);
  assert.equal(SERVICE_LIMITS.DESCRIPTION_MIN, 10);
  assert.equal(SERVICE_LIMITS.DESCRIPTION_MAX, 2000);
  assert.equal(SERVICE_LIMITS.DESCRIPTION_AR_MAX, 2000);
  assert.equal(SERVICE_LIMITS.DURATION_MAX, 100);
  assert.equal(SERVICE_LIMITS.PRICE_MIN, 0);

  assert.ok(SERVICE_TYPES.length >= 10);
  assert.ok(PREDEFINED_TAGS.length >= 5);
});

test("Vendor Service Form Schema: validates boundaries, optional Arabic fields, and zero price", () => {
  const schema = vendorServiceFormSchema();

  // Valid service
  const validResult = schema.safeParse({
    serviceName: "Photography Basic",
    serviceNameAr: "تصوير أساسي",
    serviceType: "mediaProduction",
    description: "Full event photography with 100 edited photos included.",
    descriptionAr: "تصوير كامل للفعالية مع 100 صورة معدلة.",
    price: "500",
  });
  assert.equal(validResult.success, true);

  // Zero price is valid
  const zeroPrice = schema.safeParse({
    serviceName: "Free Consultation",
    serviceType: "eventPlanning",
    description: "Initial 30-minute consultation for event planning.",
    price: 0,
  });
  assert.equal(zeroPrice.success, true);

  // Arabic digits in price are normalized
  const arabicPrice = schema.safeParse({
    serviceName: "Catering Package",
    serviceType: "foodAndBeverages",
    description: "Traditional dinner buffet for 50 guests.",
    price: "١٥٠٠.٥٠",
  });
  assert.equal(arabicPrice.success, true);
  assert.equal(arabicPrice.data.price, "1500.50");

  // Empty Arabic fields are valid (clearable)
  const clearedArabic = schema.safeParse({
    serviceName: "DJ Sound Setup",
    serviceNameAr: "",
    serviceType: "soundLightingEntertainment",
    description: "High power audio system with microphones.",
    descriptionAr: "",
    price: "1200",
  });
  assert.equal(clearedArabic.success, true);

  // Negative price is rejected
  const negPrice = schema.safeParse({
    serviceName: "Invalid Price Service",
    serviceType: "eventPlanning",
    description: "This should fail because price is negative.",
    price: -50,
  });
  assert.equal(negPrice.success, false);

  // Name too short is rejected
  const shortName = schema.safeParse({
    serviceName: "A",
    serviceType: "eventPlanning",
    description: "Valid description for the test case.",
    price: 100,
  });
  assert.equal(shortName.success, false);

  // Name too long (> 200) is rejected
  const longName = schema.safeParse({
    serviceName: "A".repeat(201),
    serviceType: "eventPlanning",
    description: "Valid description for the test case.",
    price: 100,
  });
  assert.equal(longName.success, false);

  // Description too short (< 10) is rejected
  const shortDesc = schema.safeParse({
    serviceName: "Valid Name",
    serviceType: "eventPlanning",
    description: "Short",
    price: 100,
  });
  assert.equal(shortDesc.success, false);

  // Description too long (> 2000) is rejected
  const longDesc = schema.safeParse({
    serviceName: "Valid Name",
    serviceType: "eventPlanning",
    description: "D".repeat(2001),
    price: 100,
  });
  assert.equal(longDesc.success, false);
});

test("Media Utilities: keyFromSignedUrl and resolveImageUrl", () => {
  // S3 signed URL
  const signedUrl = "https://halla-uploads.s3.eu-central-1.amazonaws.com/services/srv_123.jpg?X-Amz-Signature=abc";
  assert.equal(keyFromSignedUrl(signedUrl), "services/srv_123.jpg");

  // Relative path
  assert.equal(keyFromSignedUrl("/uploads/services/srv_123.jpg"), "uploads/services/srv_123.jpg");
  assert.equal(keyFromSignedUrl(null), null);

  // resolveImageUrl with absolute URL
  assert.equal(resolveImageUrl("https://cdn.example.com/photo.jpg"), "https://cdn.example.com/photo.jpg");

  // resolveImageUrl with dev uploads and backendUrl
  assert.equal(
    resolveImageUrl("/uploads/test.png", { backendUrl: "http://localhost:8000" }),
    "http://localhost:8000/uploads/test.png"
  );

  // resolveImageUrl with null fallback
  assert.equal(
    resolveImageUrl(null, { fallback: "/images/placeholder.svg" }),
    "/images/placeholder.svg"
  );
});
