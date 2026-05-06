"use client";
import { FaGift } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import FeaturesList from "./FeaturesList";
import styles from "./HostPlanCard.module.css";

const getOptionValue = (plan, billingType) => {
  if (billingType === "monthly") return plan.invitePool;
  return plan.invites || plan.limits?.maxInvitesPerEvent;
};

const HostPlanCard = ({
  planFamily,
  isPopular = false,
  plans = [],
  billingType,
  selectedInvites,
  onInviteChange,
  features = [],
  compensationCount = 0,
  onSubscribe,
}) => {
  const { t } = useTranslation("plans");

  const matchedPlan =
    plans.find((p) => getOptionValue(p, billingType) === selectedInvites) ||
    plans[0] ||
    null;

  const price = matchedPlan?.price || 0;

  return (
    <div className={`${styles.card} ${isPopular ? styles.popular : ""}`}>
      {isPopular ? (
        <div className={styles.popularBadge}>{t(`planFamilies.${planFamily}`)}</div>
      ) : null}

      <div className={styles.cardTop}>
        <div className={styles.titleSection}>
          <h3 className={styles.cardName}>{t(`planFamilies.${planFamily}`)}</h3>
          <p className={styles.cardDesc}>{t(`planFamilyDescriptions.${planFamily}`)}</p>
        </div>
        <div className={styles.price}>
          <div className={styles.priceRow}>
            <span className={styles.priceNum}>{price.toLocaleString()}</span>
            <span className={styles.priceCur}>{t("currency")}</span>
          </div>
          <span className={styles.pricePer}>
            {billingType === "monthly"
              ? t("billingTypeLabels.monthly")
              : t("billingTypeLabels.event")}
          </span>
        </div>
      </div>

      <div className={styles.selectorWrap}>
        <div className={styles.selectorLabel}>
          {billingType === "monthly"
            ? t("inviteSelector.poolLabel")
            : t("inviteSelector.label")}
        </div>
        <div className={styles.guestTrack}>
          {plans.map((plan) => {
            const value = getOptionValue(plan, billingType);
            return (
              <button
                key={plan.code}
                type="button"
                className={`${styles.guestBtn} ${selectedInvites === value ? styles.active : ""}`}
                onClick={() => onInviteChange(value)}
              >
                <span className={styles.guestNum}>{value}</span>
                <span className={styles.guestUnit}>{t("inviteSelector.invites")}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.validityNote}>
        <span>
          {billingType === "monthly"
            ? t("billingTypeDescriptions.monthly")
            : t("billingTypeDescriptions.event")}
        </span>
      </div>

      <FeaturesList features={features} title={t("features.title")} />

      <div className={styles.cardFooter}>
        <div className={styles.compensation}>
          <FaGift className={styles.compensationIcon} />
          <div className={styles.compensationContent}>
            <span className={styles.compensationTitle}>{t("compensation.title")}</span>
            <span className={styles.compensationValue}>
              {compensationCount} {t("compensation.invites")}
            </span>
          </div>
        </div>

        <button
          type="button"
          className={styles.subscribeBtn}
          onClick={() => onSubscribe?.(matchedPlan)}
          disabled={!matchedPlan}
        >
          {t("buttons.subscribeNow")}
        </button>
      </div>
    </div>
  );
};

export default HostPlanCard;
