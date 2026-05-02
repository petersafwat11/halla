"use client";

import { useTranslation } from "react-i18next";
import { usePageAccess } from "@/hooks/usePageAccess";
import AdminPageHeader from "../../_components/AdminPageHeader";

export default function ModeratorsPageHeader({ onAddClick }) {
  const { t } = useTranslation("adminDashboard");
  const { canCreate } = usePageAccess("moderators");

  return (
    <AdminPageHeader
      title="إدارة المشرفين"
      subtitle="عرض وإدارة جميع المشرفين"
      addButtonTitle={canCreate ? t("moderators.addModerator", "إضافة مشرف") : undefined}
      onAddButtonClick={canCreate ? onAddClick : undefined}
    />
  );
}
