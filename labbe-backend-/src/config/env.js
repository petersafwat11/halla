/**
 * Environment Configuration
 * Validates and exports environment variables
 * @module config/env
 */

const dotenv = require('dotenv');
const path = require('path');
const Joi = require('joi');

// Load environment variables from config.env
dotenv.config({ path: path.join(__dirname, '../../config.env') });

/**
 * Environment validation schema
 * Ensures all required environment variables are present and valid
 */
const envSchema = Joi.object({
  // Server
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(8000),

  // Database
  DATABASE: Joi.string().required().description('MongoDB connection string'),
  DATABASE_PASSWORD: Joi.string().allow('').default(''),
  DATABASE_CERT_PATH: Joi.string().allow('').default('').description('Path to X.509 certificate .pem file for MongoDB Atlas'),

  // JWT Authentication — short-lived access token + rotating refresh token (Phase 1a)
  // Access token defaults: 15 minutes (FLOW-01-F01).
  // Refresh tokens are stored server-side in `refreshtokens` collection with a TTL index;
  // their lifetime is REFRESH_TOKEN_EXPIRES_DAYS days.
  JWT_SECRET: Joi.string().min(32).required().description('JWT signing secret'),
  JWT_EXPIRES_IN: Joi.string().default('15m').description('Access token TTL (jsonwebtoken format)'),
  ACCESS_TOKEN_COOKIE_MAX_AGE_MS: Joi.number().default(15 * 60 * 1000).description('access_token cookie maxAge in ms'),
  REFRESH_TOKEN_EXPIRES_DAYS: Joi.number().default(30).description('Refresh token lifetime in days'),

  // Email (Nodemailer)
  EMAIL_HOST: Joi.string().allow(''),
  EMAIL_PORT: Joi.number().allow(''),
  EMAIL_USERNAME: Joi.string().allow(''),
  EMAIL_PASSWORD: Joi.string().allow(''),
  EMAIL_FROM: Joi.string().allow(''),



  // WhatsApp / Taqnyat webhook security
  // TEMPORARILY OPTIONAL (2026-06-01): HMAC verification on
  // POST /messaging/webhook is disabled while we don't have the real Meta
  // App Secret. See messaging.webhook.controller.js `verifyWebhookSignature`.
  // When the secret is restored, switch this back to `.min(1).required()`.
  WHATSAPP_APP_SECRET: Joi.string()
    .allow('')
    .optional()
    .description('Meta/WhatsApp app secret used to verify x-hub-signature-256 on webhook calls (verification currently disabled)'),

  // Redis (Optional)
  REDIS_URL: Joi.string().allow(''),
  REDIS_ENABLED: Joi.string().valid('true', 'false').default('false'),

  // Frontend URL
  FRONTEND_URL: Joi.string().default('http://localhost:3000'),

  // Backend public URL (for generating full URLs to uploaded files)
  BACKEND_URL: Joi.string().default('http://localhost:8000'),

  // File Upload
  UPLOAD_PATH: Joi.string().default('./public/uploads'),
  MAX_FILE_SIZE: Joi.number().default(5 * 1024 * 1024), // 5MB

  // Phase 4b W0-RBAC (D4b-3): minimum lead time for messaging.scheduleBulkSend.
  // PAID plans: 24h. Backend rejects schedules below this with SCHEDULE_TOO_SOON
  // so callers can't bypass the client-side picker minimum.
  SCHEDULE_MIN_LEAD_HOURS: Joi.number().min(0).default(24),

  // Trial plan: minimum lead time in minutes for scheduling (overrides
  // SCHEDULE_MIN_LEAD_HOURS for trial users). Default 15 min so trial
  // users can quickly test the scheduling flow.
  TRIAL_SCHEDULE_MIN_LEAD_MINUTES: Joi.number().min(0).default(15),

  // FLOW-28-F02: maximum number of rows allowed in a single export.
  // Default 10,000. Exports exceeding this limit return 422 with instructions
  // to narrow filters.
  EXPORT_MAX_ROWS: Joi.number().min(100).default(10_000),

  // ─── Moyasar (payments) ────────────────────────────────────────
  MOYASAR_API_KEY: Joi.string().allow('').default(''),
  MOYASAR_PUBLISHABLE_KEY: Joi.string().allow('').default(''),
  MOYASAR_BASE_URL: Joi.string().uri().default('https://api.moyasar.com/v1'),
  MOYASAR_WEBHOOK_SECRET: Joi.string().allow('').default(''),
  MOYASAR_WEBHOOK_IP_WHITELIST: Joi.string().allow('').default(''),

}).unknown(true); // Allow unknown keys for flexibility

const { error, value: envVars } = envSchema.validate(process.env, {
  abortEarly: false,
  stripUnknown: false,
});

if (error) {
  const errorMessages = error.details.map((d) => `  - ${d.message}`).join('\n');
  console.error('❌ Environment validation failed:\n' + errorMessages);
  process.exit(1);
}

module.exports = envVars;
