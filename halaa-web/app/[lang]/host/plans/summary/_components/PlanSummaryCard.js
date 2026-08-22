"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaCalendarAlt, FaUsers, FaGift, FaLayerGroup } from "react-icons/fa";
import { getLocalized } from "@halaa/shared/utils/locale";
import {
  COMPENSATION_PERCENTAGE,
  isPoolPlan,
  isRecurringBilling,
  getBillingType,
} from "@halaa/shared/constants/plans";
import styles from "../summary.module.css";

const PlanSummaryCard = ({
  selectedPlan,
  planFamily,
  billingType,
  planPrice,
  addonItems = [],
  t: tProp,
}) => {
  const { t: tHook, i18n } = useTranslation("plans");
  const t = tProp || tHook;

  const planType = selectedPlan?.planType;
  const effectiveBillingType =
    selectedPlan?.billingType ||
    getBillingType(planType) ||
    billingType ||
    "event";
  const isPool =
    isPoolPlan(planType) ||
    isRecurringBilling(effectiveBillingType) ||
    selectedPlan?.isPoolSubscription === true;

  // Base invites: pool plans use invitePool; per-event plans use the selected
  // tier (`invites`, set by the host flow) and fall back to the plan's invitePool
  // — which per-event plans now also carry — so the row never shows 0.
  const invitePool = selectedPlan?.invitePool ?? selectedPlan?.limits?.invitePool ?? 0;
  const inviteCount = isPool
    ? invitePool
    : selectedPlan?.invites ?? invitePool;
  const compensationCount = isPool
    ? selectedPlan?.compensationPool ?? Math.floor(invitePool * (COMPENSATION_PERCENTAGE / 100))
    : Math.floor((selectedPlan?.invites ?? invitePool) * (COMPENSATION_PERCENTAGE / 100));

  // Extra-invite packages stack and add up; they do NOT earn compensation.
  const extraInvitesCount = addonItems
    .filter((item) => (item.addonType || item.type) === "extra_invites")
    .reduce((sum, item) => sum + (item.quantity || 0), 0);

  // Total invites the host can send = base + purchased extras + compensation.
  const totalInvites = inviteCount + extraInvitesCount + compensationCount;

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
              {isPool
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
              {isPool
                ? t("summary.invitePoolLabel", { count: inviteCount })
                : t("summary.invitesLabel", { count: inviteCount })}
            </span>
          </div>
          <div className={styles.featureItem}>
            <FaCalendarAlt className={styles.featureIcon} />
            <span>
              {isPool
                ? t("summary.unlimitedEvents")
                : t("summary.singleEvent90Days")}
            </span>
          </div>
          <div
            className={styles.featureItem}
            title={t("summary.compensationHint", {
              defaultValue:
                "+15% bonus invites on your base plan invites — free. Extra invite packages don't earn compensation.",
            })}
          >
            <FaGift className={styles.featureIcon} />
            <span>
              {t("summary.compensationInvitesLabel", { count: compensationCount })}
            </span>
          </div>
        </div>

        <p className={styles.compensationNote}>
          <FaGift className={styles.compensationNoteIcon} aria-hidden="true" />
          {t("summary.compensationHint", {
            defaultValue:
              "+15% bonus invites on your base plan invites — free. Extra invite packages don't earn compensation.",
          })}
        </p>

        <div
          className={styles.totalInvitesRow}
          title={t("summary.totalPoolHint", {
            defaultValue:
              "Base invites + extra packages + compensation = the total invites you can send.",
          })}
        >
          <div className={styles.totalInvitesHead}>
            <FaLayerGroup className={styles.totalInvitesIcon} />
            <span className={styles.totalInvitesLabel}>
              {t("summary.totalInvitesLabel", { defaultValue: "Total invites" })}
            </span>
            <span className={styles.totalInvitesValue}>
              {totalInvites.toLocaleString(i18n.language === "ar" ? "ar-SA" : "en-US")}
            </span>
          </div>
          <p className={styles.totalInvitesHint}>
            {extraInvitesCount > 0
              ? t("summary.totalInvitesBreakdownWithExtras", {
                  base: inviteCount,
                  extras: extraInvitesCount,
                  compensation: compensationCount,
                  defaultValue: `${inviteCount} plan + ${extraInvitesCount} extra + ${compensationCount} bonus`,
                })
              : t("summary.totalInvitesBreakdown", {
                  base: inviteCount,
                  compensation: compensationCount,
                  defaultValue: `${inviteCount} plan + ${compensationCount} bonus`,
                })}
          </p>
          <p className={styles.totalInvitesHint}>
            {isPool
              ? t("summary.poolModelHint", {
                  defaultValue:
                    "Pool plan: many events share these invites.",
                })
              : t("summary.perEventModelHint", {
                  defaultValue:
                    "Per-event plan: 1 event with these total invites.",
                })}
          </p>
        </div>

        <div className={styles.billingPeriod}>
          <span className={styles.billingLabel}>
            {t("summary.billingPeriodLabel")}
          </span>
          <span className={styles.billingValue}>
            {effectiveBillingType === "annual" || effectiveBillingType === "yearly"
              ? t("summary.periods.annual", { defaultValue: t("summary.periods.yearly", { defaultValue: "1 year (365 days)" }) })
              : effectiveBillingType === "quarterly"
              ? t("summary.periods.quarterly", { defaultValue: "90 days" })
              : effectiveBillingType === "monthly"
              ? t("summary.periods.monthly", { defaultValue: "30 days" })
              : t("summary.periods.event", { defaultValue: "90 days (1 event)" })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PlanSummaryCard;
