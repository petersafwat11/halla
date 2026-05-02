"use client";

import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { usePageAccess } from "@/hooks/usePageAccess";
import AdminPageHeader from "../../_components/AdminPageHeader";

export default function EventsPageHeader() {
  const router = useRouter();
  const { t } = useTranslation("adminDashboard");
  const { canCreate } = usePageAccess("events");

  return (
    <AdminPageHeader
      title="إدارة المناسبات"
      subtitle="عرض وإدارة جميع المناسبات"
      addButtonTitle={canCreate ? t("events.createEvent", "إنشاء مناسبة") : undefined}
      onAddButtonClick={canCreate ? () => router.push("/admin-dash/create-event") : undefined}
    />
  );
}
