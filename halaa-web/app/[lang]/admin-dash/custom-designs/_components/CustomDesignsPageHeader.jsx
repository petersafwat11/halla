"use client";

import { useTranslation } from "react-i18next";
import AdminPageHeader from "../../_components/AdminPageHeader";

export default function CustomDesignsPageHeader() {
  const { t } = useTranslation("admin");

  return (
    <AdminPageHeader
      title={t("customDesigns.title", "تنفيذ التصاميم المخصصة")}
      subtitle={t("customDesigns.subtitle", "متابعة وتحديث طلبات تصاميم الدعوات المخصصة حسب اتفاقية مستوى الخدمة")}
    />
  );
}
