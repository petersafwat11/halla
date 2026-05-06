"use client";

import { FiUsers, FiCalendar, FiShield, FiCreditCard } from "react-icons/fi";
import styles from "./WhitelabelDetailsContent.module.css";

const planMeta = (planType, t) => {
  const map = {
    pro:   { label: t("plan.pro", "Pro"),   color: "#9B59B6", bg: "#f5eef8" },
    elite: { label: t("plan.elite", "Elite"), color: "var(--c-p600,#b18154)", bg: "var(--c-p50,#f9f4ef)" },
  };
  return map[planType] || { label: t("plan.none", "None"), color: "var(--c-n400,#767676)", bg: "var(--c-n200,#f2f2f2)" };
};

export default function WhitelabelQuickStats({ stats, sub, t }) {
  const plan = planMeta(sub?.planType, t);

  const statItems = [
    { icon: <FiUsers size={18} />,    label: t("stats.hosts", "Hosts"),    value: stats.hostsCount ?? 0 },
    { icon: <FiCalendar size={18} />, label: t("stats.events", "Events"),   value: stats.eventsCount ?? 0 },
    { icon: <FiShield size={18} />,   label: t("stats.moderators", "Moderators"), value: stats.moderatorsCount ?? 0 },
    { icon: <FiCreditCard size={18} />, label: t("stats.subscriptionPlan", "Subscription Plan"), value: plan.label, isPill: true, pillColor: plan.color, pillBg: plan.bg },
  ];

  return (
    <div className={styles.statsRow}>
      {statItems.map((s, i) => (
        <div key={i} className={styles.statCard}>
          <div className={styles.statIcon}>{s.icon}</div>
          <div>
            <div className={styles.statLabel}>{s.label}</div>
            {s.isPill
              ? <span className={styles.pill} style={{ color: s.pillColor, background: s.pillBg }}>{s.value}</span>
              : <div className={styles.statValue}>{s.value}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
