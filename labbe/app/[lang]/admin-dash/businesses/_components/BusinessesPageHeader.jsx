"use client";

import { useTranslation } from "react-i18next";
import { usePageAccess } from "@/hooks/usePageAccess";
import AdminPageHeader from "../../_components/AdminPageHeader";

export default function BusinessesPageHeader({ onAddClick }) {
  const { t } = useTranslation("adminBusinesses");
  const { canCreate } = usePageAccess("businesses");

  return (
    <AdminPageHeader
      title={t("header.title")}
      subtitle={t("header.subtitle")}
      addButtonTitle={canCreate ? t("header.addBusiness") : undefined}
      onAddButtonClick={canCreate ? onAddClick : undefined}
    />
  );
}
