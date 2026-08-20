/**
 * Vendor helper utilities (Mobile).
 * Pure JavaScript — no React Native imports so it remains node-testable.
 */

export const VENDOR_CATEGORY_KEYS = [
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

/**
 * Extract categories as a flat array of category keys from serviceCategories
 * object, array, or nullish data.
 * @param {Object|Array|null|undefined} serviceCategories - Categories data from API
 * @returns {string[]} - Flat array of category key strings
 */
export const extractCategoriesArray = (serviceCategories) => {
  if (!serviceCategories) return [];
  if (Array.isArray(serviceCategories)) {
    return serviceCategories.filter((k) => typeof k === "string");
  }

  if (typeof serviceCategories === "object") {
    const keys = Object.keys(serviceCategories);
    return keys.filter((key) => {
      const val = serviceCategories[key];
      return (
        val !== false &&
        val !== null &&
        val !== undefined &&
        (VENDOR_CATEGORY_KEYS.includes(key) || (Array.isArray(val) && val.length >= 0) || val === true)
      );
    });
  }

  return [];
};

/**
 * Convert an array of category keys into the backend strict object shape:
 * e.g. ["mediaProduction", "foodAndBeverages"] -> { mediaProduction: [], foodAndBeverages: [] }
 * @param {string[]} categoryKeys - Array of category keys
 * @returns {Object} - Object keyed by category names with array values
 */
export const buildServiceCategoriesPayload = (categoryKeys) => {
  if (!categoryKeys || !Array.isArray(categoryKeys)) return {};
  const payload = {};
  categoryKeys.forEach((key) => {
    if (VENDOR_CATEGORY_KEYS.includes(key)) {
      payload[key] = [];
    }
  });
  return payload;
};
