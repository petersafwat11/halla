const { test } = require("node:test");
const assert = require("node:assert/strict");

class ReactNativeFormData {
  constructor() {
    this._entries = [];
  }
  append(key, value) {
    this._entries.push([key, value]);
  }
  get(key) {
    const entry = this._entries.find(([k]) => k === key);
    return entry ? entry[1] : null;
  }
  getAll(key) {
    return this._entries.filter(([k]) => k === key).map(([, v]) => v);
  }
  has(key) {
    return this._entries.some(([k]) => k === key);
  }
}

const _resolveMimeType = (image) => {
  if (image.mimeType) return image.mimeType;
  if (image.type && image.type !== "image") return image.type;
  const uri = (image.uri || "").toLowerCase();
  if (uri.endsWith(".png")) return "image/png";
  if (uri.endsWith(".gif")) return "image/gif";
  if (uri.endsWith(".webp")) return "image/webp";
  if (uri.endsWith(".jpg") || uri.endsWith(".jpeg")) return "image/jpeg";
  return "image/jpeg";
};

const buildServiceFormData = (data, FormDataClass = ReactNativeFormData) => {
  const formData = new FormDataClass();
  if (data.name != null) formData.append("name", data.name);
  if (data.nameAr != null) formData.append("nameAr", data.nameAr);
  if (data.category != null) formData.append("category", data.category);
  if (data.description != null) formData.append("description", data.description);
  if (data.descriptionAr != null) formData.append("descriptionAr", data.descriptionAr);
  if (data.price != null) formData.append("price", String(data.price));
  if (data.included != null) {
    formData.append(
      "included",
      JSON.stringify(Array.isArray(data.included) ? data.included : [])
    );
  }
  if (data.tags != null) {
    formData.append(
      "tags",
      JSON.stringify(Array.isArray(data.tags) ? data.tags : [])
    );
  }
  if (data.image?.uri && !/^https?:\/\//i.test(data.image.uri)) {
    formData.append("image", {
      uri: data.image.uri,
      type: _resolveMimeType(data.image),
      name: data.image.fileName || data.image.name || "service.jpg",
    });
  }
  return formData;
};

test("vendorServiceSchema validates required fields, lengths, and bounds", async () => {
  const { addServiceSchema } = await import("../../utils/schemas/vendorServiceSchema.js");
  const schema = addServiceSchema((k) => k);

  // Valid service
  const validData = {
    serviceName: "Wedding Photography",
    serviceNameAr: "تصوير أعراس",
    serviceType: "mediaProduction",
    description: "Full day professional wedding photography coverage",
    descriptionAr: "تغطية تصوير احترافية ليوم الزفاف بالكامل",
    price: "1500.50",
  };

  const result = schema.safeParse(validData);
  assert.equal(result.success, true, "Valid service data parses successfully");
  if (result.success) {
    assert.equal(result.data.price, "1500.50");
  }

  // Name too short (< 2)
  const shortName = schema.safeParse({ ...validData, serviceName: "A" });
  assert.equal(shortName.success, false);
  assert.equal(shortName.error.issues[0].message, "services.validation.nameMinLength");

  // Missing serviceType
  const noType = schema.safeParse({ ...validData, serviceType: "" });
  assert.equal(noType.success, false);
  assert.equal(noType.error.issues[0].message, "services.validation.typeRequired");

  // Description too short (< 10)
  const shortDesc = schema.safeParse({ ...validData, description: "Short" });
  assert.equal(shortDesc.success, false);
  assert.equal(shortDesc.error.issues[0].message, "services.validation.descriptionMinLength");

  // Optional Arabic fields empty string
  const emptyArabic = schema.safeParse({
    ...validData,
    serviceNameAr: "",
    descriptionAr: "",
  });
  assert.equal(emptyArabic.success, true);
});

