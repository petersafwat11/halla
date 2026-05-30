/**
 * User roles + hierarchy — mirror `labbe-backend-/src/shared/constants/roles.js`.
 *
 * Frontend role checks should import from here so a backend role rename
 * surfaces as a build failure rather than a silent auth bug.
 */

export const ROLES = Object.freeze({
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  MODERATOR: "moderator",
  WHITELABEL_ADMIN: "whitelabel_admin",
  WHITELABEL_MODERATOR: "whitelabel_moderator",
  HOST: "host",
  VENDOR: "vendor",
  GUEST: "guest",
});

/** Alias kept for codebases that historically used `USER_ROLES`. */
export const USER_ROLES = ROLES;

/**
 * Role hierarchy — higher roles can manage every role listed under them.
 * Mirrors backend `ROLE_HIERARCHY`.
 */
export const ROLE_HIERARCHY = Object.freeze({
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
});

export const ADMIN_ROLES = Object.freeze([
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.MODERATOR,
  ROLES.WHITELABEL_ADMIN,
  ROLES.WHITELABEL_MODERATOR,
]);

export const WHITELABEL_ROLES = Object.freeze([
  ROLES.WHITELABEL_ADMIN,
  ROLES.WHITELABEL_MODERATOR,
]);

export const PLATFORM_ADMIN_ROLES = Object.freeze([
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.MODERATOR,
]);

export const isAdminRole = (role) => ADMIN_ROLES.includes(role);
export const isWhitelabelRole = (role) => WHITELABEL_ROLES.includes(role);
export const isPlatformAdmin = (role) => PLATFORM_ADMIN_ROLES.includes(role);

export const hasRoleAccess = (userRole, targetRole) => {
  if (userRole === targetRole) return true;
  return (ROLE_HIERARCHY[userRole] || []).includes(targetRole);
};

export const getManageableRoles = (role) => ROLE_HIERARCHY[role] || [];
