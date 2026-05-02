"use client";

import { useTranslation } from "react-i18next";
import AdminPageHeader from "../../_components/AdminPageHeader";

export default function DiscountsPageHeader({ onAddClick }) {
  const { t } = useTranslation("adminDashboard");

  return (
    <AdminPageHeader
      title="إدارة الخصومات والكوبونات"
      subtitle="إنشاء وإدارة أكواد الخصم للباقات"
      addButtonTitle={t("discounts.newCode", "كود جديد")}
      onAddButtonClick={onAddClick}
    />
  );
}
