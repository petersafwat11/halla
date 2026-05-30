"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter, useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { FaSpinner, FaExclamationTriangle, FaCheck } from "react-icons/fa";
import styles from "./page.module.css";
import useAuthStore from "@/stores/authStore";
import { useBusinessPlans } from "@/hooks/plans";
import { useCheckout } from "@/hooks/checkout";
import { subscriptionsKeys } from "@/hooks/subscriptions/keys";
import { plansKeys } from "@/hooks/plans/keys";
import { handleError } from "@/services/errorHandlingService";
import { toastUtils } from "@/utils/toastUtils";
import { getLocalized } from "@halla/shared/utils/locale";
import Summary from "@/app/[lang]/host/plans/summary/Summary";
import ErrorBoundary from "@/ui/common/error/ErrorBoundary";
import PlanDescription from "@/ui/plans/PlanDescription/PlanDescription";
import SarIcon from "@/ui/commen/SarIcon/SarIcon";
import CurrentPlanCard from "./_components/CurrentPlanCard";

const formatPrice = (n) => (n || 0).toLocaleString();

function EventPlanSelector({ plans, selectedCode, isCurrent, isSubscribing, onSelect, onSubscribe, t, lang }) {
  const selectedPlan = plans.find((p) => p.code === selectedCode) || plans[0];
  const selectedInvites = selectedPlan?.limits?.maxInvitesPerEvent || 0;

  return (
    <div className={styles.hostCard}>
      <div className={styles.guestTrack}>
        {plans.map((plan) => (
          <button
            key={plan.code}
            type="button"
            className={`${styles.guestBtn} ${selectedCode === plan.code ? styles.guestBtnActive : ""}`}
            onClick={() => onSelect(plan.code)}
          >
            <span className={styles.guestNum}>
              {plan.limits?.maxInvitesPerEvent || 0}
            </span>
            <span className={styles.guestUnit}>{t("plansPage.inviteUnit")}</span>
          </button>
        ))}
      </div>

      <div className={styles.hostPrice}>
        <span className={styles.hostPriceNum}>
          {formatPrice(selectedPlan?.pricing?.oneTime)}
        </span>
        <SarIcon size="1.5rem" className={styles.hostPriceCur} />
      </div>

      <div className={styles.featSection}>
        <PlanDescription
          plan={selectedPlan}
          lang={lang}
          selectedInviteCount={selectedInvites}
          showDuration={false}
          size="large"
          inlineExtras
        />
      </div>

      <button
        type="button"
        className={`${styles.ctaBtn} ${isCurrent ? styles.ctaBtnDisabled : styles.ctaBtnActive}`}
        onClick={() => !isCurrent && onSubscribe && onSubscribe()}
        disabled={isCurrent || isSubscribing}
      >
        {isSubscribing
          ? t("plansPage.planCard.subscribing")
          : isCurrent
            ? t("plansPage.planCard.currentPlan")
            : t("plansPage.planCard.subscribeNow")}
      </button>
    </div>
  );
}

function PoolPlanCard({ plan, type, isSelected, isCurrent, isSubscribing, onSelect, onSubscribe, t, i18n, lang }) {
  return (
    <div
      className={`${styles.planCard} ${isSelected ? styles.planCardSelected : ""}`}
      onClick={() => !isCurrent && onSelect(plan.code)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !isCurrent) onSelect(plan.code);
      }}
    >
      {isSelected && (
        <div className={styles.selectedBadge}>
          <FaCheck />
          <span>{t("plansPage.selected")}</span>
        </div>
      )}

      <div className={styles.planCardTop}>
        <div>
          <h3 className={styles.planCardName}>
            {getLocalized(plan, "name", i18n.language)}
          </h3>
        </div>
        <div className={styles.planPriceBox}>
          <div className={styles.planPriceRow}>
            <span className={styles.planPriceNum}>
              {formatPrice(plan.pricing?.oneTime)}
            </span>
            <SarIcon size="1.5rem" className={styles.planPriceCur} />
          </div>
        </div>
      </div>

      <div className={styles.featSection}>
        <PlanDescription
          plan={plan}
          lang={lang}
          showDuration={false}
          size="large"
          inlineExtras
        />
      </div>

      <button
        type="button"
        className={`${styles.ctaBtn} ${isCurrent ? styles.ctaBtnDisabled : styles.ctaBtnActive}`}
        onClick={(e) => {
          e.stopPropagation();
          if (!isCurrent) onSubscribe(plan);
        }}
        disabled={isCurrent || isSubscribing}
      >
        {isSubscribing
          ? t("plansPage.planCard.subscribing")
          : isCurrent
            ? t("plansPage.planCard.currentPlan")
            : t("plansPage.planCard.subscribeNow")}
      </button>
    </div>
  );
}

