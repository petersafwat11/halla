/**
 * Admin Permissions — mobile.
 *
 * Role/page/access-level enums live in `@halla/shared/constants` (mirror
 * of backend). The per-role ACCESS_MATRIX below stays mobile-local
 * because it currently diverges from web and backend; reconciling it is
 * a product decision pending (see UNIFICATION_REPORT.md Phase 8 slice 3
 * follow-ups). Once reconciled, this file collapses to a thin
 * re-export.
 */

import {
  ROLES,
  ADMIN_ROLES,
  WHITELABEL_ROLES,
  PLATFORM_ADMIN_ROLES,
  isAdminRole,
  isWhitelabelRole,
  isPlatformAdmin,
  hasRoleAccess,
  getManageableRoles,
  ADMIN_PAGES,
  ACCESS_LEVELS,
} from "@halla/shared/constants";

export { ROLES, ADMIN_ROLES, WHITELABEL_ROLES, PLATFORM_ADMIN_ROLES };
export { isAdminRole, isWhitelabelRole, isPlatformAdmin, hasRoleAccess, getManageableRoles };
export { ACCESS_LEVELS };

/**
 * Page keys — mobile alias preserving the existing `PAGES` import surface.
 * Mirrors backend ADMIN_PAGES + a mobile-only `PLANS: "plans"` key.
 *
 * Backend treats `plans` as a host/vendor page (not admin-permissioned)
 * and only has `MANAGE_PLANS`. Mobile's admin UI exposes a `plans` page
 * (`AdminPlansScreen` + `WhitelabelPlansSummaryScreen` etc.) and gates
 * its visibility via `canViewPage(role, PAGES.PLANS)` against the
 * `ACCESS_MATRIX` below. Keep the alias here so those gates resolve.
 */
export const PAGES = { ...ADMIN_PAGES, PLANS: "plans" };

/**
 * Mobile access matrix — keep in sync with backend `ROLE_PAGE_ACCESS`
 * once the cross-app reconciliation lands. Today's matrix matches mobile
 * UX expectations and diverges from backend on these rows:
 *   MODERATOR.SETTINGS:        backend NONE, mobile VIEW
 *   MODERATOR.TEMPLATES_*:     mobile lacks these keys (see backend)
 *   WHITELABEL_MODERATOR.PLANS: backend NONE, mobile VIEW
 */
