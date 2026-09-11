/**
 * Feature-specific authorization for admin payment links.
 *
 * - view: any super_admin/admin/moderator whose effective Payments page
 *   access is not NONE (matches the global Payments list).
 * - manage (create/refresh/cancel): `canManagePaymentLinks(user)` — the
 *   three staff roles with non-NONE Payments access. Deliberately does NOT
 *   require global `manage`, so default VIEW moderators can use this feature
 *   without gaining refund/capture/void/export privileges.
 */

const AppError = require("../../shared/errors/AppError");
const { getPageAccess, canManagePaymentLinks, ADMIN_PAGES, ACCESS_LEVELS } = require("../../shared/constants");

const requirePaymentLinksView = (req, res, next) => {
  if (!req.user) return next(new AppError("Please log in to access this resource", 401));
  const access = getPageAccess(req.user, ADMIN_PAGES.PAYMENTS);
  if (access === ACCESS_LEVELS.NONE || !canManagePaymentLinks(req.user)) {
    return next(new AppError("You do not have permission to view this resource", 403));
  }
  return next();
};

const requirePaymentLinksManage = (req, res, next) => {
  if (!req.user) return next(new AppError("Please log in to access this resource", 401));
  if (!canManagePaymentLinks(req.user)) {
    return next(new AppError("You do not have permission to manage payment links", 403));
  }
  return next();
};

module.exports = { requirePaymentLinksView, requirePaymentLinksManage };
