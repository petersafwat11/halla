/**
 * Admin Permissions Utility
 * Provides role-based access control (RBAC) for admin dashboard
 */

/**
 * Access levels
 */
export const ACCESS_LEVELS = {
  FULL: "full", // Full access (view, edit, delete)
  EDIT: "edit", // View and edit access
  VIEW: "view", // View-only access
  NONE: "none", // No access
};

/**
 * Admin roles
 */
export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  MODERATOR: "moderator",
  WHITELABEL_ADMIN: "whitelabel_admin",
  WHITELABEL_MODERATOR: "whitelabel_moderator",
};

/**
 * Page keys for navigation and access control
 */
export const PAGES = {
  DASHBOARD: "dashboard",
  HOSTS: "hosts",
  VENDORS: "vendors",
  EVENTS: "events",
  TICKETS: "tickets",
  PAYMENTS: "payments",
  MODERATORS: "moderators",
  WHITELABELS: "whitelabels",
  PLANS: "plans",
  DISCOUNTS: "discounts",
  SETTINGS: "settings",
  TEMPLATES: "templates",
};

/**
 * Access level matrix
 * Defines access levels for each role and page combination
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
    [PAGES.PLANS]: ACCESS_LEVELS.FULL,
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
    [PAGES.PLANS]: ACCESS_LEVELS.FULL,
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
    [PAGES.PLANS]: ACCESS_LEVELS.NONE,
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
    [PAGES.PLANS]: ACCESS_LEVELS.FULL,
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
    [PAGES.PLANS]: ACCESS_LEVELS.VIEW,
    [PAGES.DISCOUNTS]: ACCESS_LEVELS.NONE,
    [PAGES.SETTINGS]: ACCESS_LEVELS.VIEW,
    [PAGES.TEMPLATES]: ACCESS_LEVELS.NONE,
  },
};

/**
 * Get access level for a specific role and page
 * @param {string} role - User role
 * @param {string} pageKey - Page key
 * @returns {string} Access level ('full' | 'edit' | 'view' | 'none')
 */
export const getPageAccessLevel = (role, pageKey) => {
  if (!role || !pageKey) {
    return ACCESS_LEVELS.NONE;
  }

  const rolePermissions = ACCESS_MATRIX[role];
  if (!rolePermissions) {
    return ACCESS_LEVELS.NONE;
  }

  return rolePermissions[pageKey] || ACCESS_LEVELS.NONE;
};

/**
 * Check if user can view a page
 * @param {string} role - User role
 * @param {string} pageKey - Page key
 * @returns {boolean} True if user can view the page
 */
export const canViewPage = (role, pageKey) => {
  const accessLevel = getPageAccessLevel(role, pageKey);
  return accessLevel !== ACCESS_LEVELS.NONE;
};

/**
 * Check if user can edit on a page
 * @param {string} role - User role
 * @param {string} pageKey - Page key
 * @returns {boolean} True if user can edit on the page
 */
export const canEditPage = (role, pageKey) => {
  const accessLevel = getPageAccessLevel(role, pageKey);
  return (
    accessLevel === ACCESS_LEVELS.EDIT || accessLevel === ACCESS_LEVELS.FULL
  );
};

/**
 * Check if user can delete on a page
 * @param {string} role - User role
 * @param {string} pageKey - Page key
 * @returns {boolean} True if user can delete on the page
 */
export const canDeleteOnPage = (role, pageKey) => {
  const accessLevel = getPageAccessLevel(role, pageKey);
  return accessLevel === ACCESS_LEVELS.FULL;
};

/**
 * Navigation items configuration
 */
