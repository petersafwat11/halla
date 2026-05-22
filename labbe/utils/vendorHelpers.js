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

/**
 * Resolve an image value from the API to a renderable URL.
 *
 * The backend now signs all S3 image fields at serialization, so the value
 * the API hands us is already a complete `http(s)://...` URL. The only
 * other case we handle is the local-disk dev fallback (paths under
 * `/uploads/...`), which we prefix with `BACKEND_URL`.
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
  return null;
};

/**
 * Extract categories as flat array from serviceCategories object
 * @param {Object|Array} serviceCategories - Categories data from API
 * @returns {Array} - Flat array of category names
 */
export const extractCategoriesArray = (serviceCategories) => {
  if (!serviceCategories) return [];
  if (Array.isArray(serviceCategories)) return serviceCategories;

  const allCategories = [];
  Object.keys(serviceCategories).forEach((key) => {
    if (Array.isArray(serviceCategories[key])) {
      allCategories.push(...serviceCategories[key]);
    }
  });
  return allCategories;
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
