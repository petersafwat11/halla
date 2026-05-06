"use client";

import { useAdminHosts } from "@/hooks/reactQueryHooks/useAdmin";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import StatsCards from "@/ui/host/main-page/StatsCards";
import { FaUsers, FaUserCheck, FaUserClock, FaUserTimes } from "react-icons/fa";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";

export default function HostStats() {
  const { t } = useTranslation("adminDashboard");
  const searchParams = useSearchParams();

  const filters = {
    page: searchParams.get("page") || 1,
    limit: searchParams.get("limit") || 10,
    search: searchParams.get("search"),
    status: searchParams.get("status"),
    from: searchParams.get("from"),
    to: searchParams.get("to"),
  };

  const { data, isLoading } = useAdminHosts(filters);

  const statsCards = useMemo(() => {
    const total = data?.pagination?.total || 0;
    const sc = data?.statusCounts || {};
    const active = sc.active || 0;
    const pending = sc.pending || 0;
    const suspended = sc.suspended || 0;

    return [
      {
        src: <FaUsers style={{ color: "#2A8C5B", fontSize: "2.4rem" }} />,
        alt: "total-hosts",
        title: t("hosts.stats.total", "إجمالي العملاء"),
        value: total,
        subtitle: t("hosts.stats.allTime", "جميع الأوقات"),
      },
      {
        src: <FaUserCheck style={{ color: "#3498DB", fontSize: "2.4rem" }} />,
        alt: "active-hosts",
        title: t("hosts.stats.active", "العملاء النشطين"),
        value: active,
        subtitle: t("hosts.stats.activeNow", "نشط الآن"),
      },
      {
        src: <FaUserClock style={{ color: "#D38200", fontSize: "2.4rem" }} />,
        alt: "pending-hosts",
        title: t("hosts.stats.pending", "قيد الانتظار"),
        value: pending,
        subtitle: t("hosts.stats.awaitingApproval", "في انتظار الموافقة"),
      },
      {
        src: <FaUserTimes style={{ color: "#C0392B", fontSize: "2.4rem" }} />,
        alt: "suspended-hosts",
        title: t("hosts.stats.suspended", "موقوف"),
        value: suspended,
        subtitle: t("hosts.stats.temporarilySuspended", "موقوف مؤقتاً"),
      },
    ];
  }, [data, t]);

  if (isLoading) return null;

  return <StatsCards cards={statsCards} />;
}