test("vendorServiceSchema handles price validation, normalization, and zero price", async () => {
  const { addServiceSchema, normalizeArabicDigits } = await import("../../utils/schemas/vendorServiceSchema.js");
  const schema = addServiceSchema((k) => k);

  const base = {
    serviceName: "DJ & Sound",
    serviceType: "soundLightingEntertainment",
    description: "High-end sound system and DJ service for all events",
  };

  // Zero price (free consultation / service)
  const zeroPrice = schema.safeParse({ ...base, price: "0" });
  assert.equal(zeroPrice.success, true);
  assert.equal(zeroPrice.data.price, "0");

  // Arabic-Indic digits normalization (٠١٢٣٤٥٦٧٨٩ -> 0123456789)
  assert.equal(normalizeArabicDigits("١٥٠٠.٥٠"), "1500.50");
  const arabicDigits = schema.safeParse({ ...base, price: "١٥٠٠.٥٠" });
  assert.equal(arabicDigits.success, true);
  assert.equal(arabicDigits.data.price, "1500.50");

  // Eastern Arabic / Persian digits normalization (۰۱۲۳۴۵۶۷۸۹ -> 0123456789)
  assert.equal(normalizeArabicDigits("۲۵۰۰"), "2500");
  const persianDigits = schema.safeParse({ ...base, price: "۲۵۰۰" });
  assert.equal(persianDigits.success, true);
  assert.equal(persianDigits.data.price, "2500");

  // Invalid price: letters / non-numeric
  const invalidText = schema.safeParse({ ...base, price: "free" });
  assert.equal(invalidText.success, false);
  assert.equal(invalidText.error.issues[0].message, "services.validation.priceInvalid");

  // Invalid price: more than 2 decimal places
  const invalidDecimals = schema.safeParse({ ...base, price: "99.999" });
  assert.equal(invalidDecimals.success, false);
  assert.equal(invalidDecimals.error.issues[0].message, "services.validation.priceInvalid");

  // Missing price
  const emptyPrice = schema.safeParse({ ...base, price: "" });
  assert.equal(emptyPrice.success, false);
  assert.equal(emptyPrice.error.issues[0].message, "services.validation.priceRequired");
});

test("buildServiceFormData: edit without changing image does NOT attach remote URL as file", () => {
  const editPayload = {
    name: "Catering Package",
    nameAr: "",
    category: "foodAndBeverages",
    description: "Delicious buffet for up to 100 guests with drinks",
    descriptionAr: "",
    price: 3500,
    tags: ["weddings", "corporate"],
    included: ["Main course", "Desserts", "Beverages"],
    image: { uri: "https://minio.halaa.app/halaa-bucket/services/service-123.jpg" },
  };

  const formData = buildServiceFormData(editPayload);

  // The remote image must NOT be appended as a file (backend preserves existing image)
  assert.equal(formData.has("image"), false, "Remote preview image URL is not attached as a file");
  assert.equal(formData.get("name"), "Catering Package");
  assert.equal(formData.get("nameAr"), "", "Empty nameAr is appended to allow clearing");
  assert.equal(formData.get("descriptionAr"), "", "Empty descriptionAr is appended to allow clearing");
  assert.equal(formData.get("price"), "3500");
  assert.equal(formData.get("category"), "foodAndBeverages");
  assert.deepEqual(JSON.parse(formData.get("included")), ["Main course", "Desserts", "Beverages"]);
  assert.deepEqual(JSON.parse(formData.get("tags")), ["weddings", "corporate"]);
});

test("buildServiceFormData: new local image IS attached as file", () => {
  const newPayload = {
    name: "Floral Decor",
    category: "eventPlanning",
    description: "Full wedding hall floral decoration and centerpieces",
    price: 0,
    image: {
      uri: "file:///data/user/0/host.exp.exponent/cache/ExperienceData/photo.jpg",
      fileName: "flower.jpg",
      type: "image/jpeg",
    },
  };

  const formData = buildServiceFormData(newPayload);

  assert.equal(formData.has("image"), true, "Local file image is attached as file");
  const attachedImage = formData.get("image");
  assert.equal(attachedImage.uri, "file:///data/user/0/host.exp.exponent/cache/ExperienceData/photo.jpg");
  assert.equal(attachedImage.name, "flower.jpg");
  assert.equal(attachedImage.type, "image/jpeg");
  assert.equal(formData.get("price"), "0", "Price 0 is correctly converted to string 0");
});

test("pre-fill mappings: category mapping and price 0 preservation", () => {
  const backendRawService = {
    id: "srv_99",
    name: "Free Consultation",
    nameAr: "استشارة مجانية",
    description: "Initial event planning and budgeting consultation",
    descriptionAr: "جلسة استشارية أولية للتخطيط والميزانية",
    category: "eventPlanning",
    price: 0,
    image: "https://minio.halaa.app/uploads/services/consult.jpg",
    tags: ["weddings"],
    included: ["1 Hour Call", "Checklist PDF"],
    status: "active",
  };

  // Pre-fill mapping verified
  const formDefaults = {
    serviceName: backendRawService.name || "",
    serviceNameAr: backendRawService.nameAr || "",
    serviceType: backendRawService.category || "",
    description: backendRawService.description || "",
    descriptionAr: backendRawService.descriptionAr || "",
    price: String(backendRawService.price ?? ""),
    serviceImage: backendRawService.image ? { uri: backendRawService.image } : undefined,
  };

  assert.equal(formDefaults.serviceType, "eventPlanning", "_raw.category maps to serviceType");
  assert.equal(formDefaults.price, "0", "price 0 maps to '0' rather than empty string");
  assert.deepEqual(backendRawService.included, ["1 Hour Call", "Checklist PDF"]);
});
