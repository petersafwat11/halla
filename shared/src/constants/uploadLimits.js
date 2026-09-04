/**
 * Upload Limits Constants
 * Canonical upload constraints aligned across backend, reverse proxy, web, and mobile.
 */

export const UPLOAD_LIMITS = Object.freeze({
  // Server/reverse-proxy maximum for invitation image uploads (10 MB)
  SERVER_INVITATION_MAX_BYTES: 10 * 1024 * 1024,

  // Client compression target: safely below server limit (9 MB)
  CLIENT_INVITATION_TARGET_BYTES: 9 * 1024 * 1024,

  // Max dimension for normalized invitation artwork (2048 px)
  INVITATION_MAX_DIMENSION: 2048,
});
