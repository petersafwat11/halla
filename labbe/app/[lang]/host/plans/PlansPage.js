"use client";
import { useQueryClient } from "@tanstack/react-query";
import { IoIosArrowForward } from "react-icons/io";

import {
  CurrentPlanCard,
  BillingTypeToggle,
  AddonsSection,
  HostPlanCard,
} from "./_components";
import Summary from "./summary/Summary";
import SimpleLoading from "@/ui/common/loading/SimpleLoading";
import { usePlansPageState } from "./_hooks/usePlansPageState";
import styles from "./plans.module.css";

const PlansPage = () => {
  const queryClient = useQueryClient();
  const {
    t,
    router,
    lang,
    subscription,
    usage,
    basicPlans,
    premiumPlans,
    isLoading,
    plansError,
    subError,
    showSummary,
    billingType,
    setBillingType,
    selectedPlan,
    selectedFamily,
    selectedInvites,
    setSelectedInvites,
    setAppliedDiscountCode,
    addonItems,
    addonTotal,
    paymentMethod,
    setPaymentMethod,
    setCardData,
    setStcMobile,
    compensationInvites,
    basicFeatures,
    premiumFeatures,
    handleInviteChange,
    handleAddonsChange,
    handleSubscribe,
    handleProceedToPayment,
    handleBack,
  } = usePlansPageState();

  if (showSummary) {
    return (
      <Summary
        selectedPlan={{
          ...selectedPlan,
          price: selectedPlan?.price || 0,
          invites: selectedInvites,
        }}
        planFamily={selectedFamily}
        billingType={billingType}
        addonItems={addonItems}
        addonTotal={addonTotal}
        onDiscountApply={(code) => setAppliedDiscountCode(code)}
        onProceedToPayment={handleProceedToPayment}
        onBack={handleBack}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        onCardChange={setCardData}
        onMobileChange={setStcMobile}
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
        <p className={styles.pageSubtitle}>{t("pageSubtitle")}</p>
      </div>

      {isLoading ? (
        <SimpleLoading message={t("loading")} />
      ) : plansError || subError ? (
        <div className={styles.errorState}>
          <p>{t("errors.loadFailed")}</p>
          <button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["plans"] });
              queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
            }}
          >
            {t("loading")}
          </button>
        </div>
      ) : (
        <div className={styles.content}>
          <CurrentPlanCard subscription={subscription} usage={usage} />

          <div className={styles.billingToggleWrap}>
            <BillingTypeToggle
              billingType={billingType}
              onChange={(val) => {
                setBillingType(val);
                setSelectedInvites(null);
              }}
              t={t}
            />
          </div>

          <div className={styles.plansGrid}>
            <HostPlanCard
              planFamily="basic"
              plans={basicPlans}
              billingType={billingType}
              selectedInvites={selectedInvites}
              onInviteChange={handleInviteChange}
              features={basicFeatures}
              compensationCount={compensationInvites}
              onSubscribe={(plan) => handleSubscribe("basic", plan)}
            />
            <HostPlanCard
              planFamily="premium"
              isPopular
              plans={premiumPlans}
              billingType={billingType}
              selectedInvites={selectedInvites}
              onInviteChange={handleInviteChange}
              features={premiumFeatures}
              compensationCount={compensationInvites}
              onSubscribe={(plan) => handleSubscribe("premium", plan)}
            />
          </div>

          <AddonsSection onAddonsChange={handleAddonsChange} />

          <div className={styles.infoNote}>
            <span className={styles.infoIcon}>💡</span>
            <p>{String(t("infoNote") || "")}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlansPage;
