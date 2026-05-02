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
    expiresIn: env.JWT_EXPIRES_IN,
    cookieExpiresIn: env.JWT_COOKIE_EXPIRES_IN,
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
  },

  frontend: {
    url: env.FRONTEND_URL,
  },

  backend: {
    url: env.BACKEND_URL,
  },

  upload: {
    path: env.UPLOAD_PATH,
    maxFileSize: env.MAX_FILE_SIZE,
  },
};

module.exports = config;
