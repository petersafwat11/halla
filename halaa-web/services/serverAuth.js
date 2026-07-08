/**
 * Server-side authentication utilities
 * For use in Server Components to check user roles and permissions
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * User roles (matching backend)
 */
export const USER_ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  MODERATOR: "moderator",
  HOST: "host",
  VENDOR: "vendor",
  GUEST: "guest",
};

/**
 * Admin pages (matching backend ADMIN_PAGES)
 */
export const ADMIN_PAGES = {
  DASHBOARD: "dashboard",
  HOSTS: "hosts",
  BUSINESSES: "businesses",
  VENDORS: "vendors",
  EVENTS: "events",
  TICKETS: "tickets",
  PAYMENTS: "payments",
  MODERATORS: "moderators",
  MANAGE_PLANS: "manage-plans",
  SETTINGS: "settings",
  // Visual templates editor + categories + Taqnyat-template
  // assignments.
  TEMPLATES: "templates",
  TEMPLATE_CATEGORIES: "template_categories",
  TAQNYAT_TEMPLATES: "taqnyat_templates",
  DISCOUNTS: "discounts",
};

/**
 * Access levels (matching backend ACCESS_LEVELS)
 * FULL = view, create, update, delete, export
 * EDIT = view, create, update (NO delete)
 * VIEW = view only
 * NONE = no access
 */
export const ACCESS_LEVELS = {
  FULL: "full",
  EDIT: "edit",
  VIEW: "view",
  NONE: "none",
};

/**
 * Admin roles that can access admin dashboard
 */
export const ADMIN_ROLES = [
  USER_ROLES.SUPER_ADMIN,
  USER_ROLES.ADMIN,
  USER_ROLES.MODERATOR,
];

/**
 * Page access by role (matching backend ROLE_PAGE_ACCESS)
 * Defines access level for each page per role
 */
export const ROLE_PAGE_ACCESS = {
  [USER_ROLES.SUPER_ADMIN]: {
    [ADMIN_PAGES.DASHBOARD]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.HOSTS]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.BUSINESSES]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.VENDORS]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.EVENTS]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.TICKETS]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.PAYMENTS]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.MODERATORS]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.MANAGE_PLANS]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.SETTINGS]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.TEMPLATES]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.TEMPLATE_CATEGORIES]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.TAQNYAT_TEMPLATES]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.DISCOUNTS]: ACCESS_LEVELS.FULL,
  },
  [USER_ROLES.ADMIN]: {
    [ADMIN_PAGES.DASHBOARD]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.HOSTS]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.BUSINESSES]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.VENDORS]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.EVENTS]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.TICKETS]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.PAYMENTS]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.MODERATORS]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.SETTINGS]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.TEMPLATES]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.TEMPLATE_CATEGORIES]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.TAQNYAT_TEMPLATES]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.DISCOUNTS]: ACCESS_LEVELS.FULL,
  },
  [USER_ROLES.MODERATOR]: {
    [ADMIN_PAGES.DASHBOARD]: ACCESS_LEVELS.VIEW,
    [ADMIN_PAGES.HOSTS]: ACCESS_LEVELS.EDIT, // Can create/update, no delete
    [ADMIN_PAGES.VENDORS]: ACCESS_LEVELS.VIEW,
    [ADMIN_PAGES.EVENTS]: ACCESS_LEVELS.EDIT, // Can create/update, no delete
    [ADMIN_PAGES.TICKETS]: ACCESS_LEVELS.FULL, // Full access for support
    [ADMIN_PAGES.PAYMENTS]: ACCESS_LEVELS.VIEW,
    [ADMIN_PAGES.MODERATORS]: ACCESS_LEVELS.NONE,
    [ADMIN_PAGES.SETTINGS]: ACCESS_LEVELS.FULL,
    [ADMIN_PAGES.TEMPLATES]: ACCESS_LEVELS.EDIT,
    [ADMIN_PAGES.TEMPLATE_CATEGORIES]: ACCESS_LEVELS.VIEW,
    [ADMIN_PAGES.TAQNYAT_TEMPLATES]: ACCESS_LEVELS.NONE,
    [ADMIN_PAGES.DISCOUNTS]: ACCESS_LEVELS.NONE,
  },
};

