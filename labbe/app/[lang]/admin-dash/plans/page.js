"use client";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter, useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import styles from "./page.module.css";
import useAuthStore from "@/stores/authStore";
import { useBusinessPlans } from "@/hooks/reactQueryHooks/usePlans";
import { useCheckout } from "@/hooks/reactQueryHooks/useCheckout";
import { handleError } from "@/services/errorHandlingService";
import { toastUtils } from "@/utils/toastUtils";
import Summary from "@/app/[lang]/host/plans/summary/Summary";
import ErrorBoundary from "@/ui/common/error/ErrorBoundary";
import CurrentPlanCard from "./_components/CurrentPlanCard";
import PlanCard from "./_components/PlanCard";

const PlansPageInner = () => {
  const { t } = useTranslation("businessPlans");
  const { user, subscription, isWhitelabel } = useAuthStore();
  const router = useRouter();
  const { lang } = useParams();
  const queryClient = useQueryClient();
  const checkoutMutation = useCheckout();

  const [showSummary, setShowSummary] = useState(false);
  const [selectedPlanForSummary, setSelectedPlanForSummary] = useState(null);
  const [appliedDiscountCode, setAppliedDiscountCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("creditcard");
  const [cardData, setCardData] = useState(null);
  const [stcMobile, setStcMobile] = useState("");

  useEffect(() => {
    if (user && !isWhitelabel()) {
      router.replace(`/${lang}/admin-dash`);
    }
  }, [user, isWhitelabel, router, lang]);

  const { data: businessPlansResponse, isLoading, error } = useBusinessPlans({
    enabled: !!user && isWhitelabel(),
  });
  const businessPlansData = businessPlansResponse?.data ?? {};
  const plans = [
    ...(businessPlansData?.event || []),
    ...(businessPlansData?.quarterly || []),
    ...(businessPlansData?.annual || []),
  ];

  const handleSubscribe = (plan) => {
    setSelectedPlanForSummary({
      ...plan,
      price: plan.pricing?.oneTime ?? null,
    });
    setShowSummary(true);
  };

  const buildSource = useCallback(() => {
    if (paymentMethod === "creditcard") {
      return {
        type: "creditcard",
        name: cardData?.name,
        number: cardData?.number,
        month: Number(cardData?.month),
        year: Number(cardData?.year),
        cvc: cardData?.cvc,
      };
    }
    if (paymentMethod === "stcpay") {
      return { type: "stcpay", mobile: stcMobile };
    }
    if (paymentMethod === "applepay") {
      return { type: "applepay", token: null };
    }
    return null;
  }, [paymentMethod, cardData, stcMobile]);

  const handleProceedToPayment = useCallback(async () => {
    if (!selectedPlanForSummary) return;
    try {
      const result = await checkoutMutation.mutateAsync({
        planCode: selectedPlanForSummary.code,
        addons: [],
        ...(appliedDiscountCode ? { discountCode: appliedDiscountCode } : {}),
        source: buildSource(),
      });
      if (result?.requiresAction) {
        // useCheckout already redirected via window.location; skip the toast.
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      toastUtils.success(t("plansPage.successMessage"));
      setShowSummary(false);
      setSelectedPlanForSummary(null);
    } catch (err) {
      handleError(err, t, { fallbackMessage: "plansPage.failedMessage" });
    }
  }, [
    selectedPlanForSummary,
    appliedDiscountCode,
    buildSource,
    checkoutMutation,
    queryClient,
    t,
  ]);

  const handleBackFromSummary = useCallback(() => {
    setShowSummary(false);
    setSelectedPlanForSummary(null);
  }, []);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>{t("plansPage.loading")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>{t("plansPage.error")}</p>
        </div>
      </div>
    );
  }

  if (showSummary && selectedPlanForSummary) {
    return (
      <Summary
        selectedPlan={selectedPlanForSummary}
        onDiscountApply={(code) => setAppliedDiscountCode(code)}
        onProceedToPayment={handleProceedToPayment}
        onBack={handleBackFromSummary}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        onCardChange={setCardData}
        onMobileChange={setStcMobile}
      />
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t("plansPage.title")}</h1>
        <p className={styles.subtitle}>{t("plansPage.subtitle")}</p>
      </div>

      <CurrentPlanCard subscription={subscription} plans={plans} />

      <div className={styles.plansSection}>
        <h2 className={styles.sectionTitle}>
          {t("plansPage.availablePlans.title")}
        </h2>
        <p className={styles.sectionSubtitle}>
          {t("plansPage.availablePlans.subtitle")}
        </p>

        <div className={styles.plansGrid}>
          {plans.map((plan) => (
            <PlanCard
              key={plan.code}
              plan={plan}
              isCurrent={plan.code === subscription?.plan?.code}
              isSubscribing={
                checkoutMutation.isPending &&
                selectedPlanForSummary?.code === plan.code
              }
              onSubscribe={handleSubscribe}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const PlansPage = () => (
  <ErrorBoundary>
    <PlansPageInner />
  </ErrorBoundary>
);

export default PlansPage;
