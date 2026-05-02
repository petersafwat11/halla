/**
 * Authentication Middleware
 * Handles JWT verification and user attachment to request
 */

const {
  ROLES,
  ROLE_HIERARCHY,
  isAdminRole,
} = require("../constants/roles");
const {
  ADMIN_PAGES,
  ACCESS_LEVELS,
  PERMISSIONS,
  PERMISSION_TO_PAGE,
  getPageAccess,
  canAccessPage,
} = require("../constants/permissions");
const { USER_STATUS } = require("../constants/status");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../errors/AppError");

// Import models - will use unified User model
// For backward compatibility, we'll check multiple models during migration
const User = require("../../../models/UserModel");

/**
 * Protect routes - Verify JWT and attach user to request
 */
exports.protect = catchAsync(async (req, res, next) => {
  // 1. Get token from header or cookies
  let token;

  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies?.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError("Please log in to access this resource", 401));
  }

  // 2. Verify token
  let decoded;
  try {
    decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === "JsonWebTokenError") {
      return next(new AppError("Invalid token. Please log in again", 401));
    }
    if (err.name === "TokenExpiredError") {
      return next(
        new AppError("Your session has expired. Please log in again", 401)
      );
    }
    return next(new AppError("Authentication failed", 401));
  }

  // 3. Find user in unified User model
  const user = await User.findById(decoded.id)
    .select("+password")
    .populate("subscription")
    .populate("whitelabelId", "identity.names domain status");

  if (!user) {
    return next(
      new AppError("The user associated with this token no longer exists", 401)
    );
  }

  // 4. Check if password changed after token was issued
  if (user.changedPasswordAfter && user.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("Password recently changed. Please log in again", 401)
    );
  }

  // 5. Check user status
  if (user.status === USER_STATUS.SUSPENDED) {
    return next(
      new AppError(
        "Your account has been suspended. Please contact support",
        403
      )
    );
  }

  if (user.status === USER_STATUS.REJECTED) {
    return next(new AppError("Your account application was rejected", 403));
  }

  if (user.status === USER_STATUS.INACTIVE) {
    return next(new AppError("Your account is inactive", 403));
  }

  if (user.status === USER_STATUS.PENDING) {
    return next(
      new AppError("Your account is pending approval", 403)
    );
  }

  // 6. Attach user to request
  req.user = user;

  // 7. Set convenience flags
  req.isAuthenticated = true;
  req.userId = user._id;
  req.userRole = user.role;
  req.whitelabelId = user.whitelabelId?._id || user.whitelabelId || null;

  // 8. Extract and attach tenant context for white-label support
  const tenant = await extractTenantContext(req, user);
  req.tenant = tenant;
  req.isWhitelabel = tenant.isWhitelabel;

  next();
});

/**
 * Optional authentication - doesn't fail if no token
 * Useful for public routes that behave differently for logged-in users
 */
exports.optionalAuth = catchAsync(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies?.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    req.isAuthenticated = false;
    return next();
  }

  try {
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).populate("subscription");

    if (user && user.status === USER_STATUS.ACTIVE) {
      req.user = user;
      req.isAuthenticated = true;
      req.userId = user._id;
      req.userRole = user.role;
      req.whitelabelId = user.whitelabelId || null;

      // Extract tenant context
      const tenant = await extractTenantContext(req, user);
      req.tenant = tenant;
      req.isWhitelabel = tenant.isWhitelabel;
    } else {
      req.isAuthenticated = false;
    }
  } catch (err) {
    req.isAuthenticated = false;
  }

  next();
});

/**
 * Generate JWT token
 * @param {string} id - User ID
 * @param {string} role - User role
 * @returns {string} JWT token
 */
exports.signToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "90d",
  });
};

/**
 * Create and send JWT token response
 * @param {Object} user - User document
 * @param {number} statusCode - HTTP status code
 * @param {Object} res - Express response object
 * @param {Object} additionalData - Additional data to include in response
 */
