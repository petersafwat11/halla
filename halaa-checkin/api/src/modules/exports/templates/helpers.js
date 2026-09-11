/**
 * @halaa-checkin/api
 * HTML escaping and internationalization helpers for PDF templates.
 */

import { EVENT_TIMEZONE } from '@halaa-checkin/contracts';

/**
 * HTML escape a string to prevent XSS/SSRF/HTML injection in PDF render context.
 *
 * @param {any} str
 * @returns {string} Safe HTML-escaped string
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format a Date object into a readable string in the event timezone (Asia/Riyadh).
 *
 * @param {Date | string} date
 * @param {string} [locale='ar'] - 'ar' | 'en'
 * @returns {string}
 */
export function formatDateTime(date, locale = 'ar') {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';

  const loc = locale === 'ar' ? 'ar-SA' : 'en-US';
  return new Intl.DateTimeFormat(loc, {
    timeZone: EVENT_TIMEZONE,
    year: 'numeric',
    month: locale === 'ar' ? 'long' : 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

/**
 * Format time only in the event timezone (Asia/Riyadh).
 *
 * @param {Date | string} date
 * @param {string} [locale='ar']
 * @returns {string}
 */
export function formatTime(date, locale = 'ar') {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';

  const loc = locale === 'ar' ? 'ar-SA' : 'en-US';
  return new Intl.DateTimeFormat(loc, {
    timeZone: EVENT_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}
