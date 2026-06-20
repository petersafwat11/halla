/**
 * Navigation configuration for different dashboard types
 * Each dashboard type has its own set of navigation items
 * Supports role-based filtering for admin and moderator users
 */

import {
  IoGrid,
  IoCalendar,
  IoCard,
  IoTicket,
  IoCube,
  IoStorefront,
  IoSettings,
  IoPeople,
  IoPersonAdd,
  IoBriefcase,
  IoBusiness,
  IoPricetag,
  IoGift,
  IoImagesOutline,
  IoPricetagsOutline,
  IoChatbubblesOutline,
} from "react-icons/io5";
import {
  USER_ROLES,
  ADMIN_ROLES,
  isAdminRole,
} from "@halla/shared/constants/roles";
import { ACCESS_LEVELS } from "@halla/shared/constants/permissions";

/**
 * Role enums, hierarchy helpers, and access levels come from
 * `@halla/shared/constants` (mirror of backend). Re-exported here so
 * existing consumer imports `from "@/ui/layout/navConfig"` continue to
 * work without churn.
 */
export { USER_ROLES, ADMIN_ROLES, isAdminRole, ACCESS_LEVELS };

/**
 * Dashboard types
 */
export const DASHBOARD_TYPES = {
  HOST: "host",
  ADMIN: "admin",
  VENDOR: "vendor",
};

/**
 * Navigation items for Host dashboard
 */
export const hostNavItems = [
  {
    key: "dashboard",
    path: "/host",
    icon: IoGrid,
    labelKey: "sidebar.dashboard",
    defaultLabel: "لوحة التحكم",
    exactMatch: true,
  },
  {
    key: "events",
    path: "/host/events",
    icon: IoCalendar,
    labelKey: "sidebar.events",
    defaultLabel: "المناسبات",
  },
  {
    key: "payments",
    path: "/host/payments",
    icon: IoCard,
    labelKey: "sidebar.payments",
    defaultLabel: "المدفوعات",
  },
  {
    key: "tickets",
    path: "/host/tickets",
    icon: IoTicket,
    labelKey: "sidebar.tickets",
    defaultLabel: "الشكاوى",
  },
  {
    key: "plans",
    path: "/host/plans",
    icon: IoCube,
    labelKey: "sidebar.plans",
    defaultLabel: "الخدمات",
  },
  {
    key: "shop",
    path: "/host/market-place",
    icon: IoStorefront,
    labelKey: "sidebar.shop",
    defaultLabel: "سوق هلا",
  },
  {
    key: "settings",
    path: "/host/settings",
    icon: IoSettings,
    labelKey: "sidebar.settings",
    defaultLabel: "الإعدادات",
  },
];

/**
 * Navigation items for Admin dashboard
 */
export const adminNavItems = [
  {
    key: "dashboard",
    path: "/admin-dash",
    icon: IoGrid,
    labelKey: "adminSidebar.dashboard",
    defaultLabel: "لوحة التحكم",
    exactMatch: true,
  },
  {
    key: "moderators",
    path: "/admin-dash/moderators",
    icon: IoPeople,
    labelKey: "adminSidebar.moderators",
    defaultLabel: "المديرون",
  },
  {
    key: "hosts",
    path: "/admin-dash/hosts",
    icon: IoPersonAdd,
    labelKey: "adminSidebar.hosts",
    defaultLabel: "المضيفون",
  },
  {
    key: "businesses",
    path: "/admin-dash/businesses",
    icon: IoBriefcase,
    labelKey: "adminSidebar.businesses",
    defaultLabel: "حسابات الأعمال",
  },
  {
    key: "vendors",
    path: "/admin-dash/vendors",
    icon: IoBusiness,
    labelKey: "adminSidebar.vendors",
    defaultLabel: "التجار",
  },
  {
    key: "events",
    path: "/admin-dash/events",
    icon: IoCalendar,
    labelKey: "adminSidebar.events",
    defaultLabel: "المناسبات",
  },
  {
    key: "tickets",
    path: "/admin-dash/tickets",
    icon: IoTicket,
    labelKey: "adminSidebar.tickets",
    defaultLabel: "الشكاوى",
  },
  {
    key: "payments",
    path: "/admin-dash/payments",
    icon: IoCard,
    labelKey: "adminSidebar.payments",
    defaultLabel: "المدفوعات",
  },
  {
    key: "manage-plans",
    path: "/admin-dash/manage-plans",
    icon: IoPricetag,
    labelKey: "adminSidebar.managePlans",
    defaultLabel: "إدارة الأسعار",
    superAdminOnly: true,
  },
  {
    key: "discounts",
    path: "/admin-dash/discounts",
    icon: IoGift,
    labelKey: "adminSidebar.discounts",
    defaultLabel: "الخصومات",
  },
  {
    key: "settings",
    path: "/admin-dash/settings",
    icon: IoSettings,
    labelKey: "adminSidebar.settings",
    defaultLabel: "الإعدادات",
  },
  // Phase 4c W1-VISUAL — visual templates editor + categories
  {
    key: "templates",
    path: "/admin-dash/templates",
    icon: IoImagesOutline,
    labelKey: "adminSidebar.templates",
    defaultLabel: "قوالب الدعوات",
    exactMatch: true,
  },
  {
    key: "template_categories",
    path: "/admin-dash/templates/categories",
    icon: IoPricetagsOutline,
    labelKey: "adminSidebar.templateCategories",
    defaultLabel: "فئات القوالب",
  },
  // Phase 4c W1-TAQNYAT-ADMIN — Taqnyat-template assignments
  {
    key: "taqnyat_templates",
    path: "/admin-dash/taqnyat-templates",
    icon: IoChatbubblesOutline,
    labelKey: "adminSidebar.taqnyatTemplates",
    defaultLabel: "قوالب واتساب",
  },
];

