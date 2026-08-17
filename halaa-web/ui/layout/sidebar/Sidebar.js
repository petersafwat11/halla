"use client";
import React from "react";
import styles from "./sidebar.module.css";
import { useTranslation } from "react-i18next";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import useSidebarStore from "@/stores/sidebarStore";
import useAuthStore from "@/stores/authStore";
import PlanBox from "@/ui/commen/planBox/PlanBox";
import { IoLogOut } from "react-icons/io5";
import {
  getNavItems,
  getDashboardTypeFromPath,
  isNavItemActive,
  DASHBOARD_TYPES,
} from "../navConfig";

/**
 * Global Sidebar Component
 * Dynamically renders navigation items based on dashboard type and user role
 *
 * @param {Object} props
 * @param {string} props.className - Additional CSS class
 * @param {string} props.dashboardType - Override dashboard type detection
 */
function Sidebar({ className, dashboardType: propDashboardType }) {
  const { setIsOpen } = useSidebarStore();
  const { user } = useAuthStore();
  const { t } = useTranslation("home-events");
  const { t: tCommon } = useTranslation("common");
  const router = useRouter();
  const pathname = usePathname();

  // Determine dashboard type from props or pathname
  const dashboardType = propDashboardType || getDashboardTypeFromPath(pathname);

  // Get user role and permissions for role-based nav filtering
  const userRole = user?.role || null;
  const userPermissions = user?.permissions || [];

  // Get navigation items for this dashboard type, filtered by user role and permissions
  const navItems = getNavItems(dashboardType, userRole, userPermissions);

  // Get clean path without language prefix for active state checking
  const lang = pathname?.split("/")[1] === "en" ? "en" : "ar";
  const cleanPath = pathname
    .split("/")
    .slice(2, pathname.split("/").length)
    .join("/");

  const handleLogout = async () => {
    setIsOpen(false);
    await useAuthStore.getState().logout();
    router.replace(`/${lang}/login`);
  };

  // Get translation based on dashboard type
  const getTranslation = (labelKey, defaultLabel) => {
    // Try common namespace first for admin-related keys
    if (
      labelKey.startsWith("adminSidebar.") ||
      labelKey.startsWith("vendorSidebar.")
    ) {
      return tCommon(labelKey, defaultLabel);
    }
    return t(labelKey, defaultLabel);
  };

  // Check if item is active
  // Determine if we should show the plan box (only for host dashboard)
  const showPlanBox = dashboardType === DASHBOARD_TYPES.HOST;

  return (
    <div className={`${styles.sidebarContainer} ${className || ""}`}>
      <button
        className={styles.closeBtn}
        onClick={() => setIsOpen(false)}
        aria-label="Close menu"
      >
        <img src="/svg/events/close-circle.svg" alt="close" />
      </button>

      <div className={styles.body}>
        <nav className={styles.menu}>
          <ul>
            {navItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = isNavItemActive(item, cleanPath);

              return (
                <li key={item.key}>
                  <Link
                    className={`${styles.menuLink} ${
                      isActive ? styles.active : ""
                    }`}
                    href={`/${lang}${item.path}`}
                    onClick={() => setIsOpen(false)}
                  >
                    <IconComponent className={styles.icon} />
                    <span>
                      {getTranslation(item.labelKey, item.defaultLabel)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className={styles.footer}>
        {/* {showPlanBox && (
          <PlanBox
            title={t("sidebar.freePlan", "خطة مجانية")}
            description={t(
              "sidebar.freePlanDesc",
              "اشترك لإرسال دعوات غير محدودة"
            )}
            buttonText={t("sidebar.upgradeNow", "ترقية الآن")}
          />
        )} */}
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <IoLogOut className={styles.icon} />
          <span>{t("sidebar.logout", "تسجيل خروج")}</span>
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
