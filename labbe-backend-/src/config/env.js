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

  // JWT Authentication
  JWT_SECRET: Joi.string().min(32).required().description('JWT signing secret'),
  JWT_EXPIRES_IN: Joi.string().default('90d'),
  JWT_COOKIE_EXPIRES_IN: Joi.number().default(90),

  // Email (Nodemailer)
  EMAIL_HOST: Joi.string().allow(''),
  EMAIL_PORT: Joi.number().allow(''),
  EMAIL_USERNAME: Joi.string().allow(''),
  EMAIL_PASSWORD: Joi.string().allow(''),
  EMAIL_FROM: Joi.string().allow(''),



  // WhatsApp / Taqnyat webhook security
  // PIPELINE-F02 / FLOW-18-F01: HMAC verification on POST /messaging/webhook
  // must fail closed. WHATSAPP_APP_SECRET is therefore required at startup —
  // booting without it would silently accept unauthenticated payloads from
  // anyone who can reach the public webhook URL.
  WHATSAPP_APP_SECRET: Joi.string()
    .min(1)
    .required()
    .description('Meta/WhatsApp app secret used to verify x-hub-signature-256 on webhook calls'),

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
