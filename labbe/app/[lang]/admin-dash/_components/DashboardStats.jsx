"use client";

import { useAdminDashboard } from "@/hooks/reactQueryHooks/useAdmin";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import StatsCards from "@/ui/host/main-page/StatsCards";
import { cookieUtils } from "@/utils/cookieUtils";
import {
  FaUsers,
  FaStore,
  FaCalendarAlt,
  FaUserCheck,
  FaTicketAlt,
  FaCalendarCheck,
  FaUserFriends,
} from "react-icons/fa";

const iconMap = {
  users: <FaUsers style={{ color: "#2A8C5B", fontSize: "2.4rem" }} />,
  store: <FaStore style={{ color: "#C28E5C", fontSize: "2.4rem" }} />,
  calendar: <FaCalendarAlt style={{ color: "#3498DB", fontSize: "2.4rem" }} />,
  "calendar-check": <FaCalendarCheck style={{ color: "#2A8C5B", fontSize: "2.4rem" }} />,
  "credit-card": <FaUserCheck style={{ color: "#9B59B6", fontSize: "2.4rem" }} />,
  ticket: <FaTicketAlt style={{ color: "#D38200", fontSize: "2.4rem" }} />,
  guests: <FaUserFriends style={{ color: "#9B59B6", fontSize: "2.4rem" }} />,
};

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

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const filters = {
    period: searchParams.get("period") || "month",
    ...(from && { from }),
    ...(to && { to }),
  };

  const { data: responseData, isLoading } = useAdminDashboard(filters);
  const data = responseData?.data || responseData;

  const user = useMemo(() => {
    if (typeof window === "undefined") return null;
    const userData = cookieUtils.getCookie("user");
    return userData ? JSON.parse(userData) : null;
  }, []);

  const isWhitelabelRole =
    user?.role === "whitelabel_admin" || user?.role === "whitelabel_moderator";

  const statsCards = useMemo(() => {
    const backendCards = data?.statsCards || [];

    // Whitelabel users see tenant-relevant cards
    if (isWhitelabelRole) {
      const eventsCard = backendCards.find((c) => c.id === "events") || {};
      const hostsCard = backendCards.find((c) => c.id === "hosts") || {};
      const analytics = data?.analytics || {};

      return [
        {
          id: "total-events",
          src: iconMap.calendar,
          alt: "total-events",
          title: "إجمالي المناسبات",
          value: eventsCard.value ?? 0,
          subtitle: `${analytics.activeEvents ?? 0} نشط`,
        },
        {
          id: "active-events",
          src: iconMap["calendar-check"],
          alt: "active-events",
          title: "المناسبات النشطة",
          value: analytics.activeEvents ?? 0,
          subtitle: `${analytics.eventsByStatus?.scheduled ?? 0} مجدول`,
        },
        {
          id: "total-hosts",
          src: iconMap.users,
          alt: "total-hosts",
          title: "إجمالي العملاء",
          value: hostsCard.value ?? 0,
          subtitle: hostsCard.subtitle || "",
        },
        {
          id: "total-guests",
          src: iconMap.guests,
          alt: "total-guests",
          title: "إجمالي الضيوف",
          value: analytics.totalGuests ?? 0,
          subtitle: "",
        },
      ];
    }

    // Platform admin — existing behavior
    if (backendCards.length > 0) {
      return backendCards.map((card) => {
        const titleKey = cardTitleKeys[card.id];
        const subtitleLabelKey = cardSubtitleLabels[card.id];
        const subtitleNumber = card.subtitle?.split(" ")[0] || "";
        return {
          id: card.id || card.title,
          src: iconMap[card.icon] || iconMap.users,
          alt: card.id || card.title,
          title: titleKey ? t(titleKey) : card.title,
          value: card.value,
          subtitle: subtitleLabelKey
            ? `${subtitleNumber} ${t(subtitleLabelKey)}`
            : card.subtitle,
        };
      });
    }

    // Fallback: build from individual data fields
    const hostsData = data?.users?.hosts || data?.hosts || {};
    const vendorsData = data?.users?.vendors || data?.vendors || {};
    const eventsData = data?.events || {};
    const ticketsData = data?.tickets || {};

    return [
      {
        id: "total-hosts",
        src: iconMap.users,
        alt: "total-hosts",
        title: t("stats.totalHosts", "إجمالي العملاء"),
        value: hostsData?.total || hostsData?.totalHosts || 0,
        subtitle: `${hostsData?.newThisPeriod || 0} ${t("stats.newThisPeriod", "جديد هذا الشهر")}`,
      },
      {
        id: "active-vendors",
        src: iconMap.store,
        alt: "active-vendors",
        title: t("stats.activeVendors", "التجار النشطين"),
        value: vendorsData?.total || vendorsData?.totalVendors || 0,
        subtitle: `${vendorsData?.pending || vendorsData?.totalPending || 0} ${t("stats.pending", "قيد المراجعة")}`,
      },
      {
        id: "active-events",
        src: iconMap.calendar,
        alt: "active-events",
        title: t("stats.activeEvents", "المناسبات النشطة"),
        value: eventsData?.active || eventsData?.endedPublishedEvents || 0,
        subtitle: `${eventsData?.total || 0} ${t("stats.totalEvents", "إجمالي")}`,
      },
      {
        id: "open-tickets",
        src: iconMap["credit-card"],
        alt: "open-tickets",
        title: t("stats.openTickets", "الشكاوى المفتوحة"),
        value: ticketsData?.open || ticketsData?.allTickets || 0,
        subtitle: `${ticketsData?.resolvedThisPeriod || ticketsData?.resolved || 0} ${t("stats.resolved", "محلولة")}`,
      },
    ];
  }, [data, t, isWhitelabelRole]);

  if (isLoading) return null;

  return <StatsCards cards={statsCards} />;
}