const ACCESS_MATRIX = {
  [ROLES.SUPER_ADMIN]: {
    [PAGES.DASHBOARD]: ACCESS_LEVELS.FULL,
    [PAGES.HOSTS]: ACCESS_LEVELS.FULL,
    [PAGES.VENDORS]: ACCESS_LEVELS.FULL,
    [PAGES.EVENTS]: ACCESS_LEVELS.FULL,
    [PAGES.TICKETS]: ACCESS_LEVELS.FULL,
    [PAGES.PAYMENTS]: ACCESS_LEVELS.FULL,
    [PAGES.MODERATORS]: ACCESS_LEVELS.FULL,
    [PAGES.WHITELABELS]: ACCESS_LEVELS.FULL,
    plans: ACCESS_LEVELS.FULL,
    [PAGES.DISCOUNTS]: ACCESS_LEVELS.FULL,
    [PAGES.SETTINGS]: ACCESS_LEVELS.FULL,
    [PAGES.TEMPLATES]: ACCESS_LEVELS.FULL,
  },
  [ROLES.ADMIN]: {
    [PAGES.DASHBOARD]: ACCESS_LEVELS.FULL,
    [PAGES.HOSTS]: ACCESS_LEVELS.FULL,
    [PAGES.VENDORS]: ACCESS_LEVELS.FULL,
    [PAGES.EVENTS]: ACCESS_LEVELS.FULL,
    [PAGES.TICKETS]: ACCESS_LEVELS.FULL,
    [PAGES.PAYMENTS]: ACCESS_LEVELS.FULL,
    [PAGES.MODERATORS]: ACCESS_LEVELS.FULL,
    [PAGES.WHITELABELS]: ACCESS_LEVELS.NONE,
    plans: ACCESS_LEVELS.FULL,
    [PAGES.DISCOUNTS]: ACCESS_LEVELS.FULL,
    [PAGES.SETTINGS]: ACCESS_LEVELS.FULL,
    [PAGES.TEMPLATES]: ACCESS_LEVELS.FULL,
  },
  [ROLES.MODERATOR]: {
    [PAGES.DASHBOARD]: ACCESS_LEVELS.VIEW,
    [PAGES.HOSTS]: ACCESS_LEVELS.EDIT,
    [PAGES.VENDORS]: ACCESS_LEVELS.VIEW,
    [PAGES.EVENTS]: ACCESS_LEVELS.EDIT,
    [PAGES.TICKETS]: ACCESS_LEVELS.FULL,
    [PAGES.PAYMENTS]: ACCESS_LEVELS.VIEW,
    [PAGES.MODERATORS]: ACCESS_LEVELS.NONE,
    [PAGES.WHITELABELS]: ACCESS_LEVELS.NONE,
    plans: ACCESS_LEVELS.NONE,
    [PAGES.DISCOUNTS]: ACCESS_LEVELS.FULL,
    [PAGES.SETTINGS]: ACCESS_LEVELS.VIEW,
    [PAGES.TEMPLATES]: ACCESS_LEVELS.EDIT,
  },
  [ROLES.WHITELABEL_ADMIN]: {
    [PAGES.DASHBOARD]: ACCESS_LEVELS.FULL,
    [PAGES.HOSTS]: ACCESS_LEVELS.FULL,
    [PAGES.VENDORS]: ACCESS_LEVELS.NONE,
    [PAGES.EVENTS]: ACCESS_LEVELS.FULL,
    [PAGES.TICKETS]: ACCESS_LEVELS.NONE,
    [PAGES.PAYMENTS]: ACCESS_LEVELS.FULL,
    [PAGES.MODERATORS]: ACCESS_LEVELS.FULL,
    [PAGES.WHITELABELS]: ACCESS_LEVELS.NONE,
    plans: ACCESS_LEVELS.FULL,
    [PAGES.DISCOUNTS]: ACCESS_LEVELS.NONE,
    [PAGES.SETTINGS]: ACCESS_LEVELS.FULL,
    [PAGES.TEMPLATES]: ACCESS_LEVELS.NONE,
  },
  [ROLES.WHITELABEL_MODERATOR]: {
    [PAGES.DASHBOARD]: ACCESS_LEVELS.VIEW,
    [PAGES.HOSTS]: ACCESS_LEVELS.EDIT,
    [PAGES.VENDORS]: ACCESS_LEVELS.NONE,
    [PAGES.EVENTS]: ACCESS_LEVELS.EDIT,
    [PAGES.TICKETS]: ACCESS_LEVELS.NONE,
    [PAGES.PAYMENTS]: ACCESS_LEVELS.VIEW,
    [PAGES.MODERATORS]: ACCESS_LEVELS.NONE,
    [PAGES.WHITELABELS]: ACCESS_LEVELS.NONE,
    plans: ACCESS_LEVELS.VIEW,
    [PAGES.DISCOUNTS]: ACCESS_LEVELS.NONE,
    [PAGES.SETTINGS]: ACCESS_LEVELS.VIEW,
    [PAGES.TEMPLATES]: ACCESS_LEVELS.NONE,
  },
};

export const getPageAccessLevel = (role, pageKey) => {
  if (!role || !pageKey) return ACCESS_LEVELS.NONE;
  const rolePermissions = ACCESS_MATRIX[role];
  if (!rolePermissions) return ACCESS_LEVELS.NONE;
  return rolePermissions[pageKey] || ACCESS_LEVELS.NONE;
};

