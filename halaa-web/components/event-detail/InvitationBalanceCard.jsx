"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { FiSend, FiPlusCircle } from "react-icons/fi";
import { formatNumber } from "@halaa/shared/utils/locale";
import styles from "./InvitationBalanceCard.module.css";

/**
 * Canonical Host Invitation Balance Card (Web - PR4 / F-11)
 *
 * Information hierarchy:
 * 1. Prominently display Remaining Invites (or explicit "Unlimited" copy).
 * 2. Secondarily display Used / Total (never mixed with RSVP state counts).
 * 3. Display "Add More" action button only when purchasable (not unlimited),
 *    navigating to the typed return destination via `useRouter()`.
 *
 * @param {Object} props
 * @param {Object} props.balance - Canonical DTO: { unlimited, base, compensation, consumed, total, remaining }
 * @param {string} [props.returnTo="event-detail"] - Typed return destination
 * @param {string} [props.eventId] - Associated event ID
 * @param {boolean} [props.purchasable] - Override purchasable flag (defaults to !balance.unlimited)
 * @param {boolean} [props.compact] - Compact row variant for home dashboard widget
 * @param {string} [props.className] - CSS class override
 */
export default function InvitationBalanceCard({
  balance,
  returnTo = "event-detail",
  eventId,
  purchasable,
  compact = false,
  className = "",
}) {
  const { t, i18n } = useTranslation("home-events");
  const { lang } = useParams();
  const router = useRouter();
  const locale = lang || i18n.language || "ar";

  if (!balance) return null;

  const isUnlimited = Boolean(balance.unlimited);
  const isPurchasable = purchasable !== undefined ? purchasable : !isUnlimited;

  const handleAddMore = () => {
    const currentLang = lang || "ar";
    const query = new URLSearchParams({
      origin: "invitation_balance",
      returnTo,
    });
    if (eventId) {
      query.set("eventId", String(eventId));
    }
    router.push(`/${currentLang}/host/plans?${query.toString()}`);
  };

  const remainingDisplay = isUnlimited
    ? t("invitationBalance.unlimited", "غير محدود")
    : formatNumber(balance.remaining ?? 0, locale);

  const consumedDisplay = formatNumber(balance.consumed ?? 0, locale);
  const totalDisplay = isUnlimited
    ? t("invitationBalance.unlimited", "غير محدود")
    : formatNumber(balance.total ?? 0, locale);

  if (compact) {
    return (
      <div
        className={`${styles.compactContainer} ${className}`}
        role="region"
        aria-label={t("invitationBalance.title", "رصيد الدعوات")}
      >
        <div className={styles.compactLeft}>
          <div className={styles.iconCircle} aria-hidden="true">
            <FiSend size={14} />
          </div>
          <div>
            <div className={styles.compactTitle}>
              {t("invitationBalance.remaining", "الدعوات المتبقية")}
            </div>
            <div className={styles.compactSecondary}>
              {t("invitationBalance.usedOfTotal", "{{used}} من {{total}}", {
                used: consumedDisplay,
                total: totalDisplay,
              })}
            </div>
          </div>
        </div>

        <div className={styles.compactRight}>
          <span className={styles.compactValue}>{remainingDisplay}</span>
          {isPurchasable && (
            <button
              type="button"
              className={styles.compactAddBtn}
              onClick={handleAddMore}
              aria-label={t("invitationBalance.addMore", "إضافة المزيد")}
            >
              <FiPlusCircle size={12} aria-hidden="true" />
              <span>{t("invitationBalance.addMore", "إضافة المزيد")}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.card} ${className}`}
      role="region"
      aria-label={t("invitationBalance.title", "رصيد الدعوات")}
    >
      <div className={styles.headerRow}>
        <div className={styles.headerLeft}>
          <div className={styles.iconCircle} aria-hidden="true">
            <FiSend size={16} />
          </div>
          <div>
            <h3 className={styles.title}>
              {t("invitationBalance.remaining", "الدعوات المتبقية")}
            </h3>
            <p className={styles.helper}>
              {t(
                "invitationBalance.helper",
                "إضافة الضيوف مجانية؛ يتم خصم الرصيد فقط عند إرسال دعوة أو تذكير."
              )}
            </p>
          </div>
        </div>

        {isPurchasable && (
          <button
            type="button"
            className={styles.addMoreBtn}
            onClick={handleAddMore}
            aria-label={t("invitationBalance.addMore", "إضافة المزيد")}
          >
            <FiPlusCircle size={14} aria-hidden="true" />
            <span>{t("invitationBalance.addMore", "إضافة المزيد")}</span>
          </button>
        )}
      </div>

      <div className={styles.bodyRow}>
        <div className={styles.prominentStat}>
          <span className={styles.prominentValue}>{remainingDisplay}</span>
          <span className={styles.statSublabel}>
            {isUnlimited
              ? t("invitationBalance.unlimitedPlan", "باقة غير محدودة")
              : t("invitationBalance.remainingLabel", "دعوة متبقية")}
          </span>
        </div>

        <div className={styles.secondaryStats}>
          <div className={styles.secondaryItem}>
            <span className={styles.secondaryLabel}>
              {t("invitationBalance.used", "المستخدم")}
            </span>
            <span className={styles.secondaryValue}>{consumedDisplay}</span>
          </div>

          <div className={styles.divider} aria-hidden="true" />

          <div className={styles.secondaryItem}>
            <span className={styles.secondaryLabel}>
              {t("invitationBalance.total", "الإجمالي")}
            </span>
            <span className={styles.secondaryValue}>{totalDisplay}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