const NAV_ITEMS = [
  {
    key: PAGES.DASHBOARD,
    label: "Dashboard",
    icon: "dashboard",
    path: "/admin/dashboard",
    requiredRoles: [
      ROLES.SUPER_ADMIN,
      ROLES.ADMIN,
      ROLES.MODERATOR,
      ROLES.WHITELABEL_ADMIN,
      ROLES.WHITELABEL_MODERATOR,
    ],
  },
  {
    key: PAGES.HOSTS,
    label: "Hosts",
    icon: "people",
    path: "/admin/hosts",
    requiredRoles: [
      ROLES.SUPER_ADMIN,
      ROLES.ADMIN,
      ROLES.MODERATOR,
      ROLES.WHITELABEL_ADMIN,
      ROLES.WHITELABEL_MODERATOR,
    ],
  },
  {
    key: PAGES.VENDORS,
    label: "Vendors",
    icon: "store",
    path: "/admin/vendors",
    requiredRoles: [
      ROLES.SUPER_ADMIN,
      ROLES.ADMIN,
      ROLES.MODERATOR,
    ],
  },
  {
    key: PAGES.EVENTS,
    label: "Events",
    icon: "calendar",
    path: "/admin/events",
    requiredRoles: [
      ROLES.SUPER_ADMIN,
      ROLES.ADMIN,
      ROLES.MODERATOR,
      ROLES.WHITELABEL_ADMIN,
      ROLES.WHITELABEL_MODERATOR,
    ],
  },
  {
    key: PAGES.TICKETS,
    label: "Tickets",
    icon: "support",
    path: "/admin/tickets",
    requiredRoles: [
      ROLES.SUPER_ADMIN,
      ROLES.ADMIN,
      ROLES.MODERATOR,
    ],
  },
  {
    key: PAGES.PAYMENTS,
    label: "Payments",
    icon: "payment",
    path: "/admin/payments",
    requiredRoles: [
      ROLES.SUPER_ADMIN,
      ROLES.ADMIN,
      ROLES.MODERATOR,
      ROLES.WHITELABEL_ADMIN,
      ROLES.WHITELABEL_MODERATOR,
    ],
  },
  {
    key: PAGES.MODERATORS,
    label: "Moderators",
    icon: "admin",
    path: "/admin/moderators",
    requiredRoles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.WHITELABEL_ADMIN],
  },
  {
    key: PAGES.WHITELABELS,
    label: "Whitelabels",
    icon: "business",
    path: "/admin/whitelabels",
    requiredRoles: [ROLES.SUPER_ADMIN],
  },
  {
    key: PAGES.PLANS,
    label: "Plans",
    icon: "subscription",
    path: "/admin/plans",
    requiredRoles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.WHITELABEL_ADMIN, ROLES.WHITELABEL_MODERATOR],
  },
  {
    key: PAGES.SETTINGS,
    label: "Settings",
    icon: "settings",
    path: "/admin/settings",
    requiredRoles: [
      ROLES.SUPER_ADMIN,
      ROLES.ADMIN,
      ROLES.MODERATOR,
      ROLES.WHITELABEL_ADMIN,
      ROLES.WHITELABEL_MODERATOR,
    ],
  },
  {
    key: PAGES.TEMPLATES,
    label: "Templates",
    icon: "images",
    path: "/admin/templates",
    requiredRoles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MODERATOR],
  },
];

/**
 * Get navigation items filtered by user role
 * @param {string} role - User role
 * @returns {Array} Filtered navigation items
 */
export const getNavItemsForRole = (role) => {
  if (!role) {
    return [];
  }

  return NAV_ITEMS.filter((item) => {
    // Check if role is in required roles
    if (!item.requiredRoles.includes(role)) {
      return false;
    }

    // Check if user can view the page
    return canViewPage(role, item.key);
  });
};

/**
 * Check if user has a specific role
 * @param {string} userRole - User's role
 * @param {string|Array<string>} requiredRole - Required role(s)
 * @returns {boolean} True if user has the required role
 */
export const hasRole = (userRole, requiredRole) => {
  if (!userRole) {
    return false;
  }

  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(userRole);
  }

  return userRole === requiredRole;
};

/**
 * Check if user is super admin
 * @param {string} role - User role
 * @returns {boolean} True if user is super admin
 */
export const isSuperAdmin = (role) => {
  return role === ROLES.SUPER_ADMIN;
};

/**
 * Check if user is admin (super_admin or admin)
 * @param {string} role - User role
 * @returns {boolean} True if user is admin
 */
export const isAdmin = (role) => {
  return role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;
};

/**
 * Check if user is whitelabel admin
 * @param {string} role - User role
 * @returns {boolean} True if user is whitelabel admin
 */
export const isWhitelabelAdmin = (role) => {
  return role === ROLES.WHITELABEL_ADMIN;
};

/**
 * Check if user is moderator (any type)
 * @param {string} role - User role
 * @returns {boolean} True if user is moderator
 */
export const isModerator = (role) => {
  return role === ROLES.MODERATOR || role === ROLES.WHITELABEL_MODERATOR;
};

/**
 * Get user role display name
 * @param {string} role - User role
 * @returns {string} Display name for the role
 */
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
