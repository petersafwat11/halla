/**
 * Guest Authentication Middleware
 * Validates guest session tokens for post-event content access
 */

const jwt = require("jsonwebtoken");
const AppError = require("../errors/AppError");
const GuestAccessToken = require("../../../models/GuestAccessTokenModel");

/**
 * Authenticate guest user via JWT session token
 * Sets req.guestUser with decoded token data
 */
exports.guestAuth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(
        new AppError("Access token required. Please use your access link.", 401)
      );
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return next(
          new AppError(
            "Your session has expired. Please use your access link again.",
            401
          )
        );
      }
      return next(new AppError("Invalid access token", 401));
    }

    // Check token type
    if (decoded.type !== "guest_session") {
      return next(new AppError("Invalid token type for guest access", 401));
    }

    // Verify token is not revoked
    const tokenRecord = await GuestAccessToken.findOne({
      token: token,
      isRevoked: { $ne: true },
    });
    if (!tokenRecord) {
      return next(new AppError("Access token has been revoked", 401));
    }

    // Verify eventId in route matches token
    if (req.params.eventId && req.params.eventId !== decoded.eventId) {
      return next(new AppError("Token not valid for this content", 403));
    }

    // Set guest user info on request
    req.guestUser = {
      guestId: decoded.guestId,
      eventId: decoded.eventId,
      guestName: decoded.guestName,
    };

    next();
  } catch (error) {
    console.error("Guest auth error:", error);
    return next(new AppError("Authentication failed", 500));
  }
};

/**
 * Optional guest auth - doesn't fail if no token
 */
exports.optionalGuestAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      req.guestUser = null;
      return next();
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.type === "guest_session") {
        req.guestUser = {
          guestId: decoded.guestId,
          eventId: decoded.eventId,
          guestName: decoded.guestName,
        };
      }
    } catch (err) {
      req.guestUser = null;
    }

    next();
  } catch (error) {
    req.guestUser = null;
    next();
  }
};
