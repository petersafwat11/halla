"use client";

import { useAdminDashboard } from "@/hooks/admin";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import StatsCards from "@/ui/host/main-page/StatsCards";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import {
  FaUsers,
  FaStore,
  FaCalendarAlt,
  FaUserCheck,
  FaTicketAlt,
  FaCalendarCheck,
  FaUserFriends,
} from "react-icons/fa";
import { normalizeDashboardFilters } from "@/utils/filterNormalizer";
import styles from "./DashboardStats.module.css";

const ICON_COLORS = {
  users: "#2A8C5B",
  store: "#C28E5C",
  calendar: "#3498DB",
  "calendar-check": "#2A8C5B",
  "credit-card": "#9B59B6",
  ticket: "#D38200",
  guests: "#9B59B6",
};

function getIconElement(iconKey) {
  const iconComponents = {
    users: FaUsers,
    store: FaStore,
    calendar: FaCalendarAlt,
    "calendar-check": FaCalendarCheck,
    "credit-card": FaUserCheck,
    ticket: FaTicketAlt,
    guests: FaUserFriends,
  };
  const Icon = iconComponents[iconKey] || FaUsers;
  return (
    <span className={styles.statIcon} style={{ color: ICON_COLORS[iconKey] }}>
      <Icon />
    </span>
  );
}

export default function DashboardStats() {
  const { t } = useTranslation("adminDashboard");
  const searchParams = useSearchParams();

  const filters = useMemo(() => normalizeDashboardFilters(searchParams, { period: "month" }), [searchParams]);

  const { data: responseData, isLoading, error } = useAdminDashboard(filters);
  const data = responseData?.data;

  const statsCards = useMemo(() => {
    const backendCards = data?.statsCards || [];

    return backendCards.map((card) => ({
      id: card.id,
      src: getIconElement(card.icon),
      alt: card.id,
      title: t(card.titleKey),
      value: card.value,
      subtitle: card.subtitle
        ? t(card.subtitle.labelKey, { count: card.subtitle.count })
        : "",
      highlight: card.highlight
        ? t(card.highlight.labelKey, { count: card.highlight.count })
        : null,
    }));
  }, [data, t]);

  if (isLoading) return <SimpleLoading />;

  if (error) {
    return (
      <div className={styles.error}>
        <p>{t("errors.loadFailed", "Failed to load dashboard stats")}</p>
      </div>
    );
  }

  return <StatsCards cards={statsCards} />;
}