const PlansPageInner = () => {
  const { t, i18n } = useTranslation("businessPlans");
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
  // Phase 8 — each `|| []` / `?? {}` default below was creating a new
  // reference every render, which made every dependent `useMemo` recompute
  // each pass. Wrapping each fallback in its own `useMemo` keeps references
  // stable until `businessPlansResponse` actually changes.
  const businessPlansData = useMemo(
    () => businessPlansResponse?.data ?? {},
    [businessPlansResponse]
  );

  const eventPlans = useMemo(
    () =>
      [...(businessPlansData?.event || [])].sort(
        (a, b) =>
          (a.limits?.maxInvitesPerEvent || 0) -
          (b.limits?.maxInvitesPerEvent || 0)
      ),
    [businessPlansData]
  );
  const quarterlyPlans = useMemo(
    () => businessPlansData?.quarterly || [],
    [businessPlansData]
  );
  const annualPlans = useMemo(
    () => businessPlansData?.annual || [],
    [businessPlansData]
  );

  const hasEvent = eventPlans.length > 0;
  const hasQuarterly = quarterlyPlans.length > 0;
  const hasAnnual = annualPlans.length > 0;

  const [activeType, setActiveType] = useState("event");

  useEffect(() => {
    if (hasEvent) setActiveType("event");
    else if (hasQuarterly) setActiveType("quarterly");
    else if (hasAnnual) setActiveType("annual");
  }, [hasEvent, hasQuarterly, hasAnnual]);

  const visiblePlans = useMemo(() => {
    if (activeType === "event") return eventPlans;
    if (activeType === "quarterly") return quarterlyPlans;
    return annualPlans;
  }, [activeType, eventPlans, quarterlyPlans, annualPlans]);

  const [selectedPlanCode, setSelectedPlanCode] = useState(null);

  useEffect(() => {
    if (visiblePlans.length > 0 && !visiblePlans.some((p) => p.code === selectedPlanCode)) {
      setSelectedPlanCode(visiblePlans[0].code);
    }
  }, [visiblePlans, selectedPlanCode]);

  const allPlans = useMemo(
    () => [...eventPlans, ...quarterlyPlans, ...annualPlans],
    [eventPlans, quarterlyPlans, annualPlans]
  );

  const currentPlanCode = subscription?.plan?.code;

  const handleSelect = (code) => {
    setSelectedPlanCode(code);
  };

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
        return;
      }
      queryClient.invalidateQueries({ queryKey: subscriptionsKeys.all });
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
        <div className={styles.stateBox}>
          <FaSpinner className={styles.spinner} />
          <p>{t("plansPage.loading")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.stateBox}>
          <FaExclamationTriangle className={styles.errorIcon} />
          <p>{t("plansPage.error")}</p>
          <button
            type="button"
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: plansKeys.business() })
            }
            className={styles.retryBtn}
          >
            {t("plansPage.retry")}
          </button>
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
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t("plansPage.title")}</h1>
        <p className={styles.pageSubtitle}>{t("plansPage.subtitle")}</p>
      </div>

      <CurrentPlanCard subscription={subscription} plans={allPlans} />

      <div className={styles.selectorBox}>
        <div className={styles.toggleRow}>
          {hasEvent && (
            <button
              type="button"
              className={`${styles.toggleBtn} ${activeType === "event" ? styles.toggleActive : ""}`}
              onClick={() => setActiveType("event")}
            >
              {t("plansPage.perEventPlans")}
            </button>
          )}
          {hasQuarterly && (
            <button
              type="button"
              className={`${styles.toggleBtn} ${activeType === "quarterly" ? styles.toggleActive : ""}`}
              onClick={() => setActiveType("quarterly")}
            >
              {t("plansPage.quarterlyPlans")}
            </button>
          )}
          {hasAnnual && (
            <button
              type="button"
              className={`${styles.toggleBtn} ${activeType === "annual" ? styles.toggleActive : ""}`}
              onClick={() => setActiveType("annual")}
            >
              {t("plansPage.annualPlans")}
            </button>
          )}
        </div>
      </div>

      <div className={styles.plansArea}>
        {activeType === "event" && (
          <EventPlanSelector
            plans={eventPlans}
            selectedCode={selectedPlanCode}
            isCurrent={
              eventPlans.some(
                (p) => p.code === currentPlanCode && selectedPlanCode === p.code
              )
            }
            isSubscribing={
              checkoutMutation.isPending &&
              selectedPlanForSummary?.code === selectedPlanCode
            }
            onSelect={handleSelect}
            onSubscribe={() => {
              const plan = eventPlans.find((p) => p.code === selectedPlanCode);
              if (plan && plan.code !== currentPlanCode) handleSubscribe(plan);
            }}
            t={t}
            lang={lang}
          />
        )}

        {activeType === "quarterly" && (
          <div
            className={
              quarterlyPlans.length === 1 ? styles.singlePlanWrap : styles.planGrid
            }
          >
            {quarterlyPlans.map((plan) => (
              <PoolPlanCard
                key={plan.code}
                plan={plan}
                type="quarterly"
                isSelected={selectedPlanCode === plan.code}
                isCurrent={plan.code === currentPlanCode}
                isSubscribing={
                  checkoutMutation.isPending &&
                  selectedPlanForSummary?.code === plan.code
                }
                onSelect={handleSelect}
                onSubscribe={(p) => {
                  if (p.code !== currentPlanCode) handleSubscribe(p);
                }}
                t={t}
                i18n={i18n}
                lang={lang}
              />
            ))}
          </div>
        )}

        {activeType === "annual" && (
          <div
            className={
              annualPlans.length === 1 ? styles.singlePlanWrap : styles.planGrid
            }
          >
            {annualPlans.map((plan) => (
              <PoolPlanCard
                key={plan.code}
                plan={plan}
                type="annual"
                isSelected={selectedPlanCode === plan.code}
                isCurrent={plan.code === currentPlanCode}
                isSubscribing={
                  checkoutMutation.isPending &&
                  selectedPlanForSummary?.code === plan.code
                }
                onSelect={handleSelect}
                onSubscribe={(p) => {
                  if (p.code !== currentPlanCode) handleSubscribe(p);
                }}
                t={t}
                i18n={i18n}
                lang={lang}
              />
            ))}
          </div>
        )}
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
