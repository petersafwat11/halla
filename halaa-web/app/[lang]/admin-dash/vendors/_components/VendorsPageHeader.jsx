"use client";

import { useTranslation } from "react-i18next";
import AdminPageHeader from "../../_components/AdminPageHeader";

export default function VendorsPageHeader() {
  const { t } = useTranslation("adminVendors");

  return (
    <AdminPageHeader
      title={t("header.title", "إدارة التجار")}
      subtitle={t("header.subtitle", "عرض وإدارة جميع التجار")}
    />
  );
}
