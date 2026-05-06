"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useMyTickets } from "@/hooks/reactQueryHooks/useTickets";
import StatsCards from "@/ui/host/main-page/StatsCards";
import { FaTicketAlt, FaClock, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import styles from "./TicketStats.module.css";

export default function TicketStats() {
  const { t } = useTranslation("adminTickets");
  const searchParams = useSearchParams();

  const filters = useMemo(() => ({
    page: searchParams.get("page") || 1,
    limit: searchParams.get("limit") || 10,
    search: searchParams.get("search"),
    status: searchParams.get("status"),
    priority: searchParams.get("priority"),
    from: searchParams.get("from"),
    to: searchParams.get("to"),
  }), [searchParams]);

  const { data, isLoading, error } = useMyTickets(filters);

  const statsCards = useMemo(() => {
    const tickets = data?.data?.tickets || [];
    const total = data?.data?.pagination?.total || tickets.length;
    const open = tickets.filter((ticket) => ticket.status === "open").length;
    const resolved = tickets.filter(
      (ticket) => ticket.status === "resolved" || ticket.status === "closed"
    ).length;
    const highPriority = tickets.filter(
      (ticket) => ticket.priority === "high" || ticket.priority === "urgent"
    ).length;

    return [
      {
        src: <FaTicketAlt className={styles.iconBlue} />,
        alt: "total-tickets",
        title: t("stats.totalTickets"),
        value: total,
        subtitle: t("dateRange.all"),
      },
      {
        src: <FaClock className={styles.iconOrange} />,
        alt: "open-tickets",
        title: t("stats.openTickets"),
        value: open,
        subtitle: t("status.open"),
      },
      {
        src: <FaCheckCircle className={styles.iconGreen} />,
        alt: "resolved-tickets",
        title: t("stats.resolvedTickets"),
        value: resolved,
        subtitle: t("status.resolved"),
      },
      {
        src: <FaTimesCircle className={styles.iconRed} />,
        alt: "high-priority",
        title: t("priority.high"),
        value: highPriority,
        subtitle: t("priority.urgent"),
      },
    ];
  }, [data, t]);

  if (isLoading) return <SimpleLoading />;

  if (error) return null;

  return <StatsCards cards={statsCards} />;
}
