/**
 * Application Configuration
 * Centralized configuration object - NO direct process.env access elsewhere
 * @module config
 */

const env = require('./env');

/**
 * @typedef {Object} Config
 * @property {string} env - Node environment
 * @property {number} port - Server port
 * @property {Object} db - Database configuration
 * @property {Object} jwt - JWT configuration
 * @property {Object} email - Email configuration
 * @property {Object} sms - SMS configuration
 * @property {Object} redis - Redis configuration
 * @property {Object} frontend - Frontend configuration
 * @property {Object} upload - File upload configuration
 */

const config = {
  env: env.NODE_ENV,
  port: env.PORT,
  isDev: env.NODE_ENV === 'development',
  isProd: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',

  db: {
    url: env.DATABASE,
    password: env.DATABASE_PASSWORD,
    certPath: env.DATABASE_CERT_PATH,
    options: {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    },
  },

  jwt: {
    secret: env.JWT_SECRET,
    accessExpiresIn: env.JWT_EXPIRES_IN,            // jsonwebtoken format, e.g. '15m'
    accessCookieMaxAgeMs: env.ACCESS_TOKEN_COOKIE_MAX_AGE_MS,
    refreshExpiresDays: env.REFRESH_TOKEN_EXPIRES_DAYS,
    refreshCookiePath: '/api/v2/auth/refresh',
  },

  email: {
    host: env.EMAIL_HOST,
    port: env.EMAIL_PORT,
    user: env.EMAIL_USERNAME,
    pass: env.EMAIL_PASSWORD,
    from: env.EMAIL_FROM || 'noreply@halaa.sa',
  },



  redis: {
    url: env.REDIS_URL,
    enabled: env.REDIS_ENABLED === 'true',
  },

  taqnyat: {
    apiKey: process.env.TAQNYAT_API_KEY,
    baseUrl: process.env.TAQNYAT_BASE_URL || 'https://api.taqnyat.sa',
    senderName: process.env.TAQNYAT_SENDER_NAME || 'HalaaApp',
    waBaseUrl: process.env.TAQNYAT_WA_BASE_URL || 'https://api.taqnyat.sa/wa/v2',
    webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
    // No hardcoded default — the 24h auto-reminder cron looks up templates
    // via (category, type) on TaqnyatTemplate. Manual nudge callers may
    // still pass an explicit template name via the env var.
    reminderTemplateName: process.env.TAQNYAT_REMINDER_TEMPLATE_NAME || null,
  },

  frontend: {
    url: env.FRONTEND_URL,
    // Canonical public URL for WhatsApp buttons / SMS / web routes / mobile
    // universal links. Reconciles the historical `halaa.sa` backend fallback
    // to the real production host `halaa.com.sa`. [#26]
    canonicalUrl: env.FRONTEND_URL || 'https://halaa.com.sa',
  },

  backend: {
    url: env.BACKEND_URL,
  },

  upload: {
    path: env.UPLOAD_PATH,
    maxFileSize: env.MAX_FILE_SIZE,
  },

  events: {
    // Phase 4b W0-RBAC (D4b-3): backend lower bound on the schedule
    // picker. Reject schedules whose absolute UTC instant is less than
    // `now + scheduleMinLeadHours` away, with code SCHEDULE_TOO_SOON.
    scheduleMinLeadHours: env.SCHEDULE_MIN_LEAD_HOURS,
    // Trial users get a shorter minimum lead time (default 15 min)
    // so they can quickly test the scheduling flow.
    trialScheduleMinLeadMinutes: env.TRIAL_SCHEDULE_MIN_LEAD_MINUTES,
  },

  // FLOW-28-F02: maximum rows per export
  EXPORT_MAX_ROWS: env.EXPORT_MAX_ROWS,
};

module.exports = config;
