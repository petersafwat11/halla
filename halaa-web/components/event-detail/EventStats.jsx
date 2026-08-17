"use client";
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import CardLayout from "@/ui/commen/card/CardLayout";
import { useSingleEventStats, useEvent } from "@/hooks/events";
import PartialFailureBanner from "./PartialFailureBanner";
import { EVENT_STATUS, EVENT_STATUS_GROUPS } from "@halaa/shared/constants/eventStatus";
import styles from "@/app/[lang]/host/events/[id]/singleEvent.module.css";

export default function EventStats({ eventId, activeFilter, onFilterPress }) {
  const { t } = useTranslation("home-events");
  const { data: eventResp } = useEvent(eventId);
  const eventStatus =
    eventResp?.data?.event?.status ||
    eventResp?.event?.status ||
    null;
  const { data: statsData } = useSingleEventStats(eventId, { eventStatus });

  const data = statsData?.data || statsData;

  const allStats = useMemo(() => ({
    declined: {
      label: t("singleEvent.stats.declined"),
      value: data?.declined || 0,
      color: "#FFF2F2",
      textColor: "#DC2626",
      icon: "/svg/events/close.svg",
    },
    confirmed: {
      label: t("singleEvent.stats.confirmed"),
      value: data?.confirmed || 0,
      color: "#F0FDF4",
      textColor: "#16A34A",
      icon: "/svg/events/right.svg",
    },
    noResponse: {
      label: t("singleEvent.stats.noResponse"),
      value: data?.pending || 0,
      color: "#FFFBEB",
      textColor: "#D97706",
      icon: "/svg/events/clock.svg",
    },
    checkedIn: {
      label: t("singleEvent.stats.checkedIn"),
      value: data?.checkedIn || 0,
      color: "#F8FAFC",
      textColor: "#64748B",
      icon: "/svg/events/right.svg",
    },
    totalGuests: {
      label: t("singleEvent.stats.totalGuests"),
      value: data?.totalGuests || 0,
      color: "#F5F0EB",
      textColor: "#6B4E33",
      icon: "/svg/events/people.svg",
    },
  }), [t, data]);

  const stats = useMemo(() => {
    if (!eventStatus) return [];

    const isPreLaunch = EVENT_STATUS_GROUPS.PRE_LAUNCH.includes(eventStatus);
    const isLive = eventStatus === EVENT_STATUS.LIVE;
    const isCompleted = eventStatus === EVENT_STATUS.COMPLETED;

    const keys = ["confirmed", "declined", "totalGuests"];

    if (isPreLaunch || isLive) {
      keys.push("noResponse");
    }

    if (isLive || isCompleted) {
      keys.push("checkedIn");
    }

    return keys.map((k) => ({ key: k, ...allStats[k] }));
  }, [eventStatus, allStats]);

  return (
    <div className={styles.statsRow}>
      <PartialFailureBanner eventId={eventId} />
      <CardLayout className={styles.overview}>
        <div className={styles.sectionTitle}>
          {t("singleEvent.stats.attendanceTracking")}
        </div>
        <div className={styles.statsGrid}>
          {stats.map((stat, idx) => {
            const isActive = activeFilter === stat.key;
            return (
              <div
                key={idx}
                className={`${styles.statCardWrapper} ${isActive ? styles.statCardWrapperActive : ""}`}
                onClick={() => onFilterPress && onFilterPress(stat.key)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onFilterPress && onFilterPress(stat.key);
                  }
                }}
              >
                <CardLayout
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
              </div>
            );
          })}
        </div>
      </CardLayout>
    </div>
  );
}
