import { parseCivilDate } from "./locale.js";

/**
 * Formats a date value using locale-aware month/day names from the "common"
 * i18next namespace. Output: "{month} | {weekday} {day} | {year}"
 *
 * @param {Date|string|number} value - Date value to format
 * @param {Function} t - i18next translate function (common namespace)
 * @returns {string} Formatted date string, e.g. "مايو | السبت 25 | 2026"
 */
export function formatTemplateDate(value, t) {
  if (!value) return "";
  const date = parseCivilDate(value);
  if (!date || isNaN(date.getTime())) return "";

  if (typeof t === "function") {
    const month = t(`date.months.${date.getMonth()}`);
    const weekday = t(`date.days.${date.getDay()}`);
    return `${month} | ${weekday} ${date.getDate()} | ${date.getFullYear()}`;
  }

  // Fallback when t is unavailable (should not occur in production)
  const month = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
    month: "long",
    calendar: "gregory",
  }).format(date);
  const weekday = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
    weekday: "long",
    calendar: "gregory",
  }).format(date);
  return `${month} | ${weekday} ${date.getDate()} | ${date.getFullYear()}`;
}
