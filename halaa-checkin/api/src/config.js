/**
 * @halaa-checkin/api
 * Configuration module with strict validation and fail-fast checks.
 * Adheres to Technical Contract Sections 2, 3, and 8.
 */

import dotenv from 'dotenv';
import { LIMITS } from '@halaa-checkin/contracts';

// Load local environment variables if present
dotenv.config();

const ALLOWED_DB_PREFIXES = ['halaa_checkin', 'checkin_'];
const FORBIDDEN_DB_NAMES = ['halaa', 'halla', 'halaa_backend', 'halaa-backend', 'halaa_prod', 'halla_prod'];
const INSECURE_DEFAULT_SECRETS = ['secret', 'change-me', 'dev-secret', 'password', '123456'];

/**
 * Validate configuration values and enforce fail-fast production rules.
 *
 * @param {object} cfg
 * @throws {Error} If configuration fails validation
 */
export function validateConfig(cfg) {
  const isProd = cfg.env === 'production';

  // 1. Validate MONGODB_DB_NAME
  if (!cfg.mongodb.dbName) {
    throw new Error('MONGODB_DB_NAME is required');
  }

  const dbLower = cfg.mongodb.dbName.toLowerCase();
  const hasValidPrefix = ALLOWED_DB_PREFIXES.some((p) => dbLower.startsWith(p));
  const isForbidden = FORBIDDEN_DB_NAMES.includes(dbLower);

  if (!hasValidPrefix || isForbidden) {
    throw new Error(
      `Database name '${cfg.mongodb.dbName}' is not allowed. Mini-app database name must start with one of: ${ALLOWED_DB_PREFIXES.join(
        ', '
      )} and cannot reuse existing Halaa database names.`
    );
  }

  // 2. Validate APP_ORIGIN
  if (!cfg.appOrigin) {
    throw new Error('APP_ORIGIN is required');
  }

  if (isProd) {
    if (!cfg.appOrigin.startsWith('https://')) {
      throw new Error(`Production APP_ORIGIN must use HTTPS (got: ${cfg.appOrigin})`);
    }
  }

  // 3. Validate SESSION_SECRET
  if (isProd) {
    if (!cfg.session.secret || cfg.session.secret.length < 32) {
      throw new Error('Production SESSION_SECRET must be at least 32 characters long');
    }
    if (INSECURE_DEFAULT_SECRETS.includes(cfg.session.secret)) {
      throw new Error('Production SESSION_SECRET cannot use insecure default placeholder');
    }
  }

  return true;
}

/**
 * Build configuration object from environment variables or overrides.
 *
 * @param {object} [overrides]
 * @returns {object}
 */
export function loadConfig(overrides = {}) {
  const env = overrides.env || process.env.NODE_ENV || 'development';
  const isProd = env === 'production';

  const cfg = {
    env,
    isProd,
    port: parseInt(overrides.port || process.env.PORT || '8100', 10),
    apiPrefix: '/api/checkin/v1',
    appOrigin: (overrides.appOrigin || process.env.APP_ORIGIN || (isProd ? '' : 'http://localhost:3100')).replace(
      /\/$/,
      ''
    ),
    trustProxyHops: parseInt(overrides.trustProxyHops || process.env.TRUST_PROXY_HOPS || (isProd ? '1' : '0'), 10),
    mongodb: {
      uri: overrides.mongodbUri || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017',
      dbName: overrides.mongodbDbName || process.env.MONGODB_DB_NAME || (env === 'test' ? 'halaa_checkin_test' : 'halaa_checkin_dev'),
      tlsCertPath: overrides.mongodbTlsCertPath || process.env.MONGODB_TLS_CERT_PATH || '',
    },
    session: {
      secret: overrides.sessionSecret || process.env.SESSION_SECRET || (isProd ? '' : 'dev-session-secret-at-least-32-chars-long!'),
      cookieName: isProd ? '__Host-halaa-checkin-session' : 'halaa-checkin-session-dev',
      ttlMs: LIMITS.SESSION_EXPIRY_MS, // 12 hours
    },
    export: {
      dir: overrides.exportDir || process.env.EXPORT_DIR || './data/exports',
      ttlMs: LIMITS.EXPORT_EXPIRY_MS, // 24 hours
    },
  };

  return cfg;
}

export const config = loadConfig();
