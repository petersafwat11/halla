"use client";

import { useAdminDashboard } from "@/hooks/reactQueryHooks/useAdmin";
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

const cardTitleKeys = {
  hosts: "stats.totalHosts",
  vendors: "stats.totalVendors",
  events: "stats.totalEventsCard",
  subscriptions: "stats.activeSubscriptions",
  tickets: "stats.openTickets",
};

const cardSubtitleLabels = {
  hosts: "stats.active",
  vendors: "stats.pendingApproval",
  events: "stats.active",
  subscriptions: "stats.byPlan",
  tickets: "stats.resolvedThisPeriod",
};

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
  const data = responseData?.data || responseData;

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
          subtitle: hostsCard.subtitle || "",
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

    if (backendCards.length > 0) {
      return backendCards.map((card) => {
        const titleKey = cardTitleKeys[card.id];
        const subtitleLabelKey = cardSubtitleLabels[card.id];
        const subtitleNumber = card.subtitle?.split(" ")[0] || "";
        return {
          id: card.id || card.title,
          src: getIconElement(card.icon) || getIconElement("users"),
          alt: card.id || card.title,
          title: titleKey ? t(titleKey) : card.title,
          value: card.value,
          subtitle: subtitleLabelKey
            ? t("stats.subtitleWithCount", "{{count}} {{label}}", { count: subtitleNumber, label: t(subtitleLabelKey) })
            : card.subtitle,
        };
      });
    }

    const hostsData = data?.users?.hosts || data?.hosts || {};
    const vendorsData = data?.users?.vendors || data?.vendors || {};
    const eventsData = data?.events || {};
    const ticketsData = data?.tickets || {};

    return [
      {
        id: "total-hosts",
        src: getIconElement("users"),
        alt: "total-hosts",
        title: t("stats.totalHosts", "Total Hosts"),
        value: hostsData?.total || hostsData?.totalHosts || 0,
        subtitle: t("stats.newThisPeriodCount", "{{count}} new this month", { count: hostsData?.newThisPeriod || 0 }),
      },
      {
        id: "active-vendors",
        src: getIconElement("store"),
        alt: "active-vendors",
        title: t("stats.activeVendors", "Active Vendors"),
        value: vendorsData?.total || vendorsData?.totalVendors || 0,
        subtitle: t("stats.pendingCount", "{{count}} pending", { count: vendorsData?.pending || vendorsData?.totalPending || 0 }),
      },
      {
        id: "active-events",
        src: getIconElement("calendar"),
        alt: "active-events",
        title: t("stats.activeEvents", "Active Events"),
        value: eventsData?.active || eventsData?.endedPublishedEvents || 0,
        subtitle: t("stats.totalEventsCount", "{{count}} total", { count: eventsData?.total || 0 }),
      },
      {
        id: "open-tickets",
        src: getIconElement("credit-card"),
        alt: "open-tickets",
        title: t("stats.openTickets", "Open Tickets"),
        value: ticketsData?.open || ticketsData?.allTickets || 0,
        subtitle: t("stats.resolvedCount", "{{count}} resolved", { count: ticketsData?.resolvedThisPeriod || ticketsData?.resolved || 0 }),
      },
    ];
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
