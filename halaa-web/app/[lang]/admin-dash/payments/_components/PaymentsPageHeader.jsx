"use client";

import { useTranslation } from "react-i18next";
import AdminPageHeader from "../../_components/AdminPageHeader";

export default function PaymentsPageHeader() {
  const { t } = useTranslation("adminPayments");

  return (
    <AdminPageHeader
      title={t("header.title", "Payments")}
      subtitle={t("header.subtitle", "Manage and track all subscription payments")}
    />
  );
}
