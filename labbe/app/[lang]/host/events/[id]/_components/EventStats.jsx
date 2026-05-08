"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import CardLayout from "@/ui/commen/card/CardLayout";
import { useSingleEventStats, useEvent } from "@/hooks/reactQueryHooks/useEvents";
import PartialFailureBanner from "./PartialFailureBanner";
import styles from "../singleEvent.module.css";

export default function EventStats({ eventId }) {
  const { t } = useTranslation("home-events");
  const { data: eventResp } = useEvent(eventId);
  const eventStatus =
    eventResp?.data?.event?.status ||
    eventResp?.event?.status ||
    null;
  // Pass eventStatus so the polling cadence (30s while live, 5min while
  // completed, none otherwise) kicks in.
  const { data: statsData } = useSingleEventStats(eventId, { eventStatus });

  // Extract stats from response
  const data = statsData?.data || statsData;

  // Backend getSingleEventStats returns: { confirmed, declined, pending, checkedIn, totalGuests }
  const stats = [
    {
      label: t("singleEvent.stats.declined"),
      value: data?.declined || 0,
      color: "#FFF2F2",
      textColor: "#DC2626",
      icon: "/svg/events/close.svg",
    },
    {
      label: t("singleEvent.stats.confirmed"),
      value: data?.confirmed || 0,
      color: "#F0FDF4",
      textColor: "#16A34A",
      icon: "/svg/events/right.svg",
    },
    {
      label: t("singleEvent.stats.noResponse"),
      value: data?.pending || 0,
      color: "#FFFBEB",
      textColor: "#D97706",
      icon: "/svg/events/clock.svg",
    },
    {
      label: t("singleEvent.stats.checkedIn"),
      value: data?.checkedIn || 0,
      color: "#F8FAFC",
      textColor: "#64748B",
      icon: "/svg/events/maybe.svg",
    },
  ];

  return (
    <div className={styles.statsRow}>
      {/* Partial-failure banner sits above the stats card so the host
          sees "X of N invitations failed" next to the live attendance
          numbers. Renders nothing when failedCount is 0 or the event
          hasn't gone live yet. */}
      <PartialFailureBanner eventId={eventId} />
      <CardLayout className={styles.overview}>
        <div className={styles.sectionTitle}>
          {t("singleEvent.stats.attendanceTracking")}
        </div>
        <div className={styles.statsGrid}>
          {stats.map((stat, idx) => (
            <CardLayout
              key={idx}
              className={styles.statCard}
              style={{ background: stat.color, color: stat.textColor }}
            >
              <div className={styles.statValue}>{stat.value}</div>
              <div className={styles.statLabelRow}>
                {stat.icon && (
                  <img src={stat.icon} alt="icon" className={styles.statIcon} />
                )}
                <div className={styles.statLabel}>{stat.label}</div>
              </div>
            </CardLayout>
          ))}
        </div>
      </CardLayout>
    </div>
  );
}
