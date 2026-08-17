/**
 * Global Layout Components
 * Export all layout components for easy import
 */

export { default as Sidebar } from "./sidebar/Sidebar";
export { default as ResponsiveSidebar } from "./sidebar/ResponsiveSidebar";
export { default as Header } from "./header/Header";
export {
  DASHBOARD_TYPES,
  USER_ROLES,
  ADMIN_ROLES,
  isAdminRole,
  getNavItems,
  getNavItemsForRole,
  canAccessPage,
  getDashboardTypeFromPath,
  getBasePath,
  isNavItemActive,
  hostNavItems,
  adminNavItems,
  vendorNavItems,
} from "./navConfig";
