/**
 * @halaa-checkin/api
 * Cryptographic utilities using Node built-in crypto module.
 * Implements scrypt hashing, SHA-256 digests, and timing-safe comparisons.
 * Adheres to Technical Contract Section 2.
 */

import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(crypto.scrypt);

const SCRYPT_PARAMS = Object.freeze({
  cost: 16384, // N
  blockSize: 8, // r
  parallelization: 1, // p
  keyLength: 64, // 512 bits
  saltLength: 16, // 128 bits
});

/**
 * Hash a password using Node's built-in scrypt.
 * Format: `scrypt$N=16384,r=8,p=1$<saltHex>$<derivedKeyHex>`
 *
 * @param {string} password Plaintext password
 * @returns {Promise<string>}
 */
export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length === 0) {
    throw new Error('Password must be a non-empty string');
  }

  const salt = crypto.randomBytes(SCRYPT_PARAMS.saltLength);
  const derivedKey = await scryptAsync(password, salt, SCRYPT_PARAMS.keyLength, {
    cost: SCRYPT_PARAMS.cost,
    blockSize: SCRYPT_PARAMS.blockSize,
    parallelization: SCRYPT_PARAMS.parallelization,
  });

  const saltHex = salt.toString('hex');
  const keyHex = derivedKey.toString('hex');

  return `scrypt$N=${SCRYPT_PARAMS.cost},r=${SCRYPT_PARAMS.blockSize},p=${SCRYPT_PARAMS.parallelization}$${saltHex}$${keyHex}`;
}

/**
 * Verify a plaintext password against an scrypt formatted hash.
 * Timing-safe comparison.
 *
 * @param {string} password Plaintext password to test
 * @param {string} storedHash Full scrypt formatted hash string
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, storedHash) {
  if (typeof password !== 'string' || typeof storedHash !== 'string') {
    return false;
  }

  const parts = storedHash.split('$');
  if (parts.length !== 4 || parts[0] !== 'scrypt') {
    return false;
  }

  const paramString = parts[1];
  const saltHex = parts[2];
  const keyHex = parts[3];

  const params = {};
  for (const item of paramString.split(',')) {
    const [k, v] = item.split('=');
    params[k] = parseInt(v, 10);
  }

  const cost = params.N || SCRYPT_PARAMS.cost;
  const blockSize = params.r || SCRYPT_PARAMS.blockSize;
  const parallelization = params.p || SCRYPT_PARAMS.parallelization;
  const salt = Buffer.from(saltHex, 'hex');
  const expectedKey = Buffer.from(keyHex, 'hex');

  try {
    const derivedKey = await scryptAsync(password, salt, expectedKey.length, {
      cost,
      blockSize,
      parallelization,
    });

    if (derivedKey.length !== expectedKey.length) {
      return false;
    }

    return crypto.timingSafeEqual(derivedKey, expectedKey);
  } catch {
    return false;
  }
}

/**
 * Generate a cryptographically random session token (32 bytes).
 *
 * @returns {string} base64url encoded token
 */
export function generateSessionToken() {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Generate a cryptographically random CSRF token (16 bytes).
 *
 * @returns {string} hex encoded token
 */
export function generateCsrfToken() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Compute SHA-256 digest of a string (e.g. for session token digest).
 *
 * @param {string} data
 * @returns {string} hex string
 */
export function sha256(data) {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Perform a timing-safe string comparison.
 *
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');

  if (bufA.length !== bufB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Generate a secure Crockford-base32 short code (10 characters).
 * Zero-bias uniform selection since 256 is evenly divisible by 32.
 *
 * @returns {string} 10-character uppercase string
 */
export function generateShortCode() {
  const bytes = crypto.randomBytes(10);
  let code = '';
  for (let i = 0; i < 10; i++) {
    code += CROCKFORD_ALPHABET[bytes[i] % 32];
  }
  return code;
}

/**
 * Generate a secure HGC1 QR token.
 * Format: "HGC1." + base64url(randomBytes(32))
 *
 * @returns {string} 48-character QR token
 */
export function generateQrToken() {
  return `HGC1.${crypto.randomBytes(32).toString('base64url')}`;
}
