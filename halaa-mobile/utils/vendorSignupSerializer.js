import { normalizeRNFile } from "./fileUtils.js";

/**
 * Serialize vendor signup form values into multipart/form-data payload.
 * Single canonical source of truth for mobile, mirroring web serialization.
 */
export const buildVendorFormData = (vendorData) => {
  if (vendorData instanceof FormData) return vendorData;
  const formData = new FormData();
  const {
    identity,
    serviceData,
    samplesAndPackages,
    commercialVerification,
    socialLinks,
  } = vendorData;

  // Identity
  if (identity?.email) formData.append("email", identity.email);
  if (identity?.phoneNumber) formData.append("phoneNumber", identity.phoneNumber);
  if (identity?.password) formData.append("password", identity.password);
  if (identity?.passwordConfirm) formData.append("passwordConfirm", identity.passwordConfirm);
  if (identity?.brandName) formData.append("brandName", identity.brandName);
  if (identity?.ownerFullName) formData.append("ownerFullName", identity.ownerFullName);
  formData.append("preferredLanguage", identity?.preferredLanguage || "ar");

  // Service data
  if (serviceData?.serviceDescription) formData.append("serviceDescription", serviceData.serviceDescription);
  if (serviceData?.taglineAr) formData.append("taglineAr", serviceData.taglineAr);
  if (serviceData?.taglineEn) formData.append("taglineEn", serviceData.taglineEn);
  if (serviceData?.aboutAr) formData.append("aboutAr", serviceData.aboutAr);
  if (serviceData?.aboutEn) formData.append("aboutEn", serviceData.aboutEn);
  if (serviceData?.otherData) formData.append("otherData", serviceData.otherData);

  // Categories JSON
  const categoriesPayload = {};
  const categoryKeys = [
    "eventPlanning",
    "mediaProduction",
    "giftsAndGiveaways",
    "foodAndBeverages",
    "beautyAndFashion",
    "logisticsAndDelivery",
    "corporateServices",
    "supportServices",
    "technicalServices",
    "soundLightingEntertainment",
    "hallsAndVenues",
  ];
  categoryKeys.forEach((k) => {
    if (serviceData?.[k] && serviceData[k].length > 0) {
      categoriesPayload[k] = serviceData[k];
    }
  });
  formData.append("serviceCategories", JSON.stringify(categoriesPayload));

  // Location JSON
  if (serviceData?.serviceLocation) {
    const loc = serviceData.serviceLocation;
    const locationPayload = {
      regionId: loc.regionId,
      regionNameAr: loc.regionNameAr || undefined,
      regionNameEn: loc.regionNameEn || undefined,
      cityId: loc.cityId || undefined,
      cityNameAr: loc.cityNameAr || undefined,
      cityNameEn: loc.cityNameEn || undefined,
      districtIds: loc.districtIds || [],
      districtNames: loc.districtNames || [],
      coverageType: loc.coverageType || "city",
    };
    formData.append("location", JSON.stringify(locationPayload));
  }

  // Verification text fields
  if (commercialVerification?.commercialRecordNumber) {
    formData.append("commercialRegistrationNumber", commercialVerification.commercialRecordNumber);
  }
  if (commercialVerification?.nationalId) {
    formData.append("nationalId", commercialVerification.nationalId);
  }

  // Canonical socialLinks JSON (WhatsApp + all URLs)
  if (socialLinks) {
    const socialPayload = {};
    if (socialLinks.whatsapp) socialPayload.whatsapp = socialLinks.whatsapp.trim();
    if (socialLinks.instagram) socialPayload.instagram = socialLinks.instagram.trim();
    if (socialLinks.facebook) socialPayload.facebook = socialLinks.facebook.trim();
    if (socialLinks.tiktok) socialPayload.tiktok = socialLinks.tiktok.trim();
    if (socialLinks.twitter) socialPayload.twitter = socialLinks.twitter.trim();
    if (socialLinks.linkedin) socialPayload.linkedin = socialLinks.linkedin.trim();
    if (socialLinks.youtube) socialPayload.youtube = socialLinks.youtube.trim();
    if (socialLinks.website) socialPayload.website = socialLinks.website.trim();
    formData.append("socialLinks", JSON.stringify(socialPayload));
  }

  // Files: Logo
  if (samplesAndPackages?.businessLogo) {
    const file = normalizeRNFile(samplesAndPackages.businessLogo, "image");
    if (file) formData.append("businessLogo", file);
  }

  // Files: Portfolio (1-10)
  if (samplesAndPackages?.portfolioImages?.length > 0) {
    samplesAndPackages.portfolioImages.forEach((img) => {
      const file = normalizeRNFile(img, "image");
      if (file) formData.append("portfolioImages", file);
    });
  }

  // Files: Price packages (PDF or images)
  if (samplesAndPackages?.pricePackages?.length > 0) {
    samplesAndPackages.pricePackages.forEach((pkg) => {
      const file = normalizeRNFile(pkg, "mixed");
      if (file) formData.append("pricePackages", file);
    });
  }

  // Files: Profile file (PDF/DOC)
  if (samplesAndPackages?.profileFile) {
    const file = normalizeRNFile(samplesAndPackages.profileFile, "document");
    if (file) formData.append("profileFile", file);
  }

  // Files: Commercial record (PDF or image)
  if (commercialVerification?.commercialRecordImage) {
    const file = normalizeRNFile(commercialVerification.commercialRecordImage, "mixed");
    if (file) formData.append("commercialRecordImage", file);
  }

  // Files: National ID (PDF or image)
  if (commercialVerification?.nationalIdImage) {
    const file = normalizeRNFile(commercialVerification.nationalIdImage, "mixed");
    if (file) formData.append("nationalIdImage", file);
  }

  return formData;
};
