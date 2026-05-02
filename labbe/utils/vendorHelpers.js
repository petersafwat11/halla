"use client";

import { useMemo } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

/**
 * Constructs a full image URL from a potentially partial path
 * Handles various edge cases including Windows paths, relative paths, etc.
 * @param {string} imagePath - The image path from the API
 * @returns {string|null} - Full URL or null if no path
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith("http")) return imagePath;

  // Handle absolute Windows paths stored in old data
  if (imagePath.includes("\\") || imagePath.match(/^[A-Z]:/i)) {
    const uploadsMatch = imagePath.match(/uploads[\\/](.+)$/);
    if (uploadsMatch) {
      return `${BACKEND_URL}/api/uploads/${uploadsMatch[1].replace(/\\/g, "/")}`;
    }
    const publicMatch = imagePath.match(/public[\\/]uploads[\\/](.+)$/);
    if (publicMatch) {
      return `${BACKEND_URL}/api/uploads/${publicMatch[1].replace(/\\/g, "/")}`;
    }
  }

  const cleanPath = imagePath.startsWith("/") ? imagePath.slice(1) : imagePath;
  return `${BACKEND_URL}/api/${cleanPath}`;
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
