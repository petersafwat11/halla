"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import StatsCards from "@/ui/host/main-page/StatsCards";
import { FaCalendarAlt, FaCheckCircle, FaClock, FaTimesCircle } from "react-icons/fa";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";

export default function EventStats() {
  const { t } = useTranslation("adminEvents");
  const searchParams = useSearchParams();

  const filters = useMemo(() => ({
    page: searchParams.get("page") || 1,
    limit: searchParams.get("limit") || 10,
    search: searchParams.get("search"),
    status: searchParams.get("status"),
    from: searchParams.get("from"),
    to: searchParams.get("to"),
  }), [searchParams]);

  const { data, isLoading } = useQuery({
    queryKey: ["events", "admin", filters],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.events.getAllEvents,
        params: filters,
      }),
    staleTime: 5 * 60 * 1000,
  });

  const statsCards = useMemo(() => {
    if (!data?.data || !data?.pagination) return [];
    const events = data.data;
    const total = data.pagination.total;
    const active = events.filter((e) => e.status === "live" || e.status === "scheduled").length;
    const scheduled = events.filter((e) => e.status === "scheduled").length;
    const completed = events.filter((e) => e.status === "completed").length;

    return [
      {
        src: <FaCalendarAlt style={{ color: "#3498DB", fontSize: "2.4rem" }} />,
        alt: "total-events",
        title: t("events.stats.total", "إجمالي المناسبات"),
        value: total,
        subtitle: t("events.stats.allTime", "جميع الأوقات"),
      },
      {
        src: <FaCheckCircle style={{ color: "#2A8C5B", fontSize: "2.4rem" }} />,
        alt: "active-events",
        title: t("events.stats.active", "المناسبات النشطة"),
        value: active,
        subtitle: t("events.stats.liveNow", "مباشر الآن"),
      },
      {
        src: <FaClock style={{ color: "#D38200", fontSize: "2.4rem" }} />,
        alt: "scheduled-events",
        title: t("events.stats.scheduled", "مجدولة"),
        value: scheduled,
        subtitle: t("events.stats.upcoming", "قادمة"),
      },
      {
        src: <FaTimesCircle style={{ color: "#95a5a6", fontSize: "2.4rem" }} />,
        alt: "completed-events",
        title: t("events.stats.completed", "منتهية"),
        value: completed,
        subtitle: t("events.stats.finished", "انتهت"),
      },
    ];
  }, [data, t]);

  if (isLoading) return null;

  return <StatsCards cards={statsCards} />;
}