/**
 * Navigation items for Vendor dashboard
 * Includes services, marketplace, tickets, and settings
 */
export const vendorNavItems = [
  {
    key: "services",
    path: "/vendor-dashboard",
    icon: IoCube,
    labelKey: "vendorSidebar.services",
    defaultLabel: "الخدمات",
    exactMatch: true,
  },
  {
    key: "marketplace",
    path: "/market-place",
    icon: IoStorefront,
    labelKey: "vendorSidebar.marketplace",
    defaultLabel: "سوق هلا",
  },
  {
    key: "tickets",
    path: "/vendor-dashboard/tickets",
    icon: IoTicket,
    labelKey: "vendorSidebar.tickets",
    defaultLabel: "الشكاوى",
  },
  {
    key: "settings",
    path: "/vendor-dashboard/settings",
    icon: IoSettings,
    labelKey: "vendorSidebar.settings",
    defaultLabel: "الإعدادات",
  },
];

/**
 * Nav items accessible by each role in admin-dash
 * Synced with backend ROLE_PAGE_ACCESS
 * - super_admin: All items (full access)
 * - admin: All items (full access)
 * - moderator: dashboard(view), hosts(edit), vendors(view), events(edit), tickets(full), payments(view)
 */
const ROLE_NAV_ACCESS = {
  [USER_ROLES.SUPER_ADMIN]: [
    "dashboard",
    "moderators",
    "hosts",
    "businesses",
    "vendors",
    "events",
    "tickets",
    "payments",
    "manage-plans",
    "discounts",
    "settings",
    // Phase 4c W1-VISUAL + W1-TAQNYAT-ADMIN
    "templates",
    "template_categories",
    "taqnyat_templates",
  ],
  [USER_ROLES.ADMIN]: [
    "dashboard",
    "moderators",
    "hosts",
    "businesses",
    "vendors",
    "events",
    "tickets",
    "payments",
    "discounts",
    "settings",
    // Phase 4c W1-VISUAL + W1-TAQNYAT-ADMIN
    "templates",
    "template_categories",
    "taqnyat_templates",
  ],
  [USER_ROLES.MODERATOR]: [
    "dashboard",
    "hosts", // EDIT access (create/update, no delete)
    "vendors", // VIEW access
    "events", // EDIT access (create/update, no delete)
    "tickets", // FULL access
    "payments", // VIEW access
    "discounts", // FULL access
    "settings",
    // Phase 4c W1-VISUAL — moderator gets EDIT on templates, VIEW on categories
    "templates",
    "template_categories",
  ],
};

/**
 * Page access levels by role (matching backend ROLE_PAGE_ACCESS)
 */
