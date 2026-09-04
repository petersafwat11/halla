"use client";

import { useTranslation } from "react-i18next";
import {
  formatDate as sharedFormatDate,
  formatDateTime as sharedFormatDateTime,
} from "@halaa/shared/utils/locale";

/**
 * Hook for localized date formatting
 * Delegates to canonical shared formatters enforcing Gregorian calendar (F-04) and Latin digits (F-15)
 * @returns {object} Date formatting functions
 */
export const useLocalizedDate = () => {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language || "ar";

  /**
   * Format a date string or Date to localized format
   * @param {string|Date} dateString - The date to format
   * @param {object} options - Intl options
   * @returns {string} Formatted date string
   */
  const formatDate = (dateString, options = {}) => {
    if (!dateString) return "-";
    const res = sharedFormatDate(dateString, currentLanguage, options);
    return res || "-";
  };

  /**
   * Format date to short format (DD/MM/YYYY)
   * @param {string|Date} dateString
   * @param {object} options
   * @returns {string}
   */
  const formatShortDate = (dateString, options = {}) => {
    if (!dateString) return "-";
    const res = sharedFormatDate(dateString, currentLanguage, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      ...options,
    });
    return res || "-";
  };

  /**
   * Format date with time
   * @param {string|Date} dateString
   * @param {object} options
   * @returns {string}
   */
  const formatDateTime = (dateString, options = {}) => {
    if (!dateString) return "-";
    const res = sharedFormatDateTime(dateString, currentLanguage, options);
    return res || "-";
  };

  return {
    formatDate,
    formatShortDate,
    formatDateTime,
    currentLanguage,
  };
};

export default useLocalizedDate;
