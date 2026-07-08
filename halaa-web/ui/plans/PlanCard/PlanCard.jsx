"use client";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import PlanDescription from "@/ui/plans/PlanDescription/PlanDescription";
import SarIcon from "@/ui/commen/SarIcon/SarIcon";
import styles from "./planCard.module.css";

const formatPrice = (n) => (n || 0).toLocaleString();

const getInviteValue = (plan, billingType) => {
  if (!plan) return 0;
  if (billingType === "monthly") return plan.invitePool ?? 0;
  return plan.invites ?? 0;
};

const resolvePrice = (plan) =>
  plan?.pricing?.oneTime ?? plan?.price ?? 0;

/**
 * Shared plan card used by the landing pricing section AND the host plans page.
 * Keep visual parity between the two — adjust here, not in either consumer.
 */
export default function PlanCard({
  planFamily,
  matchedPlan,
  plans = [],
  billingType = "event",
  selectedInvites,
  onInviteChange,
  isPopular = false,
  lang = "ar",
  ctaLabel,
  onCtaClick,
  ctaHref,
}) {
  const { t: tPlans } = useTranslation("plans");
  const { t: tLanding } = useTranslation("landing");

  const tagline = planFamily
    ? tPlans(`taglines.${planFamily}`, { defaultValue: "" })
    : "";
  const name = planFamily
    ? tPlans(`planFamilies.${planFamily}`, { defaultValue: "" })
    : matchedPlan?.name || "";
  const price = resolvePrice(matchedPlan);

  const ctaCommonProps = {
    className: styles.btn,
  };
  const cta = ctaHref ? (
    <Link href={ctaHref} {...ctaCommonProps}>
      {ctaLabel}
    </Link>
  ) : (
    <button
      type="button"
      {...ctaCommonProps}
      onClick={() => onCtaClick?.(matchedPlan)}
      disabled={!matchedPlan}
    >
      {ctaLabel}
    </button>
  );

  return (
    <div className={`${styles.card} ${isPopular ? styles.popular : ""}`}>
      {isPopular && (
        <div className={styles.popularBadge}>
          {tLanding("pricing.popular", { defaultValue: "" })}
        </div>
      )}

      <div className={styles.cardTop}>
        <div className={styles.cardTopRow}>
          <h3 className={styles.cardName}>{name}</h3>
          <div className={styles.price}>
            <span className={styles.priceNum}>{formatPrice(price)}</span>
            <SarIcon size="1.5rem" />
          </div>
        </div>
        {tagline ? <p className={styles.cardTagline}>{tagline}</p> : null}
      </div>

      {plans.length > 1 && (
        <div className={styles.guestTrack}>
          {plans.map((plan) => {
            const v = getInviteValue(plan, billingType);
            return (
              <button
                key={plan.code}
                type="button"
                className={`${styles.guestBtn} ${
                  selectedInvites === v ? styles.active : ""
                }`}
                onClick={() => onInviteChange?.(v)}
              >
                <span className={styles.guestNum}>{v}</span>
                <span className={styles.guestUnit}>
                  {tPlans("inviteSelector.invites", { defaultValue: "" })}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className={styles.featSection}>
        <PlanDescription
          plan={matchedPlan}
          lang={lang}
          selectedInviteCount={selectedInvites}
          showTagline={false}
          showDuration={false}
          size="large"
          inlineExtras
        />
      </div>

      <div className={styles.cardFooter}>{cta}</div>
    </div>
  );
}