export const ROLE_PAGE_ACCESS = {
  [USER_ROLES.SUPER_ADMIN]: {
    dashboard: ACCESS_LEVELS.FULL,
    hosts: ACCESS_LEVELS.FULL,
    businesses: ACCESS_LEVELS.FULL,
    vendors: ACCESS_LEVELS.FULL,
    events: ACCESS_LEVELS.FULL,
    tickets: ACCESS_LEVELS.FULL,
    payments: ACCESS_LEVELS.FULL,
    moderators: ACCESS_LEVELS.FULL,
    "manage-plans": ACCESS_LEVELS.FULL,
    discounts: ACCESS_LEVELS.FULL,
    settings: ACCESS_LEVELS.FULL,
    templates: ACCESS_LEVELS.FULL,
    template_categories: ACCESS_LEVELS.FULL,
    taqnyat_templates: ACCESS_LEVELS.FULL,
  },
  [USER_ROLES.ADMIN]: {
    dashboard: ACCESS_LEVELS.FULL,
    hosts: ACCESS_LEVELS.FULL,
    businesses: ACCESS_LEVELS.FULL,
    vendors: ACCESS_LEVELS.FULL,
    events: ACCESS_LEVELS.FULL,
    tickets: ACCESS_LEVELS.FULL,
    payments: ACCESS_LEVELS.FULL,
    moderators: ACCESS_LEVELS.FULL,
    "manage-plans": ACCESS_LEVELS.NONE,
    discounts: ACCESS_LEVELS.FULL,
    settings: ACCESS_LEVELS.FULL,
    templates: ACCESS_LEVELS.FULL,
    template_categories: ACCESS_LEVELS.FULL,
    taqnyat_templates: ACCESS_LEVELS.FULL,
  },
  [USER_ROLES.MODERATOR]: {
    dashboard: ACCESS_LEVELS.VIEW,
    hosts: ACCESS_LEVELS.EDIT,
    vendors: ACCESS_LEVELS.VIEW,
    events: ACCESS_LEVELS.EDIT,
    tickets: ACCESS_LEVELS.FULL,
    payments: ACCESS_LEVELS.VIEW,
    moderators: ACCESS_LEVELS.NONE,
    "manage-plans": ACCESS_LEVELS.NONE,
    discounts: ACCESS_LEVELS.FULL,
    settings: ACCESS_LEVELS.VIEW,
    templates: ACCESS_LEVELS.EDIT,
    template_categories: ACCESS_LEVELS.VIEW,
    taqnyat_templates: ACCESS_LEVELS.NONE,
  },
};

/**
 * Get page access level for a role
 * @param {string} role - User role
 * @param {string} pageKey - Page key
 * @returns {string} Access level
 */
export const getPageAccessLevel = (role, pageKey) => {
  const roleAccess = ROLE_PAGE_ACCESS[role];
  return roleAccess
    ? roleAccess[pageKey] || ACCESS_LEVELS.NONE
    : ACCESS_LEVELS.NONE;
};

/**
 * Check if role can edit (create/update) on a page
 * @param {string} role - User role
 * @param {string} pageKey - Page key
 * @returns {boolean}
 */
export const canEditPage = (role, pageKey) => {
  const access = getPageAccessLevel(role, pageKey);
  return access === ACCESS_LEVELS.FULL || access === ACCESS_LEVELS.EDIT;
};

/**
 * Check if role can delete on a page
 * @param {string} role - User role
 * @param {string} pageKey - Page key
 * @returns {boolean}
 */
export const canDeleteOnPage = (role, pageKey) => {
  const access = getPageAccessLevel(role, pageKey);
  return access === ACCESS_LEVELS.FULL;
};

/**
 * Permission to nav key mapping (LEGACY - kept for backward compatibility)
 * Maps backend permissions to nav item keys
 * @deprecated Permissions are now determined by ROLE_PAGE_ACCESS
 */
const PERMISSION_TO_NAV_KEY = {
  manage_hosts: "hosts",
  manage_vendors: "vendors",
  manage_events: "events",
  manage_tickets: "tickets",
  manage_payments: "payments",
  manage_moderators: "moderators",
};

/**
 * Get navigation items filtered by user role
 * Uses ROLE_PAGE_ACCESS to determine which pages to show
 * @param {string} userRole - The user's role
 * @param {Array} userPermissions - DEPRECATED: No longer used, access is role-based
 * @returns {Array} Filtered navigation items for the admin dashboard
 */
