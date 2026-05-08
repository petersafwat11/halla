"use client";

import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { handleError } from "@/services/errorHandlingService";
import { toastUtils } from "@/utils/toastUtils";
import { useAdminWhitelabelMutation } from "@/hooks/reactQueryHooks/useAdmin";
import { useBusinessPlans } from "@/hooks/reactQueryHooks/usePlans";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import { getLocalized } from "@/utils/locale";
import styles from "./whitelabelSubscriptionPopup.module.css";
import Image from "next/image";
import { FaCheck, FaCrown } from "react-icons/fa";

const WhitelabelSubscriptionPopup = ({
  whitelabel,
  currentSubscription,
  onClose,
  onSuccess,
}) => {
  const { t, i18n } = useTranslation("adminWhitelabels");
  const updateSubscription = useAdminWhitelabelMutation("updateSubscription");

  const { data: plansData, isLoading: plansLoading } = useBusinessPlans();

  const [selectedPlan, setSelectedPlan] = useState(
    currentSubscription?.planCode || null
  );

  const handleSubmit = useCallback(async () => {
    const whitelabelId = whitelabel?.id || whitelabel?._id;
    if (!whitelabelId) {
      toastUtils.error(t("subscription.noWhitelabelId"));
      return;
    }
    if (!selectedPlan) {
      toastUtils.error(t("subscription.noPlanSelected"));
      return;
    }

    try {
      await updateSubscription.mutateAsync({
        whitelabelId,
        planCode: selectedPlan,
      });
      toastUtils.success(t("subscription.updateSuccess"));
      onSuccess?.();
    } catch (error) {
      handleError(error, t, { fallbackMessage: "subscription.updateError" });
    }
  }, [whitelabel, selectedPlan, updateSubscription, t, onSuccess]);

  const renderPlanCard = (plan) => {
    const isSelected = selectedPlan === plan.code;
    const planName = getLocalized(plan, "name", i18n.language);
    const price = plan.pricing?.oneTime || 0;
    const isPoolPlan =
      plan.planType === "business_quarterly" ||
      plan.planType === "business_annual";
    const inviteDisplay = isPoolPlan
      ? plan.limits?.invitePool
      : plan.limits?.maxInvitesPerEvent;
    const featuresArray = plan.featuresArray || [];

    return (
      <div
        key={plan.code}
        className={`${styles.planCard} ${isSelected ? styles.selectedPlan : ""} ${plan.isPopular ? styles.popularPlan : ""}`}
        onClick={() => setSelectedPlan(plan.code)}
      >
        <div className={styles.planHeader}>
          <h3 className={styles.planName}>{planName}</h3>
          <p className={styles.planPrice}>
            <span className={styles.priceValue}>{price.toLocaleString()}</span>
            <span className={styles.priceCurrency}>
              {" "}{plan.currency || t("subscription.currency")}
            </span>
          </p>
        </div>
        {inviteDisplay != null && (
          <p className={styles.planLimitInfo}>
            {isPoolPlan
              ? `${inviteDisplay} ${t("subscription.invitesPool")}`
              : `${inviteDisplay} ${t("subscription.invitesEvent")}`}
          </p>
        )}
        {featuresArray.length > 0 && (
          <ul className={styles.planFeatures}>
            {featuresArray.map((feature, index) => (
              <li key={index} className={styles.featureItem}>
                <FaCheck className={styles.featureCheckIcon} />
                <span>{getLocalized(feature, "label", i18n.language)}</span>
              </li>
            ))}
          </ul>
        )}
        {isSelected && (
          <div className={styles.selectedIndicator}>
            <FaCheck className={styles.selectedCheckIcon} />
          </div>
        )}
      </div>
    );
  };

  const eventPlans = plansData?.data?.event || [];
  const quarterlyPlan = plansData?.data?.quarterly?.[0];
  const annualPlan = plansData?.data?.annual?.[0];
  const isSubmitting = updateSubscription.isPending;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.headerTitle}>
          <FaCrown className={styles.crownIcon} />
          {t("subscription.manageTitle")}
        </h2>
        <button onClick={onClose} className={styles.closeButton}>
          <Image width={24} height={24} src="/svg/admin/close.svg" alt="close" />
        </button>
      </div>

      <div className={styles.whitelabelInfo}>
        <p>
          <strong>{t("subscription.whitelabel")}:</strong>{" "}
          {whitelabel?.username || whitelabel?.roleData?.platformName || "N/A"}
        </p>
        {currentSubscription?.planCode && (
          <p>
            <strong>{t("subscription.currentPlan")}:</strong>{" "}
            <span className={styles.currentPlanBadge}>
              {currentSubscription.planCode}
            </span>
          </p>
        )}
      </div>

      {plansLoading ? (
        <SimpleLoading />
      ) : (
        <>
          {eventPlans.length > 0 && (
            <div>
              <h4 className={styles.sectionLabel}>
                {t("subscription.eventPlans")}
              </h4>
              <div className={styles.plansGrid}>
                {eventPlans.map(renderPlanCard)}
              </div>
            </div>
          )}

          {quarterlyPlan && (
            <div>
              <h4 className={styles.sectionLabel}>
                {t("subscription.quarterlyPlan")}
              </h4>
              <div className={styles.plansGrid}>
                {renderPlanCard(quarterlyPlan)}
              </div>
            </div>
          )}

          {annualPlan && (
            <div>
              <h4 className={styles.sectionLabel}>
                {t("subscription.annualPlan")}
              </h4>
              <div className={styles.plansGrid}>
                {renderPlanCard(annualPlan)}
              </div>
            </div>
          )}
        </>
      )}

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.cancelButton}
          onClick={onClose}
          disabled={isSubmitting}
        >
          {t("subscription.cancel")}
        </button>
        <button
          type="button"
          className={styles.submitButton}
          onClick={handleSubmit}
          disabled={isSubmitting || plansLoading || !selectedPlan}
        >
          {isSubmitting
            ? t("subscription.updating")
            : currentSubscription
            ? t("subscription.updatePlan")
            : t("subscription.assignPlan")}
        </button>
      </div>
    </div>
  );
};

export default WhitelabelSubscriptionPopup;
