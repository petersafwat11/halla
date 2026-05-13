"use client";

import { useAdminModerators } from "@/hooks/reactQueryHooks/useAdmin";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import StatsCards from "@/ui/host/main-page/StatsCards";
import { FaUserShield, FaUserCheck, FaUserClock, FaUserTimes } from "react-icons/fa";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";

export default function ModeratorStats() {
  const { t } = useTranslation("adminModerators");
  const searchParams = useSearchParams();

  const filters = {
    page: searchParams.get("page") || 1,
    limit: searchParams.get("limit") || 10,
    search: searchParams.get("search"),
    status: searchParams.get("status"),
    from: searchParams.get("from"),
    to: searchParams.get("to"),
  };

  const { data, isLoading } = useAdminModerators(filters);

  const statsCards = useMemo(() => {
    const moderators = data?.data?.moderators || [];
    const total = data?.data?.pagination?.total || moderators.length;
    const active = moderators.filter((m) => m.status === "active").length;
    const pending = moderators.filter((m) => m.status === "pending").length;
    const inactive = moderators.filter((m) => m.status === "inactive").length;

    return [
      {
        src: <FaUserShield style={{ color: "#9B59B6", fontSize: "2.4rem" }} />,
        alt: "total-moderators",
        title: t("moderators.stats.total", "إجمالي المشرفين"),
        value: total,
        subtitle: t("moderators.stats.allTime", "جميع الأوقات"),
      },
      {
        src: <FaUserCheck style={{ color: "#2A8C5B", fontSize: "2.4rem" }} />,
        alt: "active-moderators",
        title: t("moderators.stats.active", "المشرفين النشطين"),
        value: active,
        subtitle: t("moderators.stats.activeNow", "نشط الآن"),
      },
      {
        src: <FaUserClock style={{ color: "#D38200", fontSize: "2.4rem" }} />,
        alt: "pending-moderators",
        title: t("moderators.stats.pending", "قيد الانتظار"),
        value: pending,
        subtitle: t("moderators.stats.awaitingActivation", "في انتظار التفعيل"),
      },
      {
        src: <FaUserTimes style={{ color: "#C0392B", fontSize: "2.4rem" }} />,
        alt: "inactive-moderators",
        title: t("moderators.stats.inactive", "غير نشط"),
        value: inactive,
        subtitle: t("moderators.stats.deactivated", "معطل"),
      },
    ];
  }, [data, t]);

  if (isLoading) return null;

  return <StatsCards cards={statsCards} />;
}