/**
 * Get page access level for a role
 * @param {string} role - User role
 * @param {string} page - Page from ADMIN_PAGES
 * @returns {string} Access level (full/edit/view/none)
 */
export function getPageAccessLevel(role, page) {
  const roleAccess = ROLE_PAGE_ACCESS[role];
  return roleAccess
    ? roleAccess[page] || ACCESS_LEVELS.NONE
    : ACCESS_LEVELS.NONE;
}

/**
 * Get user role from cookies (server-side)
 * @returns {string|null} User role or null if not found
 */
export async function getUserRole() {
  const cookieStore = await cookies();
  return cookieStore.get("userType")?.value || null;
}

/**
 * Get authentication token from cookies (server-side)
 * @returns {string|null} Token or null if not found
 */
export async function getToken() {
  const cookieStore = await cookies();
  return cookieStore.get("access_token")?.value || null;
}

/**
 * Check if user has access to a specific admin page
 * @param {string} pageKey - The page key (e.g., 'vendors', 'events')
 * @returns {boolean} Whether the user can access the page (any level except NONE)
 */
export async function canAccessPage(pageKey) {
  const userRole = await getUserRole();
  if (!userRole) return false;

  const accessLevel = getPageAccessLevel(userRole, pageKey);
  return accessLevel !== ACCESS_LEVELS.NONE;
}

/**
 * Get access level for current user on a page
 * @param {string} pageKey - The page key
 * @returns {string} Access level (full/edit/view/none)
 */
export async function getAccessLevel(pageKey) {
  const userRole = await getUserRole();
  if (!userRole) return ACCESS_LEVELS.NONE;
  return getPageAccessLevel(userRole, pageKey);
}

/**
 * Check if user can perform a specific action on a page
 * @param {string} pageKey - The page key
 * @param {string} action - 'view' | 'create' | 'update' | 'delete' | 'export'
 * @returns {boolean}
 */
export async function canPerformAction(pageKey, action) {
  const accessLevel = await getAccessLevel(pageKey);

  if (accessLevel === ACCESS_LEVELS.NONE) return false;
  if (action === "view") return true;

  // Delete/Export require FULL access
  if (action === "delete" || action === "export") {
    return accessLevel === ACCESS_LEVELS.FULL;
  }

  // Create/Update require FULL or EDIT access
  if (action === "create" || action === "update") {
    return (
      accessLevel === ACCESS_LEVELS.FULL || accessLevel === ACCESS_LEVELS.EDIT
    );
  }

  return false;
}

/**
 * Check if user can edit (create/update) on a page
 * @param {string} pageKey - The page key
 * @returns {boolean}
 */
export async function canEdit(pageKey) {
  const accessLevel = await getAccessLevel(pageKey);
  return (
    accessLevel === ACCESS_LEVELS.FULL || accessLevel === ACCESS_LEVELS.EDIT
  );
}

/**
 * Check if user can delete on a page
 * @param {string} pageKey - The page key
 * @returns {boolean}
 */
export async function canDelete(pageKey) {
  const accessLevel = await getAccessLevel(pageKey);
  return accessLevel === ACCESS_LEVELS.FULL;
}

/**
 * Require access to a specific page, redirect if unauthorized
 * Use this at the top of server components to protect pages
 * @param {string} pageKey - The page key to check access for
 * @param {string} lang - The language for redirect URL
 */
export async function requirePageAccess(pageKey, lang = "ar") {
  const hasAccess = await canAccessPage(pageKey);

  if (!hasAccess) {
    // Redirect to admin dashboard if no access
    redirect(`/${lang}/admin-dash`);
  }
}

/**
 * Check if current user is a super admin
 * @returns {boolean}
 */
export async function isSuperAdmin() {
  const userRole = await getUserRole();
  return userRole === USER_ROLES.SUPER_ADMIN;
}

/**
 * Check if current user is any admin role
 * @returns {boolean}
 */
export async function isAdminUser() {
  const userRole = await getUserRole();
  return ADMIN_ROLES.includes(userRole);
}
