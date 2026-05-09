"use client";

import { useTranslation } from "react-i18next";
import AdminPageHeader from "../../_components/AdminPageHeader";

export default function TaqnyatTemplatesHeader() {
  const { t } = useTranslation("admin");

  return (
    <AdminPageHeader
      title={t("taqnyat.title")}
      subtitle={t("taqnyat.subtitle")}
    />
  );
}
