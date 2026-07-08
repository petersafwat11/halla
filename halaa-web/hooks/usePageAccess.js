"use client";

import useAuthStore from "@/stores/authStore";
import {
  getPageAccessLevel,
  canEditPage,
  canDeleteOnPage,
  ACCESS_LEVELS,
} from "@/ui/layout/navConfig";

/**
 * Hook to check page access permissions for current user
 * Use this in admin dashboard pages to conditionally show/hide actions
 *
 * @param {string} pageKey - Page key from ADMIN_PAGES (e.g., 'hosts', 'events')
 * @returns {Object} Access permissions
 */
export function usePageAccess(pageKey) {
  const { user } = useAuthStore();
  const userRole = user?.role;

  if (!userRole) {
    return {
      accessLevel: ACCESS_LEVELS.NONE,
      canView: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      canExport: false,
      canEdit: false,
    };
  }

  const accessLevel = getPageAccessLevel(userRole, pageKey);
  const canEdit = canEditPage(userRole, pageKey);
  const canDelete = canDeleteOnPage(userRole, pageKey);

  return {
    accessLevel,
    canView: accessLevel !== ACCESS_LEVELS.NONE,
    canCreate:
      accessLevel === ACCESS_LEVELS.FULL || accessLevel === ACCESS_LEVELS.EDIT,
    canUpdate:
      accessLevel === ACCESS_LEVELS.FULL || accessLevel === ACCESS_LEVELS.EDIT,
    canDelete: accessLevel === ACCESS_LEVELS.FULL,
    canExport: accessLevel === ACCESS_LEVELS.FULL,
    canEdit, // Shorthand for canCreate || canUpdate
  };
}

/**
 * Example usage in a page component:
 *
 * ```jsx
 * import { usePageAccess } from "@/hooks/usePageAccess";
 * import { ADMIN_PAGES } from "@/ui/layout/navConfig";
 *
 * function HostsPage() {
 *   const { canCreate, canDelete, canExport } = usePageAccess(ADMIN_PAGES.HOSTS);
 *
 *   return (
 *     <div>
 *       {canCreate && <button>Add Host</button>}
 *       {canExport && <button>Export</button>}
 *       {canDelete && <button>Delete Selected</button>}
 *     </div>
 *   );
 * }
 * ```
 */
