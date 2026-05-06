"use client";

import { useRouter, useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { usePageAccess } from "@/hooks/usePageAccess";
import AdminPageHeader from "../../_components/AdminPageHeader";

export default function EventsPageHeader() {
  const router = useRouter();
  const { lang } = useParams();
  const { t } = useTranslation("adminDashboard");
  const { canCreate } = usePageAccess("events");

  return (
    <AdminPageHeader
      title={t("events.title", "إدارة المناسبات")}
      subtitle={t("events.subtitle", "عرض وإدارة جميع المناسبات")}
      addButtonTitle={canCreate ? t("events.createEvent", "إنشاء مناسبة") : undefined}
      onAddButtonClick={canCreate ? () => router.push(`/${lang}/admin-dash/create-event`) : undefined}
    />
  );
}
