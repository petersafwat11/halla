"use client";

import { useTranslation } from "react-i18next";
import AdminPageHeader from "../../_components/AdminPageHeader";

export default function TicketsPageHeader() {
  const { t } = useTranslation("adminTickets");

  return (
    <AdminPageHeader
      title={t("header.title")}
      subtitle={t("header.subtitle")}
    />
  );
}