export const canViewPage = (role, pageKey) =>
  getPageAccessLevel(role, pageKey) !== ACCESS_LEVELS.NONE;

export const canEditPage = (role, pageKey) => {
  const level = getPageAccessLevel(role, pageKey);
  return level === ACCESS_LEVELS.EDIT || level === ACCESS_LEVELS.FULL;
};

export const canDeleteOnPage = (role, pageKey) =>
  getPageAccessLevel(role, pageKey) === ACCESS_LEVELS.FULL;

const NAV_ITEMS = [
  { key: PAGES.DASHBOARD, label: "Dashboard", icon: "dashboard", path: "/admin/dashboard", requiredRoles: ADMIN_ROLES },
  { key: PAGES.HOSTS, label: "Hosts", icon: "people", path: "/admin/hosts", requiredRoles: ADMIN_ROLES },
  { key: PAGES.VENDORS, label: "Vendors", icon: "store", path: "/admin/vendors", requiredRoles: PLATFORM_ADMIN_ROLES },
  { key: PAGES.EVENTS, label: "Events", icon: "calendar", path: "/admin/events", requiredRoles: ADMIN_ROLES },
  { key: PAGES.TICKETS, label: "Tickets", icon: "support", path: "/admin/tickets", requiredRoles: PLATFORM_ADMIN_ROLES },
  { key: PAGES.PAYMENTS, label: "Payments", icon: "payment", path: "/admin/payments", requiredRoles: ADMIN_ROLES },
  { key: PAGES.MODERATORS, label: "Moderators", icon: "admin", path: "/admin/moderators", requiredRoles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.WHITELABEL_ADMIN] },
  { key: PAGES.WHITELABELS, label: "Whitelabels", icon: "business", path: "/admin/whitelabels", requiredRoles: [ROLES.SUPER_ADMIN] },
  { key: "plans", label: "Plans", icon: "subscription", path: "/admin/plans", requiredRoles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.WHITELABEL_ADMIN, ROLES.WHITELABEL_MODERATOR] },
  { key: PAGES.SETTINGS, label: "Settings", icon: "settings", path: "/admin/settings", requiredRoles: ADMIN_ROLES },
  { key: PAGES.TEMPLATES, label: "Templates", icon: "images", path: "/admin/templates", requiredRoles: PLATFORM_ADMIN_ROLES },
];

export const getNavItemsForRole = (role) => {
  if (!role) return [];
  return NAV_ITEMS.filter((item) => {
    if (!item.requiredRoles.includes(role)) return false;
    return canViewPage(role, item.key);
  });
};

export const hasRole = (userRole, requiredRole) => {
  if (!userRole) return false;
  if (Array.isArray(requiredRole)) return requiredRole.includes(userRole);
  return userRole === requiredRole;
};

export const isSuperAdmin = (role) => role === ROLES.SUPER_ADMIN;
export const isAdmin = (role) => role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;
export const isWhitelabelAdmin = (role) => role === ROLES.WHITELABEL_ADMIN;
export const isModerator = (role) =>
  role === ROLES.MODERATOR || role === ROLES.WHITELABEL_MODERATOR;

export const getRoleDisplayName = (role) => {
  const roleNames = {
    [ROLES.SUPER_ADMIN]: "Super Admin",
    [ROLES.ADMIN]: "Admin",
    [ROLES.MODERATOR]: "Moderator",
    [ROLES.WHITELABEL_ADMIN]: "Whitelabel Admin",
    [ROLES.WHITELABEL_MODERATOR]: "Whitelabel Moderator",
  };
  return roleNames[role] || "Unknown Role";
};

export default {
  ACCESS_LEVELS,
  ROLES,
  PAGES,
  getPageAccessLevel,
  canViewPage,
  canEditPage,
  canDeleteOnPage,
  getNavItemsForRole,
  hasRole,
  isSuperAdmin,
  isAdmin,
  isWhitelabelAdmin,
  isModerator,
  getRoleDisplayName,
};
