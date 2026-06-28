/**
 * Authentication Middleware
 *
 * Access tokens are short-lived (15 min) and live in the `access_token`
 * cookie on web (HttpOnly, Path=/) or in the `Authorization: Bearer …` header
 * on mobile. Refresh tokens never reach `protect`; they only flow through
 * `POST /auth/refresh`.
 *
 * All token issuance goes through `authService.issueTokenPair` so there is one
 * source of truth for TTLs and cookie shapes.
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
 *
 * The legacy `jwt` cookie name is deliberately not honoured: continuing to
 * accept it is a downgrade attack surface — if an attacker can plant a `jwt=`
 * cookie via any subdomain or compromised dependency, the server would accept
 * it as authoritative. Refusing it is the only safe behaviour.
 */
const extractAccessToken = (req) => {
  if (req.headers.authorization?.startsWith("Bearer")) {
    return req.headers.authorization.split(" ")[1];
  }
  if (req.cookies?.[ACCESS_COOKIE]) return req.cookies[ACCESS_COOKIE];
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
    .populate("subscription");

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

  // Account deletion (§4.1): immediately invalidate already-issued access
  // tokens. Refresh tokens are revoked at deletion time; this closes the
  // remaining access-JWT window for a deleted/anonymized account.
  if (user.status === USER_STATUS.DELETED) {
    return next(new AppError("This account has been deleted", 401));
  }

  // 6. Attach user to request
  req.user = user;

  // 7. Set convenience flags
  req.isAuthenticated = true;
  req.userId = user._id;
  req.userRole = user.role;

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
      // Honour password-change revocation on optional-auth routes too.
      if (user.changedPasswordAfter && user.changedPasswordAfter(decoded.iat)) {
        req.isAuthenticated = false;
        return next();
      }

      req.user = user;
      req.isAuthenticated = true;
      req.userId = user._id;
      req.userRole = user.role;
    } else {
      req.isAuthenticated = false;
    }
  } catch (err) {
    req.isAuthenticated = false;
  }

  next();
});
