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
    refreshGracePeriodMs: env.REFRESH_GRACE_PERIOD_MS || 30000,
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

  frontend: {
    url: env.FRONTEND_URL,
  },

  backend: {
    url: env.BACKEND_URL,
  },

  upload: {
    path: env.UPLOAD_PATH,
    maxSize: env.MAX_FILE_SIZE,
  },

  export: {
    maxRows: env.EXPORT_MAX_ROWS || 10000,
  },

  moyasar: {
    apiKey: env.MOYASAR_API_KEY,
    publishableKey: env.MOYASAR_PUBLISHABLE_KEY,
    baseUrl: env.MOYASAR_BASE_URL,
    webhookSecret: env.MOYASAR_WEBHOOK_SECRET,
    ipWhitelist: env.MOYASAR_WEBHOOK_IP_WHITELIST
      ? env.MOYASAR_WEBHOOK_IP_WHITELIST.split(',').map((ip) => ip.trim()).filter(Boolean)
      : [],
  },
};

module.exports = config;
