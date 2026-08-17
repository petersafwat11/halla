"use client";

import { useTranslation } from "react-i18next";
import { usePageAccess } from "@/hooks/usePageAccess";
import AdminPageHeader from "../../_components/AdminPageHeader";

export default function HostsPageHeader({ onAddClick }) {
  const { t } = useTranslation("adminHosts");
  const { canCreate } = usePageAccess("hosts");

  return (
    <AdminPageHeader
      title={t("header.title")}
      subtitle={t("header.subtitle")}
      addButtonTitle={canCreate ? t("header.addHost") : undefined}
      onAddButtonClick={canCreate ? onAddClick : undefined}
    />
  );
}
