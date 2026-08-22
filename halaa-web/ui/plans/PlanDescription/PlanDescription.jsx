import { useTranslation } from "react-i18next";
import {
  COMPENSATION_PERCENTAGE,
  isPoolPlan,
  isRecurringBilling,
  getPlanFamily,
  getBillingType,
} from "@halaa/shared/constants/plans";
import styles from "./planDescription.module.css";

/**
 * <PlanDescription> — single source of truth for the marketing/checkout
 * plan card body. See docs/plans-rewrite-2026-05.md §5 for the render
 * contract.
 *
 * Props:
 *   plan                — Plan object as returned by /plans/* endpoints
 *   lang                — 'ar' | 'en'
 *   selectedInviteCount — int; tier the user is currently viewing
 *                         (for event plans, this drives the compensation row).
 *                         Defaults to plan.invitePool or plan.invites.
 *   showTagline         — bool (default true); set false to suppress the
 *                         family tagline when the parent already renders it.
 */
export default function PlanDescription({
  plan,
  lang = "ar",
  selectedInviteCount,
  showTagline = true,
  showDuration = true,
  size = "default",
  inlineExtras = false,
}) {
  const { t } = useTranslation("plans");

  if (!plan) return null;

  const bullets = plan.featureBullets?.[lang] || [];
  const family = plan.planFamily || getPlanFamily(plan.planType);
  const billingType = plan.billingType || getBillingType(plan.planType);
  const setupFee = Number(plan.setupFeeAmount) || 0;
  const whatsappCount = Number(plan.features?.whatsAppTemplates) || 0;
  const isPool = isPoolPlan(plan.planType) || isRecurringBilling(billingType);
  const invitePool = plan.invitePool ?? plan.limits?.invitePool ?? null;
  const perEventInvites =
    plan.invitePool ??
    plan.limits?.invitePool ??
    plan.invites ??
    plan.limits?.maxInvitesPerEvent ??
    0;

  // Compensation base: selected tier for event plans, invitePool for pool plans.
  const compensationBase = isPool
    ? invitePool ?? 0
    : selectedInviteCount ?? perEventInvites;
  const compensationCount = compensationBase > 0
    ? Math.floor((compensationBase * COMPENSATION_PERCENTAGE) / 100)
    : 0;

  // Duration line: format depends on billing type.
  const durationDays = plan.limits?.durationDays;
  const durationLine = (() => {
    if (billingType === "monthly") return t("duration.monthly");
    if (billingType === "quarterly") return t("duration.quarterly");
    if (billingType === "annual") return t("duration.annual");
    if (durationDays) return t("duration.event", { days: durationDays });
    return null;
  })();

  const taglineKey = family ? `taglines.${family}` : null;
  const tagline = taglineKey ? t(taglineKey, { defaultValue: "" }) : "";
  const includesBasic = family === "premium";

  const compensationLine = compensationCount > 0
    ? t("compensationRow", {
        count: compensationCount,
        percent: COMPENSATION_PERCENTAGE,
        base: compensationBase,
      })
    : null;

  const mergedBullets = inlineExtras
    ? [
        ...(durationLine ? [durationLine] : []),
        ...bullets,
        ...(compensationLine ? [compensationLine] : []),
      ]
    : bullets;

  const rootClass = `${styles.planDescription}${size === "large" ? ` ${styles.large}` : ""}${inlineExtras ? ` ${styles.inlineExtras}` : ""}`;

  return (
    <div className={rootClass}>
      {showTagline && tagline ? (
        <p className={styles.tagline}>{tagline}</p>
      ) : null}

      {showDuration && !inlineExtras && durationLine ? (
        <p className={styles.duration}>{durationLine}</p>
      ) : null}

      {includesBasic ? (
        <p className={styles.includesHeading}>{t("includes.basic")}</p>
      ) : null}

      {mergedBullets.length > 0 ? (
        <ul className={styles.bullets}>
          {mergedBullets.map((line, i) => (
            <li key={i} className={styles.bulletItem}>
              <span className={styles.check} aria-hidden>✓</span>
              <span className={styles.bulletText}>{line}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {!inlineExtras && compensationCount > 0 ? (
        <div className={styles.compensationBox}>
          <span className={styles.compensationIcon} aria-hidden>🎁</span>
          <span className={styles.compensationText}>
            {compensationLine}
          </span>
        </div>
      ) : null}

      {!inlineExtras && (setupFee > 0 || whatsappCount > 0) ? (
        <div className={styles.metaRows}>
          {setupFee > 0 ? (
            <p className={styles.metaRow}>
              <span className={styles.metaIcon} aria-hidden>💼</span>
              {t("setupFeeRow", { amount: setupFee.toLocaleString() })}
            </p>
          ) : null}

          {whatsappCount > 0 ? (
            <p className={styles.metaRow}>
              <span className={styles.metaIcon} aria-hidden>💬</span>
              {t("whatsappTemplates", { count: whatsappCount })}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