exports.createSendToken = (user, statusCode, res, additionalData = {}) => {
  const token = exports.signToken(user._id, user.role);

  // Cookie options
  const cookieOptions = {
    expires: new Date(
      Date.now() +
      (process.env.JWT_COOKIE_EXPIRES_IN || 90) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  };

  res.cookie("jwt", token, cookieOptions);

  // Use toPublicJSON if available for consistent response structure
  // This ensures permissions and whitelabelId are properly included
  const userResponse = user.toPublicJSON
    ? user.toPublicJSON()
    : (() => {
      const obj = user.toObject ? user.toObject() : { ...user };
      delete obj.password;
      delete obj.passwordResetToken;
      delete obj.passwordResetExpires;
      delete obj.emailVerificationCode;
      delete obj.emailVerificationExpires;
      delete obj.__v;
      return obj;
    })();

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user: userResponse,
      ...additionalData,
    },
  });
};

/**
 * Logout - Clear JWT cookie
 */
exports.logout = (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    status: "success",
    message: "Logged out successfully",
  });
};

/**
 * Extract tenant context from request
 * Supports subdomain and custom domain detection
 * @param {Object} req - Express request object
 * @param {Object} user - User document
 * @returns {Promise<Object>} Tenant context
 */
async function extractTenantContext(req, user) {
  const tenant = {
    id: null,
    domain: null,
    subdomain: null,
    isWhitelabel: false,
    config: null,
  };

  // Check if user belongs to a whitelabel
  if (user.whitelabelId) {
    tenant.id = user.whitelabelId._id || user.whitelabelId;
    tenant.isWhitelabel = true;

    // If whitelabelId is populated, extract domain info
    if (user.whitelabelId.domain) {
      tenant.domain = user.whitelabelId.domain.customDomain || null;
      tenant.subdomain = user.whitelabelId.domain.subdomain || null;
      tenant.config = user.whitelabelId;
    }
  }

  // Extract from request hostname (subdomain or custom domain)
  const hostname = req.hostname || req.get("host")?.split(":")[0];
  if (hostname) {
    // Check for subdomain pattern: {subdomain}.halaa.sa
    const subdomainMatch = hostname.match(/^([^.]+)\.halaa\.sa$/);
    if (
      subdomainMatch &&
      subdomainMatch[1] !== "www" &&
      subdomainMatch[1] !== "api"
    ) {
      tenant.subdomain = subdomainMatch[1];
      tenant.isWhitelabel = true;

      // Validate subdomain against database if not already set
      if (!tenant.id) {
        const WhiteLabel = require("../../../models/UserModel");
        const whitelabel = await WhiteLabel.findOne({
          "domain.subdomain": tenant.subdomain,
          role: "whitelabel_admin",
          status: "active",
        }).select("_id domain identity");

        if (whitelabel) {
          tenant.id = whitelabel._id;
          tenant.config = whitelabel;
        }
      }
    }
    // Check for custom domain
    else if (
      !hostname.includes("halaa.sa") &&
      !hostname.includes("localhost")
    ) {
      tenant.domain = hostname;
      tenant.isWhitelabel = true;

      // Validate custom domain against database if not already set
      if (!tenant.id) {
        const WhiteLabel = require("../../../models/UserModel");
        const whitelabel = await WhiteLabel.findOne({
          "domain.customDomain": tenant.domain,
          role: "whitelabel_admin",
          status: "active",
        }).select("_id domain identity");

        if (whitelabel) {
          tenant.id = whitelabel._id;
          tenant.config = whitelabel;
        }
      }
    }
  }

  return tenant;
}

/**
 * Middleware to validate tenant context
 * Ensures user belongs to the correct tenant
 */
exports.validateTenant = catchAsync(async (req, res, next) => {
  if (!req.tenant || !req.tenant.isWhitelabel) {
    return next();
  }

  // If tenant is detected from domain but user doesn't belong to it
  if (
    req.tenant.id &&
    req.whitelabelId &&
    req.tenant.id.toString() !== req.whitelabelId.toString()
  ) {
    return next(
      new AppError("Access denied. You do not belong to this tenant", 403)
    );
  }

  next();
});