export const getNavItemsForRole = (userRole, userPermissions = []) => {
  // Get base nav keys for the role
  const allowedKeys = ROLE_NAV_ACCESS[userRole] || [];

  // Filter admin nav items based on role access
  return adminNavItems.filter((item) => {
    // Super admin only items
    if (item.superAdminOnly && userRole !== USER_ROLES.SUPER_ADMIN) {
      return false;
    }

    // Check if key is in the allowed list
    if (!allowedKeys.includes(item.key)) {
      return false;
    }

    // Check if role has any access to this page (not NONE)
    const pageAccess = getPageAccessLevel(userRole, item.key);
    if (pageAccess === ACCESS_LEVELS.NONE) {
      return false;
    }

    return true;
  });
};

/**
 * Check if a user role can access a specific admin page
 * @param {string} userRole - The user's role
 * @param {string} pageKey - The page key (e.g., 'vendors', 'events')
 * @param {Array} userPermissions - Optional array of user permissions
 * @returns {boolean} Whether the user can access the page
 */
export const canAccessPage = (userRole, pageKey, userPermissions = []) => {
  // Get base allowed keys for the role
  let allowedKeys = [...(ROLE_NAV_ACCESS[userRole] || [])];

  // For moderator roles, add keys based on permissions
  if (userRole === USER_ROLES.MODERATOR) {
    userPermissions.forEach((permission) => {
      const navKey = PERMISSION_TO_NAV_KEY[permission];
      if (navKey && !allowedKeys.includes(navKey)) {
        allowedKeys.push(navKey);
      }
    });
  }

  return allowedKeys.includes(pageKey);
};

/**
 * Get navigation items based on dashboard type
 * @param {string} dashboardType - The type of dashboard
 * @param {string} userRole - Optional user role for role-based filtering in admin dashboard
 * @param {Array} userPermissions - Optional array of user permissions for moderators
 * @returns {Array} Navigation items for the specified dashboard
 */
export const getNavItems = (
  dashboardType,
  userRole = null,
  userPermissions = [],
) => {
  switch (dashboardType) {
    case DASHBOARD_TYPES.HOST:
      return hostNavItems;
    case DASHBOARD_TYPES.ADMIN:
      // If user role is provided, filter nav items by role and permissions
      if (userRole && isAdminRole(userRole)) {
        return getNavItemsForRole(userRole, userPermissions);
      }
      return adminNavItems;
    case DASHBOARD_TYPES.VENDOR:
      return vendorNavItems;
    default:
      return hostNavItems;
  }
};

/**
 * Get dashboard type from pathname
 * @param {string} pathname - Current pathname
 * @returns {string} Dashboard type
 */
export const getDashboardTypeFromPath = (pathname) => {
  const cleanPath = pathname.split("/").filter(Boolean);

  // Skip language segment if present (e.g., 'en', 'ar')
  const dashSegment =
    cleanPath.length > 1 && cleanPath[0].length === 2
      ? cleanPath[1]
      : cleanPath[0];

  if (dashSegment === "admin-dash") {
    return DASHBOARD_TYPES.ADMIN;
  }
  if (dashSegment === "vendor-dashboard") {
    return DASHBOARD_TYPES.VENDOR;
  }
  if (dashSegment === "host") {
    return DASHBOARD_TYPES.HOST;
  }

  return DASHBOARD_TYPES.HOST;
};

/**
 * Get base path for dashboard type
 * @param {string} dashboardType - Dashboard type
 * @returns {string} Base path
 */
export const getBasePath = (dashboardType) => {
  switch (dashboardType) {
    case DASHBOARD_TYPES.ADMIN:
      return "admin-dash";
    case DASHBOARD_TYPES.VENDOR:
      return "vendor-dashboard";
    case DASHBOARD_TYPES.HOST:
    default:
      return "host";
  }
};

/**
 * Check if a nav item is active based on current path
 * @param {Object} item - Navigation item
 * @param {string} currentPath - Current pathname (without language prefix)
 * @returns {boolean} Whether the item is active
 */
export const isNavItemActive = (item, currentPath) => {
  if (item.exactMatch) {
    return currentPath === item.path.slice(1); // Remove leading slash
  }
  return currentPath.startsWith(item.path.slice(1));
};
