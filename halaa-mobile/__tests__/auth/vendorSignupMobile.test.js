const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

// Mock React Native's FormData which preserves { uri, name, type } file objects
class MockFormData {
  constructor() {
    this._data = [];
  }
  append(key, value) {
    this._data.push({ key, value });
  }
  get(key) {
    const entry = this._data.find((e) => e.key === key);
    return entry ? entry.value : null;
  }
  getAll(key) {
    return this._data.filter((e) => e.key === key).map((e) => e.value);
  }
  has(key) {
    return this._data.some((e) => e.key === key);
  }
  entries() {
    return this._data.map((e) => [e.key, e.value]);
  }
}
globalThis.FormData = MockFormData;

const { normalizeRNFile } = require("../../utils/fileUtils.js");
const { buildVendorFormData } = require("../../utils/vendorSignupSerializer.js");
const { createVendorDraftPayload } = require("../../utils/vendorDraftPayload.js");

describe("Mobile vendor signup unit tests", () => {
  describe("normalizeRNFile", () => {
    test("normalizes Expo image picker asset with generic type='image'", () => {
      const asset = {
        uri: "file:///var/mobile/Containers/Data/Application/tmp/image-123.jpg",
        fileName: "photo.jpg",
        type: "image",
      };

      const normalized = normalizeRNFile(asset, "image");
      assert.ok(normalized);
      assert.equal(normalized.uri, asset.uri);
      assert.equal(normalized.name, "photo.jpg");
      assert.equal(normalized.type, "image/jpeg");
    });

    test("normalizes Expo document picker asset with mimeType", () => {
      const doc = {
        uri: "content://com.android.providers.media.documents/document/123",
        name: "cr-document.pdf",
        mimeType: "application/pdf",
        size: 500000,
      };

      const normalized = normalizeRNFile(doc, "document");
      assert.ok(normalized);
      assert.equal(normalized.name, "cr-document.pdf");
      assert.equal(normalized.type, "application/pdf");
    });

    test("derives filename from uri when fileName or name are missing", () => {
      const asset = {
        uri: "file:///path/to/my_license.png",
      };

      const normalized = normalizeRNFile(asset, "image");
      assert.ok(normalized);
      assert.equal(normalized.name, "my_license.png");
      assert.equal(normalized.type, "image/png");
    });

    test("enforces 10MB limit on mobile files", () => {
      const oversized = {
        uri: "file:///path/to/big.pdf",
        name: "big.pdf",
        mimeType: "application/pdf",
        size: 11 * 1024 * 1024, // 11MB
      };

      assert.throws(() => {
        normalizeRNFile(oversized, "document");
      }, /exceeds the 10\s*MB limit/i);
    });

    test("rejects disallowed SVG files for image fields", () => {
      const svgFile = {
        uri: "file:///path/to/vector.svg",
        name: "vector.svg",
        type: "image/svg+xml",
      };

      assert.throws(() => {
        normalizeRNFile(svgFile, "image");
      }, /SVG files are not supported/i);
    });

    test("accepts allowed mixed files (PDF or images) for price packages and verification", () => {
      const pdf = { uri: "file:///pkg.pdf", name: "pkg.pdf", mimeType: "application/pdf" };
      const img = { uri: "file:///pkg.jpg", name: "pkg.jpg", mimeType: "image/jpeg" };

      const normPdf = normalizeRNFile(pdf, "mixed");
      const normImg = normalizeRNFile(img, "mixed");

      assert.equal(normPdf.type, "application/pdf");
      assert.equal(normImg.type, "image/jpeg");
    });

    test("rejects office documents and mismatched MIME types in mixed fields", () => {
      assert.throws(
        () => normalizeRNFile({ uri: "file:///pkg.docx", name: "pkg.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }, "mixed"),
        /Allowed: PDF, JPG, or PNG/i,
      );
      assert.throws(
        () => normalizeRNFile({ uri: "file:///fake.jpg", name: "fake.jpg", mimeType: "application/pdf" }, "mixed"),
        /do not match/i,
      );
    });
  });

  describe("buildVendorFormData serialization", () => {
    test("serializes canonical vendor payload with WhatsApp, Twitter, LinkedIn, YouTube, and preferredLanguage", () => {
      const vendorData = {
        identity: {
          brandName: "Al-Halaa Events",
          ownerFullName: "Ahmed Al-Salem",
          phoneNumber: "0512345678",
          email: "ahmed@example.com",
          password: "Secret123Password!",
          passwordConfirm: "Secret123Password!",
          preferredLanguage: "ar",
        },
        serviceData: {
          serviceDescription: "Premier corporate and private event planning in Riyadh.",
          taglineAr: "خدمات فعاليات مميزة",
          taglineEn: "Premier event services",
          eventPlanning: ["hallAndLoungeRentals", "tableOrganizationAndSeating"],
          serviceLocation: {
            regionId: 1,
            regionNameAr: "منطقة الرياض",
            regionNameEn: "Riyadh Region",
            cityId: 101,
            cityNameAr: "الرياض",
            cityNameEn: "Riyadh",
            districtIds: [1001, 1002],
            coverageType: "city",
          },
          otherData: "Available 24/7",
        },
        samplesAndPackages: {
          businessLogo: { uri: "file:///logo.png", fileName: "logo.png", mimeType: "image/png" },
          portfolioImages: [
            { uri: "file:///p1.jpg", fileName: "p1.jpg", mimeType: "image/jpeg" },
            { uri: "file:///p2.jpg", fileName: "p2.jpg", mimeType: "image/jpeg" },
          ],
          pricePackages: [
            { uri: "file:///pricing.pdf", name: "pricing.pdf", mimeType: "application/pdf" },
          ],
          profileFile: { uri: "file:///profile.pdf", name: "profile.pdf", mimeType: "application/pdf" },
        },
        commercialVerification: {
          commercialRecordNumber: "1010123456",
          commercialRecordImage: { uri: "file:///cr.pdf", name: "cr.pdf", mimeType: "application/pdf" },
          nationalId: "1012345678",
          nationalIdImage: { uri: "file:///id.jpg", name: "id.jpg", mimeType: "image/jpeg" },
        },
        socialLinks: {
          whatsapp: "0512345678",
          instagram: "https://instagram.com/alhalaa",
          facebook: "https://facebook.com/alhalaa",
          tiktok: "https://tiktok.com/@alhalaa",
          twitter: "https://twitter.com/alhalaa",
          linkedin: "https://linkedin.com/in/alhalaa",
          youtube: "https://youtube.com/@alhalaa",
          website: "https://alhalaa.com",
        },
      };

      const fd = buildVendorFormData(vendorData);

      // Verify text fields
      assert.equal(fd.get("brandName"), "Al-Halaa Events");
      assert.equal(fd.get("ownerFullName"), "Ahmed Al-Salem");
      assert.equal(fd.get("email"), "ahmed@example.com");
      assert.equal(fd.get("phoneNumber"), "0512345678");
      assert.equal(fd.get("password"), "Secret123Password!");
      assert.equal(fd.get("passwordConfirm"), "Secret123Password!");
      assert.equal(fd.get("preferredLanguage"), "ar");
      assert.equal(fd.get("commercialRegistrationNumber"), "1010123456");
      assert.equal(fd.get("nationalId"), "1012345678");

      // Verify socialLinks JSON includes WhatsApp and all social networks
      const socialLinksJson = JSON.parse(fd.get("socialLinks"));
      assert.equal(socialLinksJson.whatsapp, "0512345678");
      assert.equal(socialLinksJson.instagram, "https://instagram.com/alhalaa");
      assert.equal(socialLinksJson.facebook, "https://facebook.com/alhalaa");
      assert.equal(socialLinksJson.tiktok, "https://tiktok.com/@alhalaa");
      assert.equal(socialLinksJson.twitter, "https://twitter.com/alhalaa");
      assert.equal(socialLinksJson.linkedin, "https://linkedin.com/in/alhalaa");
      assert.equal(socialLinksJson.youtube, "https://youtube.com/@alhalaa");
      assert.equal(socialLinksJson.website, "https://alhalaa.com");

      // Verify location JSON
      const locationJson = JSON.parse(fd.get("location"));
      assert.equal(locationJson.regionId, 1);
      assert.equal(locationJson.regionNameEn, "Riyadh Region");
      assert.equal(locationJson.cityId, 101);
      assert.equal(locationJson.cityNameAr, "الرياض");
      assert.deepEqual(locationJson.districtIds, [1001, 1002]);

      // Verify files
      const crFile = fd.get("commercialRecordImage");
      assert.ok(crFile);
      assert.equal(crFile.name, "cr.pdf");
      assert.equal(crFile.type, "application/pdf");

      const idFile = fd.get("nationalIdImage");
      assert.ok(idFile);
      assert.equal(idFile.name, "id.jpg");
      assert.equal(idFile.type, "image/jpeg");

      const priceFiles = fd.getAll("pricePackages");
      assert.equal(priceFiles.length, 1);
      assert.equal(priceFiles[0].name, "pricing.pdf");

      const profileFile = fd.get("profileFile");
      assert.ok(profileFile);
      assert.equal(profileFile.name, "profile.pdf");

      // CRITICAL: Ensure dead 'cv' field is NEVER appended
      assert.equal(fd.has("cv"), false, "Dead 'cv' field must not exist in form data");
    });
  });

  describe("Draft storage safety contract", () => {
    test("draft payload excludes passwords, IDs, CR numbers, and file blobs", () => {
      // Mock raw form values containing sensitive data
      const fullFormValues = {
        identity: {
          brandName: "Safe Brand",
          ownerFullName: "Jane Doe",
          phoneNumber: "0555555555",
          email: "jane@safe.com",
          password: "SuperSecretPassword123!",
          passwordConfirm: "SuperSecretPassword123!",
          preferredLanguage: "en",
        },
        serviceData: {
          serviceDescription: "Quality catering services across Riyadh.",
          eventPlanning: ["hospitalityStaff"],
          serviceLocation: { regionId: 1, coverageType: "city" },
        },
        samplesAndPackages: {
          businessLogo: { uri: "file:///logo.png" },
          portfolioImages: [{ uri: "file:///photo.jpg" }],
          pricePackages: [{ uri: "file:///prices.pdf" }],
          profileFile: { uri: "file:///profile.pdf" },
        },
        commercialVerification: {
          commercialRecordNumber: "1010999999",
          commercialRecordImage: { uri: "file:///cr.pdf" },
          nationalId: "1099999999",
          nationalIdImage: { uri: "file:///id.jpg" },
        },
        socialLinks: {
          whatsapp: "0555555555",
          instagram: "https://instagram.com/safe",
        },
      };

      const draftPayload = createVendorDraftPayload(fullFormValues, "en", 1234);

      // Ensure sensitive values are not present anywhere in the draft payload
      const serialized = JSON.stringify(draftPayload);
      assert.ok(!serialized.includes("SuperSecretPassword123!"), "Password must not be in draft");
      assert.ok(!serialized.includes("1010999999"), "Commercial record number must not be in draft");
      assert.ok(!serialized.includes("1099999999"), "National ID must not be in draft");
      assert.ok(!serialized.includes("file:///"), "File URIs and blobs must not be in draft");
      assert.ok(!serialized.includes("jane@safe.com"), "Email must not be in draft");
      assert.ok(!serialized.includes("0555555555"), "Phone and WhatsApp must not be in draft");
      assert.ok(!serialized.includes("Jane Doe"), "Owner name must not be in draft");
    });
  });
});
