/**
 * Role-Based Access Control (RBAC) Middleware
 * Handles authorization based on user roles and page-based access
 */

const AppError = require("../errors/AppError");
const {
  ROLES,
  ROLE_HIERARCHY,
  ADMIN_PAGES,
  ACCESS_LEVELS,
  PERMISSIONS,
  PERMISSION_TO_PAGE,
  getPageAccess,
  canAccessPage,
  isAdminRole,
} = require("../constants");
const User = require("../../../models/UserModel");
const Subscription = require("../../../models/SubscriptionModel");

/**
 * Restrict access to specific roles
 * @param  {...string} allowedRoles - Roles that can access the route
 * @returns {Function} Express middleware
 */
exports.restrictTo = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Please log in to access this resource", 401));
    }

    const userRole = req.user.role;

    if (allowedRoles.includes(userRole)) {
      return next();
    }

    const inheritedRoles = ROLE_HIERARCHY[userRole] || [];
    const hasAccess = allowedRoles.some((role) =>
      inheritedRoles.includes(role)
    );

    if (hasAccess) {
      return next();
    }

    return next(
      new AppError("You do not have permission to perform this action", 403)
    );
  };
};

/**
 * Require access to a specific admin page
 * @param {string} page - Page from ADMIN_PAGES
 * @param {string} action - 'view' | 'create' | 'update' | 'delete' | 'export' | 'manage'
 * @returns {Function} Express middleware
 */
exports.requirePageAccess = (page, action = "view") => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Please log in to access this resource", 401));
    }

    if (!canAccessPage(req.user, page, action)) {
      const actionMessages = {
        view: "view",
        create: "create",
        update: "update",
        delete: "delete",
        export: "export",
        edit: "modify",
        manage: "manage",
      };
      const actionText = actionMessages[action] || action;
      return next(
        new AppError(
          `You do not have permission to ${actionText} this resource`,
          403
        )
      );
    }

    req.pageAccess = getPageAccess(req.user, page);
    req.canEdit =
      req.pageAccess === ACCESS_LEVELS.FULL ||
      req.pageAccess === ACCESS_LEVELS.EDIT;
    req.canDelete = req.pageAccess === ACCESS_LEVELS.FULL;

    next();
  };
};

/**
 * Legacy: Require specific permissions (DEPRECATED)
 * Kept for backward compatibility - maps to new page-based system
 * @deprecated Use requirePageAccess instead
 */
exports.requirePermission = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Please log in to access this resource", 401));
    }

    const firstPermission = requiredPermissions[0];
    const page = PERMISSION_TO_PAGE[firstPermission];

    if (!page) {
      if ([ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(req.user.role)) {
        return next();
      }
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }

    let action = "view";
    switch (req.method) {
      case "GET":
        action = "view";
        break;
      case "POST":
        action = "create";
        break;
      case "PUT":
      case "PATCH":
        action = "update";
        break;
      case "DELETE":
        action = "delete";
        break;
    }

    if (!canAccessPage(req.user, page, action)) {
      return next(
        new AppError(
          `You do not have permission to ${action} this resource`,
          403
        )
      );
    }

    req.pageAccess = getPageAccess(req.user, page);
    req.canEdit =
      req.pageAccess === ACCESS_LEVELS.FULL ||
      req.pageAccess === ACCESS_LEVELS.EDIT;
    req.canDelete = req.pageAccess === ACCESS_LEVELS.FULL;

    next();
  };
};

/**
 * Check resource ownership with custom logic
 * @param {Function} checkOwnership - Async function that returns true if user has access
 * @returns {Function} Express middleware
 */
exports.checkAccess = (checkOwnership) => {
  return async (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Please log in to access this resource", 401));
    }

    if (isAdminRole(req.user.role)) {
      req.isAdmin = true;
      return next();
    }

    try {
      const hasAccess = await checkOwnership(req);

      if (!hasAccess) {
        return next(
          new AppError(
            "You do not have permission to access this resource",
            403
          )
        );
      }

      next();
    } catch (error) {
      return next(new AppError("Error checking resource access", 500));
    }
  };
};

/**
 * Restrict super admin routes
 * Only super_admin can access
 */
exports.superAdminOnly = (req, res, next) => {
  if (!req.user) {
    return next(new AppError("Please log in to access this resource", 401));
  }

  if (req.user.role !== ROLES.SUPER_ADMIN) {
    return next(
      new AppError("This action requires super admin privileges", 403)
    );
  }

  next();
};

/**
 * Check if user has access to a specific feature
 * @param {string} featureName - Feature to check
 * @returns {Function} Express middleware
 */
exports.checkFeature = (featureName) => {
  return async (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Please log in to access this resource", 401));
    }

    try {
      if (req.user.role === ROLES.SUPER_ADMIN) {
        req.hasFeature = true;
        return next();
      }

      const whitelabelId = req.user.whitelabelId || null;

      // Platform-level users have all features
      let hasAccess = true;
      if (whitelabelId) {
        const whitelabel = await User.findById(whitelabelId);
        const features = { ...(whitelabel?.features || {}) };
        const sub = await Subscription.findOne({ userId: whitelabel?.adminId, status: "active" }).populate("planId");
        if (sub?.planId?.features) Object.assign(features, sub.planId.features);
        hasAccess = features[featureName] === true;
      }

      if (!hasAccess) {
        return next(
          new AppError(
            `This feature is not available in your current plan. Please upgrade to access ${featureName}.`,
            403
          )
        );
      }

      req.hasFeature = true;
      req.featureName = featureName;

      next();
    } catch (error) {
      return next(
        new AppError(`Error checking feature access: ${error.message}`, 500)
      );
    }
  };
};

// Export constants for convenience
exports.ROLES = ROLES;
exports.PERMISSIONS = PERMISSIONS;
exports.ADMIN_PAGES = ADMIN_PAGES;
exports.ACCESS_LEVELS = ACCESS_LEVELS;
