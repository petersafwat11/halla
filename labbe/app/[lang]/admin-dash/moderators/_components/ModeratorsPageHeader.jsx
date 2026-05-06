"use client";

import { useTranslation } from "react-i18next";
import { usePageAccess } from "@/hooks/usePageAccess";
import AdminPageHeader from "../../_components/AdminPageHeader";

export default function ModeratorsPageHeader({ onAddClick }) {
  const { t } = useTranslation("adminModerators");
  const { canCreate } = usePageAccess("moderators");

  return (
    <AdminPageHeader
      title={t("header.title")}
      subtitle={t("header.subtitle")}
      addButtonTitle={canCreate ? t("header.addModerator") : undefined}
      onAddButtonClick={canCreate ? onAddClick : undefined}
    />
  );
}
