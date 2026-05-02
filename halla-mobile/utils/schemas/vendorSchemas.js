import * as Yup from "yup";

// Personal Info Schema
export const personalInfoSchema = Yup.object().shape({
  name: Yup.string()
    .required("Name is required")
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters"),
  email: Yup.string()
    .required("Email is required")
    .email("Invalid email format"),
  avatar: Yup.mixed().nullable(),
});

// Service Details Schema
export const serviceDetailsSchema = Yup.object().shape({
  serviceDescription: Yup.string()
    .required("Service description is required")
    .min(20, "Description must be at least 20 characters")
    .max(1000, "Description must not exceed 1000 characters"),
  nationalId: Yup.string()
    .required("National ID is required")
    .matches(/^[0-9]+$/, "National ID must contain only numbers")
    .min(10, "National ID must be at least 10 digits")
    .max(20, "National ID must not exceed 20 digits"),
  nationalIdImage: Yup.mixed().nullable(),
  commercialRecordImage: Yup.mixed().nullable(),
  serviceLocation: Yup.object().shape({
    address: Yup.string().required("Service location is required"),
    coordinates: Yup.object()
      .shape({
        latitude: Yup.number(),
        longitude: Yup.number(),
      })
      .nullable(),
  }),
  serviceCategories: Yup.array()
    .of(Yup.string())
    .min(1, "At least one category is required")
    .required("Service categories are required"),
});

// Images and Pricing Schema
export const imagesAndPricingSchema = Yup.object().shape({
  portfolioImages: Yup.array()
    .of(Yup.mixed())
    .min(1, "At least one portfolio image is required")
    .max(20, "Maximum 20 portfolio images allowed"),
  pricePackages: Yup.array()
    .of(Yup.mixed())
    .max(10, "Maximum 10 price package images allowed"),
});

// Social Links Schema
export const socialLinksSchema = Yup.object().shape({
  website: Yup.string().url("Invalid URL format").nullable(),
  instagram: Yup.string().url("Invalid URL format").nullable(),
  facebook: Yup.string().url("Invalid URL format").nullable(),
  twitter: Yup.string().url("Invalid URL format").nullable(),
  tiktok: Yup.string().url("Invalid URL format").nullable(),
});

// Add Service Schema
export const addServiceSchema = Yup.object().shape({
  name: Yup.string()
    .required("Service name is required")
    .min(3, "Service name must be at least 3 characters")
    .max(100, "Service name must not exceed 100 characters"),
  description: Yup.string()
    .required("Service description is required")
    .min(20, "Description must be at least 20 characters")
    .max(500, "Description must not exceed 500 characters"),
  price: Yup.number()
    .required("Price is required")
    .positive("Price must be positive")
    .min(1, "Price must be at least 1"),
  capacity: Yup.number()
    .required("Capacity is required")
    .positive("Capacity must be positive")
    .integer("Capacity must be a whole number")
    .min(1, "Capacity must be at least 1"),
  tags: Yup.array()
    .of(Yup.string())
    .min(1, "At least one tag is required")
    .max(10, "Maximum 10 tags allowed"),
  image: Yup.mixed().required("Service image is required"),
});

// Update Service Schema
export const updateServiceSchema = Yup.object().shape({
  name: Yup.string()
    .min(3, "Service name must be at least 3 characters")
    .max(100, "Service name must not exceed 100 characters"),
  description: Yup.string()
    .min(20, "Description must be at least 20 characters")
    .max(500, "Description must not exceed 500 characters"),
  price: Yup.number()
    .positive("Price must be positive")
    .min(1, "Price must be at least 1"),
  capacity: Yup.number()
    .positive("Capacity must be positive")
    .integer("Capacity must be a whole number")
    .min(1, "Capacity must be at least 1"),
  tags: Yup.array().of(Yup.string()).max(10, "Maximum 10 tags allowed"),
  image: Yup.mixed().nullable(),
});

// Vendor Ticket Schema
export const vendorTicketSchema = Yup.object().shape({
  type: Yup.string()
    .required("Ticket type is required")
    .oneOf(
      ["technical", "payment", "event", "user", "other", "inquiry", "issue", "request", "suggestion"],
      "Invalid ticket type",
    ),
  message: Yup.string()
    .required("Message is required")
    .min(10, "Message must be at least 10 characters")
    .max(5000, "Message must not exceed 5000 characters"),
  priority: Yup.string()
    .oneOf(["low", "medium", "high", "urgent"], "Invalid priority level")
    .default("medium"),
});

// Basic Account Info Schema
export const basicAccountInfoSchema = Yup.object().shape({
  ownerFullName: Yup.string()
    .required("Owner full name is required")
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters"),
  brandName: Yup.string()
    .required("Brand name is required")
    .min(2, "Brand name must be at least 2 characters")
    .max(100, "Brand name must not exceed 100 characters"),
  email: Yup.string()
    .required("Email is required")
    .email("Invalid email format"),
  phoneNumber: Yup.string()
    .required("Phone number is required")
    .matches(
      /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/,
      "Invalid phone number format",
    ),
});

// Validation helper functions
export const validatePersonalInfo = async (data) => {
  try {
    await personalInfoSchema.validate(data, { abortEarly: false });
    return { isValid: true, errors: {} };
  } catch (error) {
    const errors = {};
    error.inner.forEach((err) => {
      errors[err.path] = err.message;
    });
    return { isValid: false, errors };
  }
};

export const validateServiceDetails = async (data) => {
  try {
    await serviceDetailsSchema.validate(data, { abortEarly: false });
    return { isValid: true, errors: {} };
  } catch (error) {
    const errors = {};
    error.inner.forEach((err) => {
      errors[err.path] = err.message;
    });
    return { isValid: false, errors };
  }
};

export const validateImagesAndPricing = async (data) => {
  try {
    await imagesAndPricingSchema.validate(data, { abortEarly: false });
    return { isValid: true, errors: {} };
  } catch (error) {
    const errors = {};
    error.inner.forEach((err) => {
      errors[err.path] = err.message;
    });
    return { isValid: false, errors };
  }
};

export const validateSocialLinks = async (data) => {
  try {
    await socialLinksSchema.validate(data, { abortEarly: false });
    return { isValid: true, errors: {} };
  } catch (error) {
    const errors = {};
    error.inner.forEach((err) => {
      errors[err.path] = err.message;
    });
    return { isValid: false, errors };
  }
};

export const validateAddService = async (data) => {
  try {
    await addServiceSchema.validate(data, { abortEarly: false });
    return { isValid: true, errors: {} };
  } catch (error) {
    const errors = {};
    error.inner.forEach((err) => {
      errors[err.path] = err.message;
    });
    return { isValid: false, errors };
  }
};

export const validateVendorTicket = async (data) => {
  try {
    await vendorTicketSchema.validate(data, { abortEarly: false });
    return { isValid: true, errors: {} };
  } catch (error) {
    const errors = {};
    error.inner.forEach((err) => {
      errors[err.path] = err.message;
    });
    return { isValid: false, errors };
  }
};

export const validateBasicAccountInfo = async (data) => {
  try {
    await basicAccountInfoSchema.validate(data, { abortEarly: false });
    return { isValid: true, errors: {} };
  } catch (error) {
    const errors = {};
    error.inner.forEach((err) => {
      errors[err.path] = err.message;
    });
    return { isValid: false, errors };
  }
};
