import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { addServiceSchema, SERVICE_LIMITS } from "../../utils/schemas/vendorServiceSchema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MOBILE_ROOT = path.resolve(__dirname, "..", "..");

test("Mobile Vendor Service Schema: aligned with backend limits and digit normalization (MKT-04)", () => {
  assert.equal(SERVICE_LIMITS.NAME_MAX, 200);
  assert.equal(SERVICE_LIMITS.DESCRIPTION_MAX, 2000);

  const schema = addServiceSchema();

  // Valid 150 char name and 1500 char desc
  const res = schema.safeParse({
    serviceName: "A".repeat(150),
    serviceNameAr: "خدمة تجريبية",
    serviceType: "eventPlanning",
    description: "B".repeat(1500),
    descriptionAr: "وصف تفصيلي للخدمة في التطبيق.",
    price: "١٢٠٠",
  });
  assert.equal(res.success, true);
  assert.equal(res.data.price, "1200");

  // Clearable Arabic fields
  const resCleared = schema.safeParse({
    serviceName: "Standard Name",
    serviceNameAr: "",
    serviceType: "eventPlanning",
    description: "Valid description text.",
    descriptionAr: "",
    price: "100",
  });
  assert.equal(resCleared.success, true);
});

test("Mobile buildServiceFormData source: preserves cleared Arabic fields (MKT-04)", () => {
  const apiPath = path.join(
    MOBILE_ROOT,
    "hooks",
    "vendor",
    "_api.js"
  );
  const content = fs.readFileSync(apiPath, "utf8");

  // Verify buildServiceFormData appends nameAr and descriptionAr when present in data
  assert.ok(
    content.includes('if (data.nameAr != null) formData.append("nameAr", data.nameAr);'),
    "buildServiceFormData must append nameAr even when empty"
  );
  assert.ok(
    content.includes('if (data.descriptionAr != null) formData.append("descriptionAr", data.descriptionAr);'),
    "buildServiceFormData must append descriptionAr even when empty"
  );
});

test("Mobile ServiceDetailsForm: uses LocationSelector for administrative areas (MKT-03)", () => {
  const formPath = path.join(
    MOBILE_ROOT,
    "components",
    "vendor",
    "ServiceDetailsForm.js"
  );
  const content = fs.readFileSync(formPath, "utf8");

  // Verify LocationSelector is imported and rendered with basePath="serviceLocation"
  assert.ok(
    content.includes('import LocationSelector from "../commen/LocationSelector";'),
    "ServiceDetailsForm must import LocationSelector"
  );
  assert.ok(
    content.includes('<LocationSelector basePath="serviceLocation" />'),
    "ServiceDetailsForm must mount LocationSelector with basePath='serviceLocation'"
  );
});

test("Mobile Vendor Mutations: invalidates stats on service mutations (MKT-06)", () => {
  const mutationsPath = path.join(
    MOBILE_ROOT,
    "hooks",
    "vendor",
    "mutations.js"
  );
  const content = fs.readFileSync(mutationsPath, "utf8");

  assert.ok(
    content.includes("queryClient.invalidateQueries({ queryKey: vendorKeys.stats() });"),
    "Mobile vendor mutations must invalidate stats on service mutations"
  );
});

