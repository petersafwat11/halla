/**
 * Staff Authentication Middleware
 * Validates staff session tokens for staff portal access
 */

const jwt = require("jsonwebtoken");
const AppError = require("../errors/AppError");
const Event = require("../../../models/EventModel");

/**
 * Authenticate staff user via JWT session token
 * Sets req.staffUser with decoded token data
 */
exports.staffAuth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(
        new AppError(
          "Staff access token required. Please verify your access first.",
          401
        )
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
            "Your session has expired. Please verify your access again.",
            401
          )
        );
      }
      return next(new AppError("Invalid staff token", 401));
    }

    // Check token type
    if (decoded.type !== "staff_session") {
      return next(new AppError("Invalid token type for staff access", 401));
    }

    // Verify event exists and staff has access
    const event = await Event.findById(decoded.eventId);
    if (!event) {
      return next(new AppError("Event not found", 404));
    }

    // Verify staff is still in staffList
    const cleanPhone = decoded.phone?.replace(/[\s\-\(\)]/g, "");
    const staff = event.staffList?.find(
      (s) => s.phone?.replace(/[\s\-\(\)]/g, "") === cleanPhone
    );

    if (!staff) {
      return next(
        new AppError("Your staff access has been revoked for this event", 403)
      );
    }

    if (staff.status === "inactive") {
      return next(new AppError("Your staff access has been deactivated", 403));
    }

    // Verify eventId in route matches token
    if (req.params.eventId && req.params.eventId !== decoded.eventId.toString()) {
      return next(new AppError("Token not valid for this event", 403));
    }

    // Set staff user info on request
    req.staffUser = {
      eventId: decoded.eventId,
      phone: decoded.phone,
      staffName: decoded.staffName,
      staffId: decoded.staffId || staff._id,
      staffStatus: staff.status,
    };

    next();
  } catch (error) {
    console.error("Staff auth error:", error);
    return next(new AppError("Authentication failed", 500));
  }
};

/**
 * Optional staff auth - doesn't fail if no token
 * Useful for routes that work differently for authenticated staff
 */
exports.optionalStaffAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      req.staffUser = null;
      return next();
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.type === "staff_session") {
        req.staffUser = {
          eventId: decoded.eventId,
          phone: decoded.phone,
          staffName: decoded.staffName,
          staffId: decoded.staffId,
        };
      }
    } catch (err) {
      req.staffUser = null;
    }

    next();
  } catch (error) {
    req.staffUser = null;
    next();
  }
};
