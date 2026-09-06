import { test } from "node:test";
import assert from "node:assert/strict";
import { apiRequest } from "../../services/http.js";
import { buildVendorFormData, validateFormStep, VENDOR_STEP_FIELDS } from "../../utils/authFormHelpers.js";
import { vendorSignupSchema } from "@halaa/shared/schemas/auth";

const samples = () => ({
  portfolioImages: [new File(["photo"], "أعمال.jpg", { type: "image/jpeg" })],
  pricePackages: [new File(["%PDF-1.4 package"], "package.pdf", { type: "application/pdf" })],
});

test("step 3 rejects missing attachments immediately and accepts an image plus PDF", () => {
  const errors = [];
  const validate = (samplesAndPackages) => validateFormStep({
    schema: vendorSignupSchema, stepFields: VENDOR_STEP_FIELDS[3],
    getValues: () => ({ samplesAndPackages }),
    setError: (path) => errors.push(path), t: (key) => key,
  });
  assert.equal(validate({ portfolioImages: [], pricePackages: [] }), false);
  assert.ok(errors.includes("samplesAndPackages.portfolioImages"));
  assert.ok(errors.includes("samplesAndPackages.pricePackages"));
  assert.equal(validate(samples()), true);
});

test("Axios preserves actual file arrays through schema parsing and multipart transport", async () => {
  const parsed = vendorSignupSchema().pick({ samplesAndPackages: true }).parse({ samplesAndPackages: samples() });
  const body = buildVendorFormData(parsed);
  await apiRequest({ method: "POST", path: "/test-only", data: body, config: {
    headers: { "Content-Type": "multipart/form-data" },
    adapter: async (config) => {
      assert.ok(config.data instanceof FormData, "JSON defaults must not serialize FormData");
      assert.notEqual(config.headers.get("Content-Type"), "application/json");
      const request = new Request("http://localhost/test-only", { method: "POST", body: config.data });
      const received = await request.formData();
      assert.equal(received.getAll("portfolioImages").length, 1);
      assert.equal(received.getAll("pricePackages").length, 1);
      assert.equal(await received.get("pricePackages").text(), "%PDF-1.4 package");
      return { data: {}, status: 200, statusText: "OK", headers: {}, config };
    },
  }});
});
