"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useMyTickets } from "@/hooks/tickets";
import { normalizeTicketsFilters } from "@/utils/filterNormalizer";
import StatsCards from "@/ui/host/main-page/StatsCards";
import { FaTicketAlt, FaClock, FaCheckCircle } from "react-icons/fa";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import styles from "./TicketStats.module.css";

export default function TicketStats() {
  const { t } = useTranslation("adminTickets");
  const searchParams = useSearchParams();

  const filters = useMemo(() => normalizeTicketsFilters(searchParams, { limit: 10 }), [searchParams]);

  const { data, isLoading, error } = useMyTickets(filters);

  const statsCards = useMemo(() => {
    const total = data?.pagination?.total || 0;
    const sc = data?.statusCounts || {};
    const open = sc.open || 0;
    const resolved = (sc.resolved || 0) + (sc.closed || 0);

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
    ];
  }, [data, t]);

  if (isLoading) return <SimpleLoading />;

  if (error) return null;

  return <StatsCards cards={statsCards} />;
}
