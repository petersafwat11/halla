"use client";

/**
 * Auth Service Utilities
 * Multi-step form validation and data transformation utilities
 */

// ============================================
// STEP VALIDATION UTILITIES
// ============================================

/**
 * Validates a specific step in a multi-step form
 * @param {Object} options - Validation options
 * @param {Function} options.schema - Zod schema factory function (receives t)
 * @param {string[]} options.stepFields - Array of field paths to validate for this step
 * @param {Function} options.getValues - react-hook-form getValues function
 * @param {Function} options.setError - react-hook-form setError function
 * @param {Function} options.clearErrors - react-hook-form clearErrors function
 * @param {Function} options.t - Translation function
 * @returns {boolean} - Whether validation passed
 */
export const validateFormStep = ({
  schema,
  stepFields,
  getValues,
  setError,
  clearErrors,
  t,
}) => {
  if (!stepFields || stepFields.length === 0) {
    return true; // No validation needed for this step
  }

  // Clear previous errors for this step's fields
  stepFields.forEach((field) => clearErrors?.(field));

  const formValues = getValues();
  const fullSchema = schema(t);

  // Extract only the fields for this step
  const stepData = {};
  stepFields.forEach((field) => {
    const value = getNestedValue(formValues, field);
    setNestedValue(stepData, field, value);
  });

  try {
    // Create a partial schema for just these fields
    const partialSchema = fullSchema.pick(
      stepFields.reduce((acc, field) => {
        const rootField = field.split(".")[0];
        acc[rootField] = true;
        return acc;
      }, {})
    );

    partialSchema.parse(stepData);
    return true;
  } catch (error) {
    if (error.errors) {
      error.errors.forEach((err) => {
        const path = err.path.join(".");
        setError?.(path, { type: "manual", message: err.message });
      });
    }
    return false;
  }
};

/**
 * Handles navigation to next step with validation
 * @param {Object} options - Navigation options
 * @param {number} options.currentStep - Current step number
 * @param {number} options.totalSteps - Total number of steps
 * @param {Function} options.setStep - setState function for step
 * @param {Function} options.validateStep - Function to validate current step
 * @param {Object} options.router - Next.js router
 * @returns {boolean} - Whether navigation succeeded
 */
export const handleNextStep = ({
  currentStep,
  totalSteps,
  setStep,
  validateStep,
  router,
}) => {
  if (currentStep >= totalSteps) {
    return false;
  }

  const isValid = validateStep();
  if (!isValid) {
    return false;
  }

  const newStep = currentStep + 1;
  setStep(newStep);

  // Update URL query param
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    params.set("step", newStep);
    router?.replace(`?${params.toString()}`, { scroll: false });
  }

  return true;
};

/**
 * Handles navigation to previous step
 * @param {Object} options - Navigation options
 * @param {number} options.currentStep - Current step number
 * @param {Function} options.setStep - setState function for step
 * @param {Object} options.router - Next.js router
 * @returns {boolean} - Whether navigation succeeded
 */
export const handlePrevStep = ({ currentStep, setStep, router }) => {
  if (currentStep <= 1) {
    return false;
  }

  const newStep = currentStep - 1;
  setStep(newStep);

  // Update URL query param
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    params.set("step", newStep);
    router?.replace(`?${params.toString()}`, { scroll: false });
  }

  return true;
};

// ============================================
// DATA TRANSFORMATION UTILITIES
// ============================================

/**
 * Flattens vendor form data for backend submission
 * @param {Object} formValues - The nested form values from react-hook-form
 * @returns {Object} - Flattened data matching backend expectations
 */
