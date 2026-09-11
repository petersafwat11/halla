"use client";

import { useTranslation } from "react-i18next";
import AdminPageHeader from "../../_components/AdminPageHeader";

export default function PaymentsPageHeader({ wholeDays = false }) {
  const { t } = useTranslation("adminPayments");

  return (
    <AdminPageHeader
      wholeDays={wholeDays}
      title={t("header.title", "Payments")}
      subtitle={t("header.subtitle", "Track transactions, payment links, and refunds")}
    />
  );
}
