"use client";
import { FaUsers, FaCalendar, FaShieldAlt, FaCreditCard } from "react-icons/fa";
import styles from "./WhitelabelDetailsWrapper.module.css";

export default function WlStatsGrid({ wl, t }) {
  const stats = [
    { icon: <FaUsers />, value: wl?.statistics?.hostsCount || 0, label: t("stats.hosts", "Hosts") },
    { icon: <FaCalendar />, value: wl?.statistics?.eventsCount || 0, label: t("stats.events", "Events") },
    { icon: <FaShieldAlt />, value: wl?.statistics?.moderatorsCount || 0, label: t("stats.moderators", "Moderators") },
    { icon: <FaCreditCard />, value: wl?.subscription?.planType || t("subscription.noPlan", "No Plan"), label: t("subscription.plan", "Plan") },
  ];

  return (
    <div className={styles.statsGrid}>
      {stats.map((s, i) => (
        <div key={i} className={styles.statCard}>
          <span className={styles.statIcon}>{s.icon}</span>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{s.value}</span>
            <span className={styles.statLabel}>{s.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
