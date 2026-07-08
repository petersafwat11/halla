"use client";

import { useAdminBusinesses } from "@/hooks/admin";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import StatsCards from "@/ui/host/main-page/StatsCards";
import { FaBriefcase, FaCheckCircle, FaBan, FaRegClock } from "react-icons/fa";

export default function BusinessStats() {
  const { t } = useTranslation("adminBusinesses");
  const searchParams = useSearchParams();

  const filters = {
    page: searchParams.get("page") || 1,
    limit: searchParams.get("limit") || 10,
    search: searchParams.get("search"),
    status: searchParams.get("status"),
    from: searchParams.get("from"),
    to: searchParams.get("to"),
  };

  const { data, isLoading } = useAdminBusinesses(filters);

  const statsCards = useMemo(() => {
    const total = data?.data?.pagination?.total || 0;
    const sc = data?.data?.statusCounts || {};
    const active = sc.active || 0;
    const suspended = sc.suspended || 0;
    const inactive = sc.inactive || 0;

    return [
      {
        src: <FaBriefcase style={{ color: "#2A8C5B", fontSize: "2.4rem" }} />,
        alt: "total-businesses",
        title: t("stats.total"),
        value: total,
        subtitle: t("stats.allTime"),
      },
      {
        src: <FaCheckCircle style={{ color: "#3498DB", fontSize: "2.4rem" }} />,
        alt: "active-businesses",
        title: t("stats.active"),
        value: active,
        subtitle: t("stats.activeNow"),
      },
      {
        src: <FaBan style={{ color: "#C0392B", fontSize: "2.4rem" }} />,
        alt: "suspended-businesses",
        title: t("stats.suspended"),
        value: suspended,
        subtitle: t("stats.temporarilySuspended"),
      },
      {
        src: <FaRegClock style={{ color: "#D38200", fontSize: "2.4rem" }} />,
        alt: "inactive-businesses",
        title: t("stats.inactive"),
        value: inactive,
        subtitle: t("stats.notActivated"),
      },
    ];
  }, [data, t]);

  if (isLoading) return null;

  return <StatsCards cards={statsCards} />;
}
