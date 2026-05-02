"use client";

import { useTranslation } from "react-i18next";
import { usePageAccess } from "@/hooks/usePageAccess";
import AdminPageHeader from "../../_components/AdminPageHeader";

export default function HostsPageHeader({ onAddClick }) {
  const { t } = useTranslation("adminDashboard");
  const { canCreate } = usePageAccess("hosts");

  return (
    <AdminPageHeader
      title="إدارة المضيفين"
      subtitle="عرض وإدارة جميع المضيفين"
      addButtonTitle={canCreate ? t("hosts.addHost", "إضافة مضيف") : undefined}
      onAddButtonClick={canCreate ? onAddClick : undefined}
    />
  );
}
