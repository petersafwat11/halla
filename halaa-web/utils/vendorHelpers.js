"use client";

import { useMemo } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

/**
 * Recover the S3 key from a backend-signed URL.
 *
 * The backend stores images as keys and serializes them as pre-signed
 * S3 URLs of the shape `https://bucket.s3.region.amazonaws.com/<key>?X-Amz-...`.
 * The DELETE endpoint needs the key, so we extract it here.
 */
export const keyFromSignedUrl = (url) => {
  if (!url || typeof url !== "string") return null;
  try {
    const u = new URL(url);
    const path = u.pathname.startsWith("/") ? u.pathname.slice(1) : u.pathname;
    return path ? decodeURIComponent(path) : null;
  } catch {
    return null;
  }
};

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
 * Resolve an image value from the API to a renderable URL.
 *
 * Fully-qualified http(s) URLs pass through. Paths starting with /uploads/
 * are prefixed with BACKEND_URL. Local relative static paths (starting with /)
 * pass through directly.
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath || typeof imagePath !== "string") return null;
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }
  if (imagePath.startsWith("/uploads/")) {
    return `${BACKEND_URL}${imagePath}`;
  }
  if (imagePath.startsWith("uploads/")) {
    return `${BACKEND_URL}/${imagePath}`;
  }
  if (imagePath.startsWith("/")) {
    return imagePath;
  }
  return null;
};

/**
 * Extract categories as flat array from serviceCategories object or array
 * @param {Object|Array} serviceCategories - Categories data from API
 * @returns {Array} - Flat array of category names
 */
export const extractCategoriesArray = (serviceCategories) => {
  if (!serviceCategories) return [];
  if (Array.isArray(serviceCategories)) return serviceCategories.filter((k) => typeof k === "string");

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

/**
 * Transform data keys from dotted notation to simple format
 * e.g., "profile.vendorData.X" -> "X"
 * @param {Object} inputData - Data with potentially dotted keys
 * @returns {Object} - Transformed data
 */
export const transformDottedKeys = (inputData) => {
  const result = {};
  Object.keys(inputData).forEach((key) => {
    if (key.startsWith("profile.vendorData.")) {
      const simpleKey = key.replace("profile.vendorData.", "");
      result[simpleKey] = inputData[key];
    } else {
      result[key] = inputData[key];
    }
  });
  return result;
};

/**
 * Hook to get image URL with memoization
 * @param {string} imagePath - The image path
 * @returns {string|null} - Memoized full URL
 */
export const useImageUrl = (imagePath) => {
  return useMemo(() => getImageUrl(imagePath), [imagePath]);
};

/**
 * Hook to transform array of image paths to full URLs
 * @param {string[]} imagePaths - Array of image paths
 * @returns {string[]} - Array of full URLs
 */
export const useImageUrls = (imagePaths) => {
  return useMemo(() => {
    if (!Array.isArray(imagePaths)) return [];
    return imagePaths.map(getImageUrl).filter(Boolean);
  }, [imagePaths]);
};
