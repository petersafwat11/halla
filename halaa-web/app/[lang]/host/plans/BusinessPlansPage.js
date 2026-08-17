"use client";
import { useQueryClient } from "@tanstack/react-query";
import { IoIosArrowForward } from "react-icons/io";

import {
  CurrentPlanCard,
  BusinessPlanCard,
  BusinessBillingToggle,
} from "./_components";
import Summary from "./summary/Summary";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import { useBusinessPlansPageState } from "./_hooks/useBusinessPlansPageState";
import { subscriptionsKeys } from "@/hooks/subscriptions/keys";
import { plansKeys } from "@/hooks/plans/keys";
import styles from "./plans.module.css";

/**
 * Business variant of the plans page. An eligible business account can browse
 * the business plans and self-purchase — including its FIRST plan — through the
 * shared checkout Summary (DEC-02, signed 2026-07-01). No admin pre-activation
 * is required; the backend enforces audience eligibility. The current plan is
 * matched by EXACT code and rendered as "current" (its CTA disabled).
 */
const BusinessPlansPage = () => {
  const queryClient = useQueryClient();
  const {
    t,
    router,
    lang,
    subscription,
    usage,
    hasActiveSubscription,
    isCurrentPlan,
    currentPlans,
    isLoading,
    plansError,
    subError,
    showSummary,
    billingType,
    setBillingType,
    selectedPlan,
    selectedFamily,
    setAppliedDiscountCode,
    paymentMethod,
    setPaymentMethod,
    setCardData,
    setStcMobile,
    cardData,
    stcMobile,
    handleSelectPlan,
    handleProceedToPayment,
    handleBackToPlans,
  } = useBusinessPlansPageState();

  if (showSummary) {
    return (
      <Summary
        selectedPlan={{
          ...selectedPlan,
          price:
            selectedPlan?.price ?? selectedPlan?.pricing?.oneTime ?? 0,
        }}
        planFamily={selectedFamily}
        billingType={billingType === "event" ? "event" : "monthly"}
        addonItems={[]}
        addonTotal={0}
        onDiscountApply={(code) => setAppliedDiscountCode(code)}
        onProceedToPayment={handleProceedToPayment}
        onBack={handleBackToPlans}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        onCardChange={setCardData}
        onMobileChange={setStcMobile}
        cardData={cardData}
        stcMobile={stcMobile}
      />
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>
          <IoIosArrowForward
            onClick={() => router.push(`/${lang}/host`)}
            className={styles.backArrow}
          />
          {t("pageTitle")}
        </h1>
        <p className={styles.pageSubtitle}>{t("business.subtitle")}</p>
      </div>

      {isLoading ? (
        <SimpleLoading message={t("loading")} />
      ) : plansError || subError ? (
        <div className={styles.errorState}>
          <p>{t("errors.loadFailed")}</p>
          <button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: plansKeys.all });
              queryClient.invalidateQueries({ queryKey: subscriptionsKeys.all });
            }}
          >
            {t("buttons.retry")}
          </button>
        </div>
      ) : (
        <div className={styles.content}>
          {!hasActiveSubscription && (
            <p className={styles.pageSubtitle}>{t("business.getStarted.subtitle")}</p>
          )}

          <CurrentPlanCard subscription={subscription} usage={usage} />

          <div className={styles.billingToggleWrap}>
            <BusinessBillingToggle
              billingType={billingType}
              onChange={setBillingType}
              t={t}
            />
          </div>

          {currentPlans.length === 0 ? (
            <p className={styles.pageSubtitle}>{t("business.noPlans")}</p>
          ) : (
            <div className={styles.plansGrid}>
              {currentPlans.map((plan, idx) => (
                <BusinessPlanCard
                  key={plan.code || plan.id || idx}
                  plan={plan}
                  billingType={billingType}
                  isPopular={idx === 1}
                  // Only the current plan is disabled — first purchase + up/downgrade
                  // are allowed for eligible business accounts (DEC-02).
                  isCurrent={isCurrentPlan(plan)}
                  disabled={isCurrentPlan(plan)}
                  lang={lang}
                  ctaLabel={
                    isCurrentPlan(plan)
                      ? t("business.currentBadge")
                      : t("buttons.subscribeNow")
                  }
                  onSelect={handleSelectPlan}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BusinessPlansPage;
