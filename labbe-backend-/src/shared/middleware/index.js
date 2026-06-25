/**
 * Middleware Index
 * Central export for all middleware modules
 */

const auth = require("./auth");
const rbac = require("./rbac");
const subscription = require("./subscription");
const validation = require("./validation");

module.exports = {
  // Authentication
  protect: auth.protect,
  optionalAuth: auth.optionalAuth,

  // RBAC
  restrictTo: rbac.restrictTo,
  requirePageAccess: rbac.requirePageAccess,
  requirePermission: rbac.requirePermission,
  superAdminOnly: rbac.superAdminOnly,
  checkAccess: rbac.checkAccess,

  // Subscription
  requireSubscription: subscription.requireSubscription,
  checkEventLimit: subscription.checkEventLimit,
  checkGuestLimit: subscription.checkGuestLimit,
  checkMessageLimit: subscription.checkMessageLimit,

  // Validation
  validateObjectId: validation.validateObjectId,
  validateArray: validation.validateArray,
  validateObjectIdArray: validation.validateObjectIdArray,
  validateEmail: validation.validateEmail,
  validatePhone: validation.validatePhone,
  validatePassword: validation.validatePassword,
  validateStringLength: validation.validateStringLength,
  validatePagination: validation.validatePagination,
  validateVendorSignup: validation.validateVendorSignup,
  validateEventCreation: validation.validateEventCreation,

  // Re-export full modules for advanced usage
  auth,
  rbac,
  subscription,
  validation,
};
