"use client";

import { useTranslation } from "react-i18next";
import AdminPageHeader from "./AdminPageHeader";

export default function DashboardPageHeader({ lang }) {
  const { t } = useTranslation("adminDashboard");

  return (
    <AdminPageHeader
      title={t("header.pageTitle", "Admin Dashboard")}
      subtitle={t("header.pageSubtitle", "Overview of your platform performance")}
    />
  );
}
