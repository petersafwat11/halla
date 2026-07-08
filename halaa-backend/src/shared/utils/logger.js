/**
 * Minimal Logger Utility
 * Console-based logger for the new backend
 */

const logger = {
  info: (msg, meta) => console.log(`[INFO] ${msg}`, meta || ''),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta || ''),
  error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta || ''),
  debug: (msg, meta) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${msg}`, meta || '');
    }
  },
};

module.exports = logger;
