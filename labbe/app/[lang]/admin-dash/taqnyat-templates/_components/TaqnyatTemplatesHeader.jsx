"use client";

import { useTranslation } from "react-i18next";
import { usePageAccess } from "@/hooks/usePageAccess";
import AdminPageHeader from "../../_components/AdminPageHeader";

export default function TaqnyatTemplatesHeader() {
  const { t } = useTranslation("admin");
  const { canUpdate } = usePageAccess("taqnyat_templates");

  return (
    <AdminPageHeader
      title={t("taqnyat.title")}
      subtitle={t("taqnyat.subtitle")}
    />
  );
}
