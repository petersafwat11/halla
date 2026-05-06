"use client";

import { useTranslation } from "react-i18next";
import { usePageAccess } from "@/hooks/usePageAccess";
import AdminPageHeader from "../../_components/AdminPageHeader";

export default function CategoriesPageHeader({ onAddClick }) {
  const { t } = useTranslation("admin");
  const { canCreate } = usePageAccess("template_categories");

  return (
    <AdminPageHeader
      title={t("templates.categories.header.title", "فئات القوالب")}
      subtitle={t("templates.categories.header.subtitle", "إدارة فئات القوالب")}
      addButtonTitle={canCreate ? t("templates.categories.header.addCategory", "إضافة فئة") : undefined}
      onAddButtonClick={canCreate ? onAddClick : undefined}
    />
  );
}
