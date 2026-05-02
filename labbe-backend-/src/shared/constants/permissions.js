/**
 * Permission Constants
 * Admin page access and permission levels
 * @module shared/constants/permissions
 */

const { ROLES } = require('./roles');

/**
 * Legacy permissions (kept for backward compatibility with models)
 */
const PERMISSIONS = {
  MANAGE_HOSTS: 'manage_hosts',
  MANAGE_VENDORS: 'manage_vendors',
  MANAGE_EVENTS: 'manage_events',
  MANAGE_TICKETS: 'manage_tickets',
  MANAGE_PAYMENTS: 'manage_payments',
  MANAGE_TEAM: 'manage_team',
  MANAGE_WHITELABELS: 'manage_whitelabels',
};

const DEFAULT_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
  [ROLES.ADMIN]: [
    PERMISSIONS.MANAGE_HOSTS,
    PERMISSIONS.MANAGE_VENDORS,
    PERMISSIONS.MANAGE_EVENTS,
    PERMISSIONS.MANAGE_TICKETS,
    PERMISSIONS.MANAGE_PAYMENTS,
    PERMISSIONS.MANAGE_TEAM,
  ],
  [ROLES.MODERATOR]: [
    PERMISSIONS.MANAGE_HOSTS,
    PERMISSIONS.MANAGE_EVENTS,
    PERMISSIONS.MANAGE_TICKETS,
  ],
  [ROLES.WHITELABEL_ADMIN]: [
    PERMISSIONS.MANAGE_HOSTS,
    PERMISSIONS.MANAGE_EVENTS,
    PERMISSIONS.MANAGE_PAYMENTS,
    PERMISSIONS.MANAGE_TEAM,
  ],
  [ROLES.WHITELABEL_MODERATOR]: [
    PERMISSIONS.MANAGE_HOSTS,
    PERMISSIONS.MANAGE_EVENTS,
  ],
  [ROLES.HOST]: [],
  [ROLES.VENDOR]: [],
  [ROLES.GUEST]: [],
};

/**
 * Get default permissions for a role
 * @param {string} role
 * @returns {string[]}
 */
const getDefaultPermissions = (role) => DEFAULT_PERMISSIONS[role] || [];

/**
 * Admin panel pages
 */
const ADMIN_PAGES = {
  DASHBOARD: 'dashboard',
  HOSTS: 'hosts',
  VENDORS: 'vendors',
  EVENTS: 'events',
  TICKETS: 'tickets',
  PAYMENTS: 'payments',
  MODERATORS: 'moderators',
  WHITELABELS: 'whitelabels',
  MANAGE_PLANS: 'manage_plans',
  SETTINGS: 'settings',
  DISCOUNTS: 'discounts',
};

/**
 * Access levels for pages
 */
const ACCESS_LEVELS = {
  FULL: 'full',   // Can view, create, update, delete, export
  EDIT: 'edit',   // Can view, create, update (NO delete)
  VIEW: 'view',   // Can only view (read-only)
  NONE: 'none',   // No access
};

/**
 * Page access by role
 */
