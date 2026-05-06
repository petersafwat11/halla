"use client";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import styles from "./page.module.css";
import useAuthStore from "@/stores/authStore";
import plansService from "@/services/plansService";
import subscriptionService from "@/services/subscriptionService";
import { handleError } from "@/services/errorHandlingService";
import { toastUtils } from "@/utils/toastUtils";
import Summary from "@/app/[lang]/host/plans/summary/Summary";
import CurrentPlanCard from "./_components/CurrentPlanCard";
import PlanCard from "./_components/PlanCard";

const PlansPage = () => {
  const { t } = useTranslation("whitelabelPlans");
  const { user, subscription, setSubscription, isWhitelabel } = useAuthStore();
  const router = useRouter();
  const { lang } = useParams();

  const [subscribing, setSubscribing] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [selectedPlanForSummary, setSelectedPlanForSummary] = useState(null);
  const [appliedDiscountCode, setAppliedDiscountCode] = useState("");

  useEffect(() => {
    if (user && !isWhitelabel()) {
      router.replace(`/${lang}/admin-dash`);
    }
  }, [user, isWhitelabel, router, lang]);

  const { data: plans = [], isLoading, error } = useQuery({
    queryKey: ["admin", "enterprise-plans"],
    queryFn: async () => {
      const res = await plansService.getEnterprisePlans();
      return [
        ...(res?.event || []),
        ...(res?.quarterly || []),
        ...(res?.annual || []),
      ];
    },
    enabled: !!user && isWhitelabel(),
  });

  const handleSubscribe = (plan) => {
    const price = plan.pricing?.oneTime?.amount ?? plan.pricing?.oneTime ?? null;
    setSelectedPlanForSummary({
      ...plan,
      price,
      planType: "enterprise",
      nameAr: plan.nameAr,
      nameEn: plan.nameEn,
      limits: plan.limits,
    });
    setShowSummary(true);
  };

  const handleProceedToPayment = useCallback(async () => {
    if (!selectedPlanForSummary) return;
    try {
      setSubscribing(selectedPlanForSummary.code);
      const response = await subscriptionService.subscribe({
        planCode: selectedPlanForSummary.code,
        ...(appliedDiscountCode ? { discountCode: appliedDiscountCode } : {}),
      });
      if (response?.data) {
        setSubscription(response.data);
        toastUtils.success(t("plansPage.successMessage"));
        setShowSummary(false);
        setSelectedPlanForSummary(null);
      }
    } catch (err) {
      handleError(err, t, { fallbackMessage: "plansPage.failedMessage" });
    } finally {
      setSubscribing(null);
    }
  }, [selectedPlanForSummary, appliedDiscountCode, t, setSubscription]);

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
              isSubscribing={subscribing === plan.code}
              onSubscribe={handleSubscribe}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlansPage;
