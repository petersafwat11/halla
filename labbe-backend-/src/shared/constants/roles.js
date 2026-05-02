/**
 * User Roles Constants
 * Single source of truth for all role definitions
 * @module shared/constants/roles
 */

/**
 * User role identifiers
 */
const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  WHITELABEL_ADMIN: 'whitelabel_admin',
  WHITELABEL_MODERATOR: 'whitelabel_moderator',
  HOST: 'host',
  VENDOR: 'vendor',
  GUEST: 'guest',
};

/**
 * Role hierarchy - higher roles can manage lower roles
 */
const ROLE_HIERARCHY = {
  [ROLES.SUPER_ADMIN]: [
    ROLES.ADMIN,
    ROLES.MODERATOR,
    ROLES.WHITELABEL_ADMIN,
    ROLES.WHITELABEL_MODERATOR,
    ROLES.HOST,
    ROLES.VENDOR,
    ROLES.GUEST,
  ],
  [ROLES.ADMIN]: [ROLES.MODERATOR, ROLES.HOST, ROLES.VENDOR, ROLES.GUEST],
  [ROLES.MODERATOR]: [],
  [ROLES.WHITELABEL_ADMIN]: [
    ROLES.WHITELABEL_MODERATOR,
    ROLES.HOST,
    ROLES.VENDOR,
    ROLES.GUEST,
  ],
  [ROLES.WHITELABEL_MODERATOR]: [],
  [ROLES.HOST]: [ROLES.GUEST],
  [ROLES.VENDOR]: [],
  [ROLES.GUEST]: [],
};

/**
 * Roles that can access admin panel
 */
const ADMIN_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.MODERATOR,
  ROLES.WHITELABEL_ADMIN,
  ROLES.WHITELABEL_MODERATOR,
];

/**
 * Roles that belong to whitelabel organizations
 */
const WHITELABEL_ROLES = [ROLES.WHITELABEL_ADMIN, ROLES.WHITELABEL_MODERATOR];

/**
 * Main platform admin roles (not whitelabel)
 */
const PLATFORM_ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MODERATOR];

/**
 * Check if role is an admin role
 * @param {string} role
 * @returns {boolean}
 */
const isAdminRole = (role) => ADMIN_ROLES.includes(role);

/**
 * Check if role is a whitelabel role
 * @param {string} role
 * @returns {boolean}
 */
const isWhitelabelRole = (role) => WHITELABEL_ROLES.includes(role);

/**
 * Check if role is a platform admin (not whitelabel)
 * @param {string} role
 * @returns {boolean}
 */
const isPlatformAdmin = (role) => PLATFORM_ADMIN_ROLES.includes(role);

/**
 * Check if user role can manage target role
 * @param {string} userRole - The user's role
 * @param {string} targetRole - The target role to manage
 * @returns {boolean}
 */
const hasRoleAccess = (userRole, targetRole) => {
  if (userRole === targetRole) return true;
  return (ROLE_HIERARCHY[userRole] || []).includes(targetRole);
};

/**
 * Get all roles that a user can manage based on their role
 * @param {string} role
 * @returns {string[]}
 */
const getManageableRoles = (role) => {
  return ROLE_HIERARCHY[role] || [];
};

module.exports = {
  ROLES,
  ROLE_HIERARCHY,
  ADMIN_ROLES,
  WHITELABEL_ROLES,
  PLATFORM_ADMIN_ROLES,
  isAdminRole,
  isWhitelabelRole,
  isPlatformAdmin,
  hasRoleAccess,
  getManageableRoles,
};
