"use client";

import { useTranslation } from "react-i18next";
import AdminPageHeader from "../../_components/AdminPageHeader";

export default function WhitelabelsPageHeader() {
  const { t } = useTranslation("adminWhitelabels");

  return (
    <AdminPageHeader
      title={t("header.title", "إدارة الوايت ليبل")}
      subtitle={t("header.subtitle", "عرض وإدارة تطبيقات الوايت ليبل")}
    />
  );
}
