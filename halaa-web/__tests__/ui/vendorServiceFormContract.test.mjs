import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { addServiceSchema, SERVICE_LIMITS } from "../../utils/schemas/addServiceSchema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WEB_ROOT = path.resolve(__dirname, "..", "..");

test("Web Vendor Service Schema: aligned with backend limits (MKT-04)", () => {
  assert.equal(SERVICE_LIMITS.NAME_MAX, 200);
  assert.equal(SERVICE_LIMITS.DESCRIPTION_MAX, 2000);

  const schema = addServiceSchema();

  // 150 char name was rejected under previous 100 limit, must be valid under unified 200 limit
  const res150 = schema.safeParse({
    serviceName: "A".repeat(150),
    serviceType: "eventPlanning",
    description: "Valid service description text.",
    price: "100",
  });
  assert.equal(res150.success, true);

  // 1500 char description was rejected under previous 1000 limit, must be valid under unified 2000 limit
  const res1500 = schema.safeParse({
    serviceName: "Standard Name",
    serviceType: "eventPlanning",
    description: "B".repeat(1500),
    price: "100",
  });
  assert.equal(res1500.success, true);

  // Empty Arabic fields are valid and clearable
  const resEmptyAr = schema.safeParse({
    serviceName: "Standard Name",
    serviceNameAr: "",
    serviceType: "eventPlanning",
    description: "Valid description.",
    descriptionAr: "",
    price: "100",
  });
  assert.equal(resEmptyAr.success, true);
});

test("Web AddServicePopup: multipart serializer does not drop cleared Arabic fields (MKT-04)", () => {
  const popupPath = path.join(
    WEB_ROOT,
    "ui",
    "vendor",
    "addServicePopup",
    "AddServicePopup.js"
  );
  const content = fs.readFileSync(popupPath, "utf8");

  // Verify nameAr and descriptionAr are appended with empty string when cleared rather than dropped
  assert.ok(
    content.includes('formData.append("nameAr", data.serviceNameAr != null ? data.serviceNameAr.trim() : "");'),
    "AddServicePopup must append nameAr even when cleared to prevent stale values in DB"
  );
  assert.ok(
    content.includes('formData.append("descriptionAr", data.descriptionAr != null ? data.descriptionAr.trim() : "");'),
    "AddServicePopup must append descriptionAr even when cleared"
  );
});

test("Web Service Mutations: stats cache invalidation on update and status toggle (MKT-06)", () => {
  const mutationsPath = path.join(
    WEB_ROOT,
    "hooks",
    "vendorServices",
    "mutations.js"
  );
  const content = fs.readFileSync(mutationsPath, "utf8");

  // Verify toggleStatus and updateService invalidate stats()
  assert.ok(
    content.includes("queryClient.invalidateQueries({ queryKey: vendorServicesKeys.stats() });"),
    "Vendor service mutations must invalidate stats query on mutation"
  );
});

test("Web Service Placeholder: guaranteed asset exists and ServiceCard references it (MKT-05)", () => {
  const svgPlaceholderPath = path.join(
    WEB_ROOT,
    "public",
    "images",
    "placeholder-service.svg"
  );
  assert.ok(
    fs.existsSync(svgPlaceholderPath),
    "public/images/placeholder-service.svg must exist"
  );

  const cardPath = path.join(
    WEB_ROOT,
    "ui",
    "vendor",
    "serviceCard",
    "ServiceCard.js"
  );
  const cardContent = fs.readFileSync(cardPath, "utf8");
  assert.ok(
    cardContent.includes('PLACEHOLDER_IMAGE = "/images/placeholder-service.svg"'),
    "ServiceCard must use guaranteed placeholder SVG"
  );
});
