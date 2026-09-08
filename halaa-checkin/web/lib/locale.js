import arDict from '../locales/ar.json' with { type: 'json' };
import enDict from '../locales/en.json' with { type: 'json' };

const dictionaries = {
  ar: arDict,
  en: enDict,
};

/**
 * Get dictionary for a language
 * @param {string} lang
 * @returns {typeof arDict}
 */
export function getDictionary(lang) {
  return dictionaries[lang === 'en' ? 'en' : 'ar'] || dictionaries.ar;
}

/**
 * Get reading direction for a language
 * @param {string} lang
 * @returns {'rtl' | 'ltr'}
 */
export function getDir(lang) {
  return lang === 'en' ? 'ltr' : 'rtl';
}

/**
 * Resolve a dot-notated string key from dictionary with variable replacement
 * @param {object} dict
 * @param {string} path e.g. "common.appName"
 * @param {Record<string, any>} [vars]
 * @returns {string}
 */
export function t(dict, path, vars = {}) {
  if (!dict || !path) return path || '';
  const parts = path.split('.');
  let current = dict;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return path; // Fallback to key
    }
  }

  if (typeof current !== 'string') return path;

  // Replace {varName} placeholders
  let result = current;
  for (const [key, val] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val));
  }
  return result;
}

/**
 * Format a date in Asia/Riyadh timezone
 * @param {Date|string|number} date
 * @param {string} [lang]
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string}
 */
export function formatRiyadhDate(date, lang = 'ar', options = {}) {
  if (!date) return '';
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  const defaultOptions = {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  };

  const locale = lang === 'en' ? 'en-US' : 'ar-SA';
  return new Intl.DateTimeFormat(locale, defaultOptions).format(d);
}

/**
 * Extract YYYY-MM-DD and HH:mm parts in Asia/Riyadh timezone.
 * @param {string | Date} [isoString]
 * @returns {{ dateStr: string, timeStr: string }}
 */
export function toRiyadhDateInput(isoString) {
  const d = isoString ? new Date(isoString) : new Date();
  if (isNaN(d.getTime())) {
    return { dateStr: '', timeStr: '18:00' };
  }

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);

  const get = (type) => parts.find((p) => p.type === type)?.value || '';
  return {
    dateStr: `${get('year')}-${get('month')}-${get('day')}`,
    timeStr: `${get('hour')}:${get('minute')}`,
  };
}

/**
 * Combine Riyadh dateStr (YYYY-MM-DD) and timeStr (HH:mm) into an explicit +03:00 ISO timestamp.
 * @param {string} dateStr
 * @param {string} [timeStr]
 * @returns {string}
 */
export function toRiyadhIsoString(dateStr, timeStr = '18:00') {
  if (!dateStr) return '';
  const normalizedTime = timeStr && timeStr.length === 5 ? `${timeStr}:00` : (timeStr || '18:00:00');
  return `${dateStr}T${normalizedTime}+03:00`;
}