const ROLE_PAGE_ACCESS = {
  [ROLES.SUPER_ADMIN]: {
    [ADMIN_PAGES.DASHBOARD]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.HOSTS]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.VENDORS]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.EVENTS]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.TICKETS]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.PAYMENTS]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.MODERATORS]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.WHITELABELS]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.MANAGE_PLANS]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.SETTINGS]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.DISCOUNTS]: ACCESS_LEVELS.FULL,
  },
  [ROLES.ADMIN]: {
    [ADMIN_PAGES.DASHBOARD]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.HOSTS]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.VENDORS]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.EVENTS]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.TICKETS]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.PAYMENTS]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.MODERATORS]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.WHITELABELS]: ACCESS_LEVELS.NONE,
    [ADMIN_PAGES.MANAGE_PLANS]: ACCESS_LEVELS.NONE,
    [ADMIN_PAGES.SETTINGS]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.DISCOUNTS]: ACCESS_LEVELS.FULL,
  },
  [ROLES.MODERATOR]: {
    [ADMIN_PAGES.DASHBOARD]: ACCESS_LEVELS.VIEW,
    [ADMIN_PAGES.HOSTS]: ACCESS_LEVELS.EDIT,
    [ADMIN_PAGES.VENDORS]: ACCESS_LEVELS.VIEW,
    [ADMIN_PAGES.EVENTS]: ACCESS_LEVELS.EDIT,
    [ADMIN_PAGES.TICKETS]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.PAYMENTS]: ACCESS_LEVELS.VIEW,
    [ADMIN_PAGES.MODERATORS]: ACCESS_LEVELS.NONE,
    [ADMIN_PAGES.WHITELABELS]: ACCESS_LEVELS.NONE,
    [ADMIN_PAGES.MANAGE_PLANS]: ACCESS_LEVELS.NONE,
    [ADMIN_PAGES.SETTINGS]: ACCESS_LEVELS.NONE,
    [ADMIN_PAGES.DISCOUNTS]: ACCESS_LEVELS.FULL,
  },
  [ROLES.WHITELABEL_ADMIN]: {
    [ADMIN_PAGES.DASHBOARD]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.HOSTS]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.VENDORS]: ACCESS_LEVELS.NONE,
    [ADMIN_PAGES.EVENTS]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.TICKETS]: ACCESS_LEVELS.NONE,
    [ADMIN_PAGES.PAYMENTS]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.MODERATORS]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.WHITELABELS]: ACCESS_LEVELS.NONE,
    [ADMIN_PAGES.MANAGE_PLANS]: ACCESS_LEVELS.NONE,
    [ADMIN_PAGES.SETTINGS]: ACCESS_LEVELS.FULL,
  },
  [ROLES.WHITELABEL_MODERATOR]: {
    [ADMIN_PAGES.DASHBOARD]: ACCESS_LEVELS.VIEW,
    [ADMIN_PAGES.HOSTS]: ACCESS_LEVELS.EDIT,
    [ADMIN_PAGES.VENDORS]: ACCESS_LEVELS.NONE,
    [ADMIN_PAGES.EVENTS]: ACCESS_LEVELS.EDIT,
    [ADMIN_PAGES.TICKETS]: ACCESS_LEVELS.NONE,
    [ADMIN_PAGES.PAYMENTS]: ACCESS_LEVELS.VIEW,
    [ADMIN_PAGES.MODERATORS]: ACCESS_LEVELS.NONE,
    [ADMIN_PAGES.WHITELABELS]: ACCESS_LEVELS.NONE,
    [ADMIN_PAGES.MANAGE_PLANS]: ACCESS_LEVELS.NONE,
    [ADMIN_PAGES.SETTINGS]: ACCESS_LEVELS.NONE,
  },
};

/**
 * Get page access level for a user
 * @param {Object} user - User object with role and optional pageAccess
 * @param {string} page - Page from ADMIN_PAGES
 * @returns {string} Access level
 */
const getPageAccess = (user, page) => {
  // Custom page access overrides role defaults
  if (user.pageAccess && user.pageAccess[page]) {
    return user.pageAccess[page];
  }
  // Fall back to role defaults
  const roleAccess = ROLE_PAGE_ACCESS[user.role];
  return roleAccess ? roleAccess[page] || ACCESS_LEVELS.NONE : ACCESS_LEVELS.NONE;
};

/**
 * Check if user can perform action on a page
 * @param {Object} user - User object
 * @param {string} page - Page from ADMIN_PAGES
 * @param {string} action - 'view' | 'create' | 'update' | 'delete' | 'export'
 * @returns {boolean}
 */
const canAccessPage = (user, page, action = 'view') => {
  const access = getPageAccess(user, page);
  if (access === ACCESS_LEVELS.NONE) return false;

  if (action === 'view') return true;
  if (action === 'delete' || action === 'export') {
    return access === ACCESS_LEVELS.FULL;
  }
  if (action === 'create' || action === 'update' || action === 'edit') {
    return access === ACCESS_LEVELS.FULL || access === ACCESS_LEVELS.EDIT;
  }

  return false;
};

/**
 * Check if user has any access to a page
 * @param {Object} user
 * @param {string} page
 * @returns {boolean}
 */
const hasPageAccess = (user, page) => {
  return getPageAccess(user, page) !== ACCESS_LEVELS.NONE;
};

const PERMISSION_TO_PAGE = {
  [PERMISSIONS.MANAGE_HOSTS]: ADMIN_PAGES.HOSTS,
  [PERMISSIONS.MANAGE_VENDORS]: ADMIN_PAGES.VENDORS,
  [PERMISSIONS.MANAGE_EVENTS]: ADMIN_PAGES.EVENTS,
  [PERMISSIONS.MANAGE_TICKETS]: ADMIN_PAGES.TICKETS,
  [PERMISSIONS.MANAGE_PAYMENTS]: ADMIN_PAGES.PAYMENTS,
  [PERMISSIONS.MANAGE_TEAM]: ADMIN_PAGES.MODERATORS,
  [PERMISSIONS.MANAGE_WHITELABELS]: ADMIN_PAGES.WHITELABELS,
};

module.exports = {
  PERMISSIONS,
  DEFAULT_PERMISSIONS,
  getDefaultPermissions,
  ADMIN_PAGES,
  ACCESS_LEVELS,
  ROLE_PAGE_ACCESS,
  PERMISSION_TO_PAGE,
  getPageAccess,
  canAccessPage,
  hasPageAccess,
};
