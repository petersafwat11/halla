/**
 * Canonical Vendor Application Test Fixtures
 * Shared across shared, backend, web, and mobile contract suites.
 */

export const validCanonicalVendorPayload = Object.freeze({
  email: "vendor.fixture@example.com",
  phoneNumber: "0512345678",
  password: "Password123!",
  passwordConfirm: "Password123!",
  preferredLanguage: "ar",
  brandName: "Al-Hala Catering & Events",
  ownerFullName: "Mohammed Al-Otaibi",
  serviceDescription: "Providing premium event planning and catering hospitality in Riyadh.",
  taglineAr: "نصنع لحظات استثنائية",
  taglineEn: "Creating exceptional moments",
  aboutAr: "مؤسسة متخصصة في تقديم خدمات الضيافة وتنسيق الفعاليات بأعلى معايير الجودة.",
  aboutEn: "Specialized in luxury hospitality and event coordination.",
  serviceCategories: {
    eventPlanning: ["hallAndLoungeRentals", "tableOrganizationAndSeating"],
    foodAndBeverages: ["occasionCakes"],
  },
  location: {
    regionId: 1,
    regionNameAr: "منطقة الرياض",
    regionNameEn: "Riyadh Region",
    cityId: 101,
    cityNameAr: "الرياض",
    cityNameEn: "Riyadh",
    districtIds: [1001],
    districtNames: [{ nameAr: "الملقا", nameEn: "Al Malqa" }],
    coverageType: "city",
  },
  socialLinks: {
    instagram: "https://instagram.com/alhalacatering",
    twitter: "https://twitter.com/alhalacatering",
    whatsapp: "0512345678",
    website: "https://alhalacatering.com",
  },
  commercialRegistrationNumber: "1010123456",
  nationalId: "1012345678",
});

export const validVendorFormValues = Object.freeze({
  identity: {
    brandName: "Al-Hala Catering & Events",
    ownerFullName: "Mohammed Al-Otaibi",
    phoneNumber: "0512345678",
    email: "vendor.fixture@example.com",
    password: "Password123!",
    passwordConfirm: "Password123!",
    preferredLanguage: "ar",
  },
  serviceData: {
    serviceDescription: "Providing premium event planning and catering hospitality in Riyadh.",
    taglineAr: "نصنع لحظات استثنائية",
    taglineEn: "Creating exceptional moments",
    aboutAr: "مؤسسة متخصصة في تقديم خدمات الضيافة وتنسيق الفعاليات بأعلى معايير الجودة.",
    aboutEn: "Specialized in luxury hospitality and event coordination.",
    eventPlanning: ["hallAndLoungeRentals", "tableOrganizationAndSeating"],
    mediaProduction: [],
    giftsAndGiveaways: [],
    foodAndBeverages: ["occasionCakes"],
    beautyAndFashion: [],
    logisticsAndDelivery: [],
    corporateServices: [],
    supportServices: [],
    technicalServices: [],
    soundLightingEntertainment: [],
    hallsAndVenues: [],
    serviceLocation: {
      regionId: 1,
      regionNameAr: "منطقة الرياض",
      regionNameEn: "Riyadh Region",
      cityId: 101,
      cityNameAr: "الرياض",
      cityNameEn: "Riyadh",
      districtIds: [1001],
      districtNames: [{ nameAr: "الملقا", nameEn: "Al Malqa" }],
      coverageType: "city",
    },
    otherData: "",
  },
  samplesAndPackages: {
    portfolioImages: [{ name: "portfolio1.jpg", uri: "file:///mock/1.jpg", type: "image/jpeg" }],
    businessLogo: { name: "logo.png", uri: "file:///mock/logo.png", type: "image/png" },
    pricePackages: [{ name: "packages.pdf", uri: "file:///mock/pkg.pdf", type: "application/pdf" }],
    profileFile: null,
  },
  commercialVerification: {
    commercialRecordNumber: "1010123456",
    commercialRecordImage: { name: "cr.pdf", uri: "file:///mock/cr.pdf", type: "application/pdf" },
    nationalId: "1012345678",
    nationalIdImage: { name: "id.jpg", uri: "file:///mock/id.jpg", type: "image/jpeg" },
  },
  socialLinks: {
    instagram: "https://instagram.com/alhalacatering",
    twitter: "https://twitter.com/alhalacatering",
    whatsapp: "0512345678",
    website: "https://alhalacatering.com",
  },
});

export const invalidVendorPayloads = Object.freeze({
  passwordMismatch: {
    ...validCanonicalVendorPayload,
    passwordConfirm: "DifferentPassword123!",
  },
  passwordNoLetters: {
    ...validCanonicalVendorPayload,
    password: "1234567890!",
    passwordConfirm: "1234567890!",
  },
  passwordNoNumbers: {
    ...validCanonicalVendorPayload,
    password: "LettersOnlyPass!",
    passwordConfirm: "LettersOnlyPass!",
  },
  shortServiceDescription: {
    ...validCanonicalVendorPayload,
    serviceDescription: "Short",
  },
  longServiceDescription: {
    ...validCanonicalVendorPayload,
    serviceDescription: "A".repeat(501),
  },
  emptyCategories: {
    ...validCanonicalVendorPayload,
    serviceCategories: {
      eventPlanning: [],
      foodAndBeverages: [],
    },
  },
  unknownCategoryKey: {
    ...validCanonicalVendorPayload,
    serviceCategories: {
      unknownCategory: ["someOption"],
    },
  },
  unknownCategoryOption: {
    ...validCanonicalVendorPayload,
    serviceCategories: {
      eventPlanning: ["invalidOptionId"],
    },
  },
  invalidNationalIdStart: {
    ...validCanonicalVendorPayload,
    nationalId: "3012345678",
  },
  invalidNationalIdLength: {
    ...validCanonicalVendorPayload,
    nationalId: "101234567",
  },
  invalidCrNumberLength: {
    ...validCanonicalVendorPayload,
    commercialRegistrationNumber: "101012345",
  },
  invalidSocialUrl: {
    ...validCanonicalVendorPayload,
    socialLinks: {
      ...validCanonicalVendorPayload.socialLinks,
      instagram: "not-a-valid-url",
    },
  },
  invalidWhatsApp: {
    ...validCanonicalVendorPayload,
    socialLinks: {
      ...validCanonicalVendorPayload.socialLinks,
      whatsapp: "not-a-phone-number",
    },
  },
});
