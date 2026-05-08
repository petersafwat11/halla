"use client";

import { FiCreditCard } from "react-icons/fi";
import styles from "./WhitelabelDetailsContent.module.css";

const planMeta = (planType, t) => {
  const map = {
    pro:   { label: t("plan.pro", "Pro"),   color: "#9B59B6", bg: "#f5eef8" },
    elite: { label: t("plan.elite", "Elite"), color: "var(--c-p600,#b18154)", bg: "var(--c-p50,#f9f4ef)" },
  };
  return map[planType] || { label: t("plan.none", "None"), color: "var(--c-n400,#767676)", bg: "var(--c-n200,#f2f2f2)" };
};

const subStatusMeta = (status, t) => ({
  active:    { label: t("status.active", "Active"),   color: "var(--c-success-500,#2a8c5b)", bg: "var(--c-success-50,#eaf4ef)" },
  trial:     { label: t("status.trial", "Trial"),     color: "#9B59B6", bg: "#f5eef8" },
  expired:   { label: t("status.expired", "Expired"), color: "var(--c-error-500,#c0392b)",  bg: "var(--c-error-50,#f9ebea)" },
  cancelled: { label: t("status.cancelled", "Cancelled"), color: "var(--c-n400,#767676)", bg: "var(--c-n200,#f2f2f2)" },
}[status] || { label: status || "\u2014", color: "var(--c-n400,#767676)", bg: "var(--c-n200,#f2f2f2)" });

const limitLabel = (v, t) => (v === -1 ? t("limits.unlimited", "Unlimited") : v ?? "\u2014");

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" }) : "\u2014";

export default function WhitelabelSubscriptionInfo({ sub, onAssignPlan, t }) {
  const plan = planMeta(sub?.planType, t);
  const subSt = subStatusMeta(sub?.status, t);

  if (!sub) {
    return (
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>{t("subscription.detailsTitle", "Subscription Details")}</h3>
        <div className={styles.noPlan}>
          <FiCreditCard size={28} />
          <p>{t("subscription.noPlanSet", "No subscription plan set yet")}</p>
          <button className={styles.assignBtn} onClick={onAssignPlan}>
            {t("subscription.assignPlan", "Assign Plan")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <h3 className={styles.cardTitle}>{t("subscription.detailsTitle", "Subscription Details")}</h3>
      <div className={styles.subGrid}>
        <div className={styles.subItem}>
          <span className={styles.subLabel}>{t("subscription.plan", "Plan")}</span>
          <span className={styles.pill} style={{ color: plan.color, background: plan.bg }}>{plan.label}</span>
        </div>
        <div className={styles.subItem}>
          <span className={styles.subLabel}>{t("subscription.status", "Status")}</span>
          <span className={styles.pill} style={{ color: subSt.color, background: subSt.bg }}>{subSt.label}</span>
        </div>
        <div className={styles.subItem}>
          <span className={styles.subLabel}>{t("subscription.teamMembersLimit", "Team Members Limit")}</span>
          <span className={styles.subValue}>{limitLabel(sub?.limits?.maxUsers, t)}</span>
        </div>
        <div className={styles.subItem}>
          <span className={styles.subLabel}>{t("subscription.eventsPerMonthLimit", "Events / Month Limit")}</span>
          <span className={styles.subValue}>{limitLabel(sub?.limits?.maxEvents, t)}</span>
        </div>
        {sub?.currentPeriodEnd && (
          <div className={styles.subItem}>
            <span className={styles.subLabel}>{t("subscription.expiresOn", "Expires On")}</span>
            <span className={styles.subValue}>{fmtDate(sub.currentPeriodEnd)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
