"use client";

import { useAdminDashboard } from "@/hooks/admin";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import StatsCards from "@/ui/host/main-page/StatsCards";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import useAuthStore from "@/stores/authStore";
import {
  FaUsers,
  FaStore,
  FaCalendarAlt,
  FaUserCheck,
  FaTicketAlt,
  FaCalendarCheck,
  FaUserFriends,
} from "react-icons/fa";
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
  const { user } = useAuthStore();

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const filters = {
    period: searchParams.get("period") || "month",
    ...(from && { from }),
    ...(to && { to }),
  };

  const { data: responseData, isLoading, error } = useAdminDashboard(filters);
  const data = responseData?.data;

  const isWhitelabelRole =
    user?.role === "whitelabel_admin" || user?.role === "whitelabel_moderator";

  const statsCards = useMemo(() => {
    const backendCards = data?.statsCards || [];

    if (isWhitelabelRole) {
      const eventsCard = backendCards.find((c) => c.id === "events") || {};
      const hostsCard = backendCards.find((c) => c.id === "hosts") || {};
      const analytics = data?.analytics || {};

      return [
        {
          id: "total-events",
          src: getIconElement("calendar"),
          alt: "total-events",
          title: t("stats.whitelabel.totalEvents", "Total Events"),
          value: eventsCard.value ?? 0,
          subtitle: t("stats.whitelabel.activeEventsCount", "{{count}} active", { count: analytics.activeEvents ?? 0 }),
        },
        {
          id: "active-events",
          src: getIconElement("calendar-check"),
          alt: "active-events",
          title: t("stats.whitelabel.activeEvents", "Active Events"),
          value: analytics.activeEvents ?? 0,
          subtitle: t("stats.whitelabel.scheduledCount", "{{count}} scheduled", { count: analytics.eventsByStatus?.scheduled ?? 0 }),
        },
        {
          id: "total-hosts",
          src: getIconElement("users"),
          alt: "total-hosts",
          title: t("stats.whitelabel.totalClients", "Total Clients"),
          value: hostsCard.value ?? 0,
          subtitle: hostsCard.subtitle
            ? t(hostsCard.subtitle.labelKey, { count: hostsCard.subtitle.count })
            : "",
        },
        {
          id: "total-guests",
          src: getIconElement("guests"),
          alt: "total-guests",
          title: t("stats.whitelabel.totalGuests", "Total Guests"),
          value: analytics.totalGuests ?? 0,
          subtitle: "",
        },
      ];
    }

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
  }, [data, t, isWhitelabelRole]);

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