export const flattenVendorData = (formValues) => {
  const {
    identity,
    serviceData,
    samplesAndPackages,
    commercialVerification,
    socialLinks,
  } = formValues;

  // Build serviceCategories from individual category arrays
  const serviceCategories = {};
  if (serviceData) {
    const categoryFields = [
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
    categoryFields.forEach((field) => {
      if (serviceData[field] && serviceData[field].length > 0) {
        serviceCategories[field] = serviceData[field];
      }
    });
  }

  return {
    // Core user fields (flat)
    email: identity?.email,
    phoneNumber: identity?.phoneNumber,
    password: identity?.password,
    passwordConfirm: identity?.passwordConfirm,
    brandName: identity?.brandName,
    ownerFullName: identity?.ownerFullName,

    // Service data (flat)
    serviceDescription: serviceData?.serviceDescription,
    categories: serviceData?.categories || [],
    serviceCategories,
    city: serviceData?.city,
    coverageArea: serviceData?.coverageArea,
    otherData: serviceData?.otherData,

    // Commercial verification (flat)
    commercialRecordNumber: commercialVerification?.commercialRecordNumber,
    nationalId: commercialVerification?.nationalId,

    // Social links (nested is OK)
    socialLinks: {
      instagram: socialLinks?.instagram || socialLinks?.instagramLink || "",
      facebook: socialLinks?.facebook || socialLinks?.facebookLink || "",
      tiktok: socialLinks?.tiktok || socialLinks?.tiktokLink || "",
      twitter: socialLinks?.twitter || socialLinks?.twitterLink || "",
      website: socialLinks?.website || socialLinks?.websiteLink || "",
    },
  };
};

/**
 * Builds FormData for vendor signup with files
 * Backend expects flat fields at root level, not nested objects
 * @param {Object} formValues - Form values
 * @returns {FormData} - FormData ready for submission
 */
export const buildVendorFormData = (formValues) => {
  const formData = new FormData();
  const {
    identity,
    serviceData,
    samplesAndPackages,
    commercialVerification,
    socialLinks,
    otherLinksAndData,
  } = formValues;

  // Core user fields - MUST be flat at root level
  if (identity?.email) formData.append("email", identity.email);
  if (identity?.phoneNumber)
    formData.append("phoneNumber", identity.phoneNumber);
  if (identity?.password) formData.append("password", identity.password);
  if (identity?.brandName) formData.append("brandName", identity.brandName);
  if (identity?.ownerFullName)
    formData.append("ownerFullName", identity.ownerFullName);

  // Service data - flat fields
  if (serviceData?.serviceDescription)
    formData.append("serviceDescription", serviceData.serviceDescription);
  ["taglineAr", "taglineEn", "aboutAr", "aboutEn"].forEach((field) => {
    if (serviceData?.[field]) formData.append(field, serviceData[field]);
  });
  if (serviceData?.otherData)
    formData.append("otherData", serviceData.otherData);

  // Service location - as JSON object
  if (serviceData?.serviceLocation) {
    formData.append(
      "serviceLocation",
      JSON.stringify(serviceData.serviceLocation)
    );
  }

  // Service categories - build from individual arrays
  const serviceCategories = {};
  const categoryFields = [
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
  categoryFields.forEach((field) => {
    if (serviceData?.[field] && serviceData[field].length > 0) {
      serviceCategories[field] = serviceData[field];
    }
  });
  if (Object.keys(serviceCategories).length > 0) {
    formData.append("serviceCategories", JSON.stringify(serviceCategories));
  }

  // Commercial verification - flat fields
  if (commercialVerification?.commercialRecordNumber) {
    formData.append(
      "commercialRecordNumber",
      commercialVerification.commercialRecordNumber
    );
  }
  if (commercialVerification?.nationalId) {
    formData.append("nationalId", commercialVerification.nationalId);
  }

  // Social links - as JSON object (check both socialLinks and otherLinksAndData)
  const links = socialLinks || otherLinksAndData || {};
  const socialLinksData = {
    instagram: links.instagram || links.instagramLink || "",
    facebook: links.facebook || links.facebookLink || "",
    tiktok: links.tiktok || links.tiktokLink || "",
    twitter: links.twitter || links.twitterLink || "",
    website: links.website || links.websiteLink || "",
    whatsapp: links.whatsapp || links.whatsappNumber || "",
  };
  formData.append("socialLinks", JSON.stringify(socialLinksData));

  // Add files
  // Portfolio images
  const portfolioImages = samplesAndPackages?.portfolioImages || [];
  portfolioImages.forEach((file) => {
    if (file instanceof File) {
      formData.append("portfolioImages", file);
    }
  });

  // Business logo
  const businessLogo = samplesAndPackages?.businessLogo;
  if (businessLogo instanceof File) {
    formData.append("businessLogo", businessLogo);
  } else if (Array.isArray(businessLogo) && businessLogo[0] instanceof File) {
    formData.append("businessLogo", businessLogo[0]);
  }

  // Price packages
  const pricePackages = samplesAndPackages?.pricePackages || [];
  pricePackages.forEach((file) => {
    if (file instanceof File) {
      formData.append("pricePackages", file);
    }
  });

  // Commercial record image - use correct field name for backend
  const commercialRecordImage = commercialVerification?.commercialRecordImage;
  if (commercialRecordImage instanceof File) {
    formData.append("commercialRecordImage", commercialRecordImage);
  } else if (
    Array.isArray(commercialRecordImage) &&
    commercialRecordImage[0] instanceof File
  ) {
    formData.append("commercialRecordImage", commercialRecordImage[0]);
  }

  // National ID image
  const nationalIdImage = commercialVerification?.nationalIdImage;
  if (nationalIdImage instanceof File) {
    formData.append("nationalIdImage", nationalIdImage);
  } else if (
    Array.isArray(nationalIdImage) &&
    nationalIdImage[0] instanceof File
  ) {
    formData.append("nationalIdImage", nationalIdImage[0]);
  }

  // CV file (if exists)
  const cvFile = commercialVerification?.cv || otherLinksAndData?.cv;
  if (cvFile instanceof File) {
    formData.append("cv", cvFile);
  } else if (Array.isArray(cvFile) && cvFile[0] instanceof File) {
    formData.append("cv", cvFile[0]);
  }

  // Profile file
  const profileFile =
    otherLinksAndData?.profileFile || samplesAndPackages?.profileFile;
  if (profileFile instanceof File) {
    formData.append("profileFile", profileFile);
  } else if (Array.isArray(profileFile) && profileFile[0] instanceof File) {
    formData.append("profileFile", profileFile[0]);
  }

  return formData;
};

// ============================================
// HELPER UTILITIES
// ============================================

/**
 * Gets a nested value from an object using dot notation
 * @param {Object} obj - The object to get the value from
 * @param {string} path - Dot-notation path (e.g., "identity.email")
 * @returns {*} - The value at the path
 */
export const getNestedValue = (obj, path) => {
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
};

/**
 * Sets a nested value in an object using dot notation
 * @param {Object} obj - The object to set the value in
 * @param {string} path - Dot-notation path (e.g., "identity.email")
 * @param {*} value - The value to set
 */
export const setNestedValue = (obj, path, value) => {
  const keys = path.split(".");
  const lastKey = keys.pop();
  const target = keys.reduce((acc, key) => {
    if (!acc[key]) acc[key] = {};
    return acc[key];
  }, obj);
  target[lastKey] = value;
};

/**
 * Step field mappings for vendor signup
 */
export const VENDOR_STEP_FIELDS = {
  1: ["identity"],
  2: ["serviceData"],
  3: ["samplesAndPackages"],
  4: ["commercialVerification"],
  5: ["socialLinks"],
};

const authService = {
  validateFormStep,
  handleNextStep,
  handlePrevStep,
  flattenVendorData,
  buildVendorFormData,
  getNestedValue,
  setNestedValue,
  VENDOR_STEP_FIELDS,
};

export default authService;
