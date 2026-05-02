"use client";
import React, { useRef, useEffect } from "react";
import Sidebar from "./Sidebar";
import styles from "./sidebar.module.css";
import useSidebarStore from "@/stores/sidebarStore";

/**
 * Responsive Sidebar Component
 * Handles desktop and mobile sidebar rendering with overlay
 *
 * @param {Object} props
 * @param {string} props.dashboardType - Dashboard type to pass to Sidebar
 */
function ResponsiveSidebar({ dashboardType }) {
  const { isOpen, setIsOpen } = useSidebarStore();
  const sidebarRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, setIsOpen]);

  return (
    <>
      {/* Desktop sidebar */}
      <div className={styles.desktopContainer}>
        <Sidebar className={styles.desktopMode} dashboardType={dashboardType} />
      </div>

      {/* Mobile sidebar */}
      <div className={styles.mobileContainer}>
        {/* Mobile sidebar overlay */}
        {isOpen && (
          <div
            className={styles.mobileOverlay}
            onClick={() => setIsOpen(false)}
          />
        )}

        {/* Mobile sidebar */}
        <div
          ref={sidebarRef}
          className={`${styles.mobileSidebar} ${isOpen ? styles.active : ""}`}
        >
          <Sidebar
            className={styles.modileMode}
            dashboardType={dashboardType}
          />
        </div>
      </div>
    </>
  );
}

export default ResponsiveSidebar;
