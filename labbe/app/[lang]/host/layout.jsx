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
      <Header dashboardType={DASHBOARD_TYPES.HOST} />
      <ResponsiveSidebar dashboardType={DASHBOARD_TYPES.HOST} />
      <div className={styles.contentWithHeader}>{children}</div>
    </div>
  );
}

export default Layout;
