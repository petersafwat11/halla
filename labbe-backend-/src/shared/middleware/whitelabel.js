/**
 * WhiteLabel (Multi-Tenant) Middleware
 * Handles data isolation and filtering for whitelabel instances
 */

const catchAsync = require("../utils/catchAsync");
const AppError = require("../errors/AppError");
const { ROLES, WHITELABEL_ROLES } = require("../constants/roles");

/**
 * Filter queries by whitelabel
 * Automatically restricts data access based on user's whitelabel association
 */
exports.filterByWhitelabel = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError("Authentication required", 401));
  }

  const userRole = req.user.role;
  const userWhitelabelId = req.user.whitelabelId;

  // Super admin sees platform-level data only (whitelabelId: null),
  // same as regular admin/moderator. Whitelabel tenant data is owned
  // exclusively by their respective whitelabel admins.
  // Whitelabel management (the /admin/whitelabels routes) intentionally
  // does NOT use filterByWhitelabel, so super admin retains full control there.
  if (userRole === ROLES.SUPER_ADMIN) {
    req.whitelabelFilter = { whitelabelId: null };
    return next();
  }

  // WhiteLabel roles can only see their own whitelabel's data
  if (WHITELABEL_ROLES.includes(userRole)) {
    if (!userWhitelabelId) {
      return next(
        new AppError(
          "WhiteLabel configuration error. Please contact support",
          500
        )
      );
    }

    req.whitelabelFilter = { whitelabelId: userWhitelabelId };
    req.currentWhitelabelId = userWhitelabelId;
    return next();
  }

  // Regular admins see main platform data only (null whitelabelId)
  if ([ROLES.ADMIN, ROLES.MODERATOR].includes(userRole)) {
    req.whitelabelFilter = { whitelabelId: null };
    return next();
  }

  // Hosts and vendors - check if they belong to a whitelabel
  if (userWhitelabelId) {
    req.whitelabelFilter = { whitelabelId: userWhitelabelId };
    req.currentWhitelabelId = userWhitelabelId;
  } else {
    req.whitelabelFilter = { whitelabelId: null };
  }

  next();
});

/**
 * Inject whitelabel ID on create operations
 * Automatically adds whitelabelId to new documents
 */
exports.injectWhitelabel = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next();
  }

  const userWhitelabelId = req.user.whitelabelId;

  if (userWhitelabelId) {
    req.body.whitelabelId = userWhitelabelId;
  } else if (req.user.role !== ROLES.SUPER_ADMIN) {
    req.body.whitelabelId = null;
  }

  next();
});

/**
 * Restrict whitelabel-specific operations
 * Only whitelabel admins and super admin can perform these
 */
exports.whitelabelAdminOnly = (req, res, next) => {
  if (!req.user) {
    return next(new AppError("Authentication required", 401));
  }

  const allowedRoles = [ROLES.SUPER_ADMIN, ROLES.WHITELABEL_ADMIN];

  if (!allowedRoles.includes(req.user.role)) {
    return next(
      new AppError("This action requires whitelabel admin privileges", 403)
    );
  }

  next();
};

/**
 * Alias for filterByWhitelabel - for backward compatibility
 */
exports.whitelabelIsolation = exports.filterByWhitelabel;
