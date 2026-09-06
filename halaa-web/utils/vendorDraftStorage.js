/**
 * Vendor Signup Draft Persistence Utility
 *
 * Rules:
 * 1. STRICTLY EXCLUDE sensitive fields: password, passwordConfirm,
 *    nationalId, commercialRecordNumber, and ALL files.
 * 2. Persist only non-sensitive form state (brand name, owner name,
 *    categories, service description, service location, social links).
 * 3. Enforce schema versioning and 24-hour TTL.
 */

const DRAFT_STORAGE_KEY = "halaa_vendor_signup_draft_v1";
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const getDraftStorageKey = (locale) => `${DRAFT_STORAGE_KEY}_${locale === "en" ? "en" : "ar"}`;

export const saveVendorDraft = (formValues, locale = "ar") => {
  if (typeof window === "undefined" || !formValues) return;

  try {
    const { identity, serviceData, socialLinks } = formValues;

    const draftPayload = {
      version: 1,
      timestamp: Date.now(),
      locale,
      data: {
        identity: {
          brandName: identity?.brandName || "",
          preferredLanguage: identity?.preferredLanguage || locale,
        },
        serviceData: {
          serviceDescription: serviceData?.serviceDescription || "",
          taglineAr: serviceData?.taglineAr || "",
          taglineEn: serviceData?.taglineEn || "",
          aboutAr: serviceData?.aboutAr || "",
          aboutEn: serviceData?.aboutEn || "",
          eventPlanning: serviceData?.eventPlanning || [],
          mediaProduction: serviceData?.mediaProduction || [],
          giftsAndGiveaways: serviceData?.giftsAndGiveaways || [],
          foodAndBeverages: serviceData?.foodAndBeverages || [],
          beautyAndFashion: serviceData?.beautyAndFashion || [],
          logisticsAndDelivery: serviceData?.logisticsAndDelivery || [],
          corporateServices: serviceData?.corporateServices || [],
          supportServices: serviceData?.supportServices || [],
          technicalServices: serviceData?.technicalServices || [],
          soundLightingEntertainment:
            serviceData?.soundLightingEntertainment || [],
          hallsAndVenues: serviceData?.hallsAndVenues || [],
          serviceLocation: serviceData?.serviceLocation || {
            coverageType: "city",
          },
          otherData: serviceData?.otherData || "",
        },
        socialLinks: {
          instagram: socialLinks?.instagram || "",
          facebook: socialLinks?.facebook || "",
          tiktok: socialLinks?.tiktok || "",
          twitter: socialLinks?.twitter || "",
          linkedin: socialLinks?.linkedin || "",
          youtube: socialLinks?.youtube || "",
          website: socialLinks?.website || "",
        },
      },
    };

    localStorage.setItem(getDraftStorageKey(locale), JSON.stringify(draftPayload));
  } catch (err) {
    // ignore quota errors
  }
};

export const loadVendorDraft = (locale = "ar") => {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(getDraftStorageKey(locale));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1) {
      clearVendorDraft(locale);
      return null;
    }

    // Check TTL (24h)
    if (Date.now() - parsed.timestamp > DRAFT_TTL_MS) {
      clearVendorDraft(locale);
      return null;
    }

    return parsed.data;
  } catch (err) {
    return null;
  }
};

export const clearVendorDraft = (locale) => {
  if (typeof window === "undefined") return;
  try {
    if (locale) {
      localStorage.removeItem(getDraftStorageKey(locale));
    } else {
      localStorage.removeItem(getDraftStorageKey("ar"));
      localStorage.removeItem(getDraftStorageKey("en"));
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  } catch (err) {
    // ignore
  }
};
