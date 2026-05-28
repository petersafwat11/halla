"use client";
import React, { useState, useEffect, useRef } from "react";
import styles from "./header.module.css";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import useSidebarStore from "@/stores/sidebarStore";
import { cookieUtils } from "@/utils/cookieUtils";
import Link from "next/link";
import Image from "next/image";
import { IoIosArrowDown } from "react-icons/io";
import { FaRegUser } from "react-icons/fa";
import useAuthStore from "@/stores/authStore";
import {
  getDashboardTypeFromPath,
  getBasePath,
  DASHBOARD_TYPES,
} from "../navConfig";
import { usePathname } from "next/navigation";
import { NotificationBell } from "@/ui/layout/notifications";
import LangToggle from "@/ui/common/LangToggle";

/**
 * Global Header Component
 * Works across all dashboard types
 *
 * @param {Object} props
 * @param {string} props.dashboardType - Override dashboard type detection
 */
function Header({ dashboardType: propDashboardType }) {
  const { t } = useTranslation("home-events");
  const { setIsOpen } = useSidebarStore();
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Determine dashboard type
  const dashboardType = propDashboardType || getDashboardTypeFromPath(pathname);
  const basePath = getBasePath(dashboardType);

  useEffect(() => {
    let user = cookieUtils.getCookie("user");
    if (user) {
      setUser(JSON.parse(user));
    }
  }, []);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleProfileClick = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleLogout = async () => {
    setIsOpen(false);
    await useAuthStore.getState().logout();
    router.replace("/");
  };

  // Get role label based on dashboard type
  const getRoleLabel = () => {
    switch (dashboardType) {
      case DASHBOARD_TYPES.ADMIN:
        return t("header.adminRole", "مدير النظام");
      case DASHBOARD_TYPES.VENDOR:
        return t("header.vendorRole", "تاجر");
      case DASHBOARD_TYPES.WHITELABEL:
        return t("header.whitelabelRole", "مدير المنصة");
      case DASHBOARD_TYPES.HOST:
      default:
        return t("header.userRole", "إدارة فعاليات");
    }
  };

  const lang = pathname?.split("/")[1] === "en" ? "en" : "ar";

  return (
    <div className={styles.headerContainer}>
      <div className={styles.headerStart}>
        <button
          onClick={() => setIsOpen(true)}
          className={styles.toggleMenu}
          aria-label="Open menu"
        >
          <img src="/svg/events/menu.svg" alt="menu" />
        </button>
        <Link href={`/${lang}`} className={styles.headerLogo} aria-label="Halla">
          <Image src="/logo.png" alt="Halla" width={48} height={48} priority />
        </Link>
      </div>
      <div className={styles.iconsRow}>
        <LangToggle className={styles.langToggle} />
        <NotificationBell />

        <img
          src="/svg/events/message.svg"
          alt="messages"
          className={styles.iconDesktop}
        />

        <div className={styles.profile} ref={dropdownRef}>
          <button className={styles.profileButton} onClick={handleProfileClick}>
            <div className={styles.userInfo}>
              <div className={styles.userNameContainer}>
                <FaRegUser className={styles.userIcon} />
                <div className={styles.userName}>{user?.username}</div>
              </div>
              <div className={styles.userRole}>{getRoleLabel()}</div>
            </div>
            <div className={styles.dropdownIcon}>
              <IoIosArrowDown className={styles.arrowIcon} />
            </div>
          </button>

          {isDropdownOpen && (
            <div className={styles.dropdown}>
              <Link className={styles.menuLink} href={`/${basePath}/settings`}>
                <img
                  src="/svg/events/setting.svg"
                  alt="settings"
                  className={styles.icon}
                />
                <span>{t("sidebar.settings", "الإعدادات")}</span>
              </Link>
              <button className={styles.logoutBtn} onClick={handleLogout}>
                <span role="img" aria-label="logout">
                  <img src="/svg/events/logout.svg" alt="logout" />
                </span>
                <span>{t("sidebar.logout", "تسجيل خروج")}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Header;
