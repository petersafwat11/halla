"use client";

import { useTranslation } from "react-i18next";

/**
 * Hook for localized date formatting
 * Replaces hardcoded Arabic month arrays with i18n-aware formatting
 * @returns {object} Date formatting functions
 */
export const useLocalizedDate = () => {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language || "ar";

  /**
   * Format a date string to localized format
   * @param {string|Date} dateString - The date to format
   * @param {object} options - Intl.DateTimeFormat options
   * @returns {string} Formatted date string
   */
  const formatDate = (dateString, options = {}) => {
    if (!dateString) return "-";

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";

    const defaultOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
      ...options,
    };

    return new Intl.DateTimeFormat(currentLanguage, defaultOptions).format(date);
  };

  /**
   * Format date to short format (DD/MM/YYYY)
   * @param {string|Date} dateString
   * @returns {string}
   */
  const formatShortDate = (dateString) => {
    return formatDate(dateString, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  /**
   * Format date with time
   * @param {string|Date} dateString
   * @returns {string}
   */
  const formatDateTime = (dateString) => {
    return formatDate(dateString, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return {
    formatDate,
    formatShortDate,
    formatDateTime,
    currentLanguage,
  };
};

export default useLocalizedDate;
