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
import { useMyAddons } from "@/hooks/addons";
import CustomDesignTimeline from "@/components/addons/CustomDesignTimeline";
import { subscriptionsKeys } from "@/hooks/subscriptions/keys";
import { plansKeys } from "@/hooks/plans/keys";
import styles from "./plans.module.css";

const PlansPage = () => {
  const queryClient = useQueryClient();
  const { data: myAddonsData } = useMyAddons();
  const myAddons = myAddonsData?.data?.items || myAddonsData?.items || [];
  const customDesignAddons = myAddons.filter((a) => a.addonType === "design_template");
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
    showAddons,
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
    cardData,
    stcMobile,
    handleInviteChange,
    handleAddonsChange,
    handleSubscribe,
    handleProceedToPayment,
    handleBack,
    handleContinueToSummary,
    handleBackToAddons,
    handleBackToPlans,
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
        onBack={handleBackToAddons}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        onCardChange={setCardData}
        onMobileChange={setStcMobile}
        cardData={cardData}
        stcMobile={stcMobile}
      />
    );
  }

  if (showAddons) {
    return (
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>
            <IoIosArrowForward
              onClick={handleBackToPlans}
              className={styles.backArrow}
            />
            {t("addons.title")}
          </h1>
          <p className={styles.pageSubtitle}>{t("addons.subtitle")}</p>
        </div>

        <div className={styles.content}>
          <AddonsSection onAddonsChange={handleAddonsChange} />

          <div className={styles.addonsFooter}>
            <button
              type="button"
              className={styles.continueBtn}
              onClick={handleContinueToSummary}
            >
              {t("buttons.continueToSummary")}
            </button>
          </div>
        </div>
      </div>
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
              queryClient.invalidateQueries({ queryKey: plansKeys.all });
              queryClient.invalidateQueries({ queryKey: subscriptionsKeys.all });
            }}
          >
            {t("buttons.retry")}
          </button>
        </div>
      ) : (
        <div className={styles.content}>
          <CurrentPlanCard subscription={subscription} usage={usage} />

          {customDesignAddons.length > 0 && (
            <div className={styles.customDesignsSection} data-testid="host-custom-designs-section">
              {customDesignAddons.map((addon) => (
                <CustomDesignTimeline key={addon.id || addon._id} addon={addon} />
              ))}
            </div>
          )}

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
              lang={lang}
              onSubscribe={(plan) => handleSubscribe("basic", plan)}
            />
            <HostPlanCard
              planFamily="premium"
              isPopular
              plans={premiumPlans}
              billingType={billingType}
              selectedInvites={selectedInvites}
              onInviteChange={handleInviteChange}
              lang={lang}
              onSubscribe={(plan) => handleSubscribe("premium", plan)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PlansPage;
