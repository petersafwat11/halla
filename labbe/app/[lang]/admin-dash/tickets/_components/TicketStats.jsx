"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/new-backend/apiClient";
import { API_PATHS } from "@/services/new-backend/api.config";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import StatsCards from "@/ui/host/main-page/StatsCards";
import { FaTicketAlt, FaClock, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";

export default function TicketStats() {
  const { t } = useTranslation("adminDashboard");
  const searchParams = useSearchParams();

  const filters = {
    page: searchParams.get("page") || 1,
    limit: searchParams.get("limit") || 10,
    search: searchParams.get("search"),
    status: searchParams.get("status"),
    priority: searchParams.get("priority"),
    from: searchParams.get("from"),
    to: searchParams.get("to"),
  };

  const { data, isLoading } = useQuery({
    queryKey: ["tickets", filters],
    queryFn: () =>
      apiRequest({
        method: "GET",
        path: API_PATHS.tickets.getMyTickets,
        params: filters,
      }),
    staleTime: 5 * 60 * 1000,
  });

  const statsCards = useMemo(() => {
    const tickets = data?.data || [];
    const total = data?.pagination?.total || tickets.length;
    const open = tickets.filter((t) => t.status === "open").length;
    const resolved = tickets.filter((t) => t.status === "resolved" || t.status === "closed").length;
    const highPriority = tickets.filter((t) => t.priority === "high" || t.priority === "urgent").length;

    return [
      {
        src: <FaTicketAlt style={{ color: "#3498DB", fontSize: "2.4rem" }} />,
        alt: "total-tickets",
        title: t("tickets.stats.total", "إجمالي الشكاوى"),
        value: total,
        subtitle: t("tickets.stats.allTime", "جميع الأوقات"),
      },
      {
        src: <FaClock style={{ color: "#D38200", fontSize: "2.4rem" }} />,
        alt: "open-tickets",
        title: t("tickets.stats.open", "الشكاوى المفتوحة"),
        value: open,
        subtitle: t("tickets.stats.needsAttention", "تحتاج اهتمام"),
      },
      {
        src: <FaCheckCircle style={{ color: "#2A8C5B", fontSize: "2.4rem" }} />,
        alt: "resolved-tickets",
        title: t("tickets.stats.resolved", "محلولة"),
        value: resolved,
        subtitle: t("tickets.stats.completed", "مكتملة"),
      },
      {
        src: <FaTimesCircle style={{ color: "#C0392B", fontSize: "2.4rem" }} />,
        alt: "high-priority",
        title: t("tickets.stats.highPriority", "أولوية عالية"),
        value: highPriority,
        subtitle: t("tickets.stats.urgent", "عاجل"),
      },
    ];
  }, [data, t]);

  if (isLoading) return null;

  return <StatsCards cards={statsCards} />;
}
