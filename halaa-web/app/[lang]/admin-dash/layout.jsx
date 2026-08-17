"use client";
import React from "react";
import { useParams } from "next/navigation";
import { Header, ResponsiveSidebar, DASHBOARD_TYPES } from "@/ui/layout";
import styles from "./layout.module.css";

function Layout({ children }) {
  const { lang } = useParams();
  const isRTL = lang === "ar";

  return (
    <div className={styles.layoutContainer} dir={isRTL ? "rtl" : "ltr"}>
      <Header dashboardType={DASHBOARD_TYPES.ADMIN} />
      <ResponsiveSidebar dashboardType={DASHBOARD_TYPES.ADMIN} />
      <div className={styles.contentWithHeader}>
        <div className="w-full p-2">{children}</div>
      </div>
    </div>
  );
}

export default Layout;
