/**
 * Authentication Middleware
 *
 * Phase 1a (FLOW-01-F01..F07): the legacy 90-day single-cookie JWT model is
 * gone. Access tokens are short-lived (15 min) and live in the `access_token`
 * cookie on web (HttpOnly, Path=/) or in the `Authorization: Bearer …` header
 * on mobile. Refresh tokens never reach `protect`; they only flow through
 * `POST /auth/refresh`.
 *
 * The legacy `signToken` / `createSendToken` exports were removed. All token
 * issuance goes through `authService.issueTokenPair` so there is one source
 * of truth for TTLs and cookie shapes.
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
const config = require("../../config");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../errors/AppError");

const User = require("../../../models/UserModel");

const ACCESS_COOKIE = "access_token";

/**
 * Read the access token from header or cookie.
 *
 * Order:
 *   1. `Authorization: Bearer <token>` (preferred for mobile)
 *   2. `access_token` cookie (web)
 *   3. legacy `jwt` cookie (Phase 0 sessions only — accepted for one deploy
 *      cycle so existing dev cookies don't 401 immediately; remove in 1c).
 */
const extractAccessToken = (req) => {
  if (req.headers.authorization?.startsWith("Bearer")) {
    return req.headers.authorization.split(" ")[1];
  }
  if (req.cookies?.[ACCESS_COOKIE]) return req.cookies[ACCESS_COOKIE];
  if (req.cookies?.jwt) return req.cookies.jwt;
  return null;
};

/**
 * Protect routes - Verify access token and attach user to request
 */
exports.protect = catchAsync(async (req, res, next) => {
  const token = extractAccessToken(req);

  if (!token) {
    return next(new AppError("Please log in to access this resource", 401));
  }

  // 2. Verify token
  let decoded;
  try {
    decoded = await promisify(jwt.verify)(token, config.jwt.secret);
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
  const token = extractAccessToken(req);

  if (!token) {
    req.isAuthenticated = false;
    return next();
  }

  try {
    const decoded = await promisify(jwt.verify)(token, config.jwt.secret);
    const user = await User.findById(decoded.id).populate("subscription");

    if (user && user.status === USER_STATUS.ACTIVE) {
      // Honour password-change revocation on optional-auth routes too
      // (closes the FLOW-01-F04 / Flow-01 note about silent bypass).
      if (user.changedPasswordAfter && user.changedPasswordAfter(decoded.iat)) {
        req.isAuthenticated = false;
        return next();
      }

      req.user = user;
      req.isAuthenticated = true;
      req.userId = user._id;
      req.userRole = user.role;
      req.whitelabelId = user.whitelabelId || null;

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
 * Extract tenant context from request
 * Supports subdomain and custom domain detection
 */
async function extractTenantContext(req, user) {
  const tenant = {
    id: null,
    domain: null,
    subdomain: null,
    isWhitelabel: false,
    config: null,
  };

  if (user.whitelabelId) {
    tenant.id = user.whitelabelId._id || user.whitelabelId;
    tenant.isWhitelabel = true;

    if (user.whitelabelId.domain) {
      tenant.domain = user.whitelabelId.domain.customDomain || null;
      tenant.subdomain = user.whitelabelId.domain.subdomain || null;
      tenant.config = user.whitelabelId;
    }
  }

  const hostname = req.hostname || req.get("host")?.split(":")[0];
  if (hostname) {
    const subdomainMatch = hostname.match(/^([^.]+)\.halaa\.sa$/);
    if (
      subdomainMatch &&
      subdomainMatch[1] !== "www" &&
      subdomainMatch[1] !== "api"
    ) {
      tenant.subdomain = subdomainMatch[1];
      tenant.isWhitelabel = true;

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
    } else if (
      !hostname.includes("halaa.sa") &&
      !hostname.includes("localhost")
    ) {
      tenant.domain = hostname;
      tenant.isWhitelabel = true;

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
 * Validate tenant context — ensures user belongs to the correct tenant
 */
exports.validateTenant = catchAsync(async (req, res, next) => {
  if (!req.tenant || !req.tenant.isWhitelabel) {
    return next();
  }

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
