/**
 * Build the non-sensitive subset of vendor signup state that may be persisted.
 * Kept separate from AsyncStorage so the privacy boundary is easy to test.
 */
export const createVendorDraftPayload = (formValues, locale = "ar", now = Date.now()) => {
  const { identity, serviceData, socialLinks } = formValues || {};
  return {
    version: 1,
    timestamp: now,
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
        soundLightingEntertainment: serviceData?.soundLightingEntertainment || [],
        hallsAndVenues: serviceData?.hallsAndVenues || [],
        serviceLocation: serviceData?.serviceLocation || { regionId: 0, coverageType: "city" },
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
};
