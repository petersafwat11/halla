"use client";

import { useAdminEvents } from "@/hooks/admin";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { normalizeAdminFilters } from "@/utils/filterNormalizer";
import StatsCards from "@/ui/host/main-page/StatsCards";
import { FaCalendarAlt, FaCheckCircle, FaClock, FaTimesCircle } from "react-icons/fa";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";

export default function EventStats() {
  const { t } = useTranslation("adminEvents");
  const searchParams = useSearchParams();

  const filters = useMemo(() => normalizeAdminFilters(searchParams, { limit: 10 }), [searchParams]);

  const { data, isLoading } = useAdminEvents(filters);

  const statsCards = useMemo(() => {
    if (!data) return [];
    const total = data.statusCounts?.total ?? data.pagination?.total ?? 0;
    const sc = data.statusCounts || {};
    const live = sc.live || 0;
    const scheduled = sc.scheduled || 0;
    const active = sc.active !== undefined ? sc.active : (live + scheduled);
    const completed = sc.completed || 0;

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
