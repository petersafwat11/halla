"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaCalendarAlt, FaUsers, FaGift } from "react-icons/fa";
import { getLocalized } from "@/utils/locale";
import styles from "../summary.module.css";

const PlanSummaryCard = ({ selectedPlan, planFamily, billingType, planPrice, t: tProp }) => {
  const { t: tHook, i18n } = useTranslation("plans");
  const t = tProp || tHook;
  const isMonthly = billingType === "monthly";
  const inviteCount = isMonthly
    ? selectedPlan?.invitePool || 0
    : selectedPlan?.invites ?? 0;
  const compensationPercent = (selectedPlan?.compensationPercentage ?? 10) / 100;
  const compensationCount = isMonthly
    ? selectedPlan?.compensationPool || 0
    : Math.floor((selectedPlan?.invites ?? 0) * compensationPercent);

  const planDisplayName = (() => {
    const familyKey = planFamily === "premium" ? "premium" : "basic";
    return t("summary.planNameTemplate", {
      defaultValue: `${t(`summary.planFamilyBadges.${familyKey}`)} ${inviteCount}`,
      family: t(`summary.planFamilyBadges.${familyKey}`),
      invites: inviteCount,
    });
  })();

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>{t("summary.planDetails")}</h2>
        {planFamily === "premium" && (
          <span className={styles.managedBadge}>
            {t("summary.planFamilyBadges.premium")}
          </span>
        )}
      </div>

      <div className={styles.cardContent}>
        <div className={styles.planInfo}>
          <div className={styles.planIcon}>
            <FaCalendarAlt />
          </div>
          <div className={styles.planDetails}>
            <h3 className={styles.planName}>
              {getLocalized(selectedPlan, "name", i18n.language) || planDisplayName}
            </h3>
            <p className={styles.planType}>
              {isMonthly
                ? t("summary.unlimitedEvents")
                : t("summary.singleEvent")}
            </p>
          </div>
          <div className={styles.planPrice}>
            <span className={styles.priceAmount}>{planPrice}</span>
            <span className={styles.priceCurrency}>
              {t("common.currency.sar")}
            </span>
          </div>
        </div>

        <div className={styles.featuresSummary}>
          <div className={styles.featureItem}>
            <FaUsers className={styles.featureIcon} />
            <span>
              {isMonthly
                ? t("summary.invitePoolLabel", { count: inviteCount })
                : t("summary.invitesLabel", { count: inviteCount })}
            </span>
          </div>
          <div className={styles.featureItem}>
            <FaCalendarAlt className={styles.featureIcon} />
            <span>
              {isMonthly
                ? t("summary.unlimitedEvents")
                : t("summary.singleEvent90Days")}
            </span>
          </div>
          <div className={styles.featureItem}>
            <FaGift className={styles.featureIcon} />
            <span>
              {t("summary.compensationInvitesLabel", { count: compensationCount })}
            </span>
          </div>
        </div>

        <div className={styles.billingPeriod}>
          <span className={styles.billingLabel}>
            {t("summary.billingPeriodLabel")}
          </span>
          <span className={styles.billingValue}>
            {isMonthly ? t("summary.periods.monthly") : t("summary.periods.event")}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PlanSummaryCard;
