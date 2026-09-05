"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useRouter, useParams } from "next/navigation";
import { toastUtils } from "@/utils/toastUtils";
import { useBusinessPlans } from "@/hooks/plans";
import { useMySubscription } from "@/hooks/subscriptions";
import { useCheckout } from "@/hooks/checkout";

// Business plans are grouped by billing family: { event, quarterly, annual }.
// Each family is a flat list of plans (no basic/premium split like host).
const BUSINESS_FAMILIES = ["event", "quarterly", "annual"];

/**
 * Business variant of the plans page state. Mirrors usePlansPageState but:
 *  - reads /plans/business ({ event, quarterly, annual }) instead of /plans/host
 *  - lets an eligible business account self-purchase its FIRST plan and
 *    upgrade/downgrade among business plans via /payments/checkout (DEC-02,
 *    signed 2026-07-01 — no admin pre-activation required; the backend enforces
 *    audience eligibility). Admin assignment remains available but is not the
 *    only path.
 *  - current plan is matched by EXACT plan code, never planType (P0-12), so two
 *    business tiers that share a planType don't both read as "current".
 */
export const useBusinessPlansPageState = () => {
  const { t } = useTranslation("plans");
  const router = useRouter();
  const { lang } = useParams();

  const { data: plansData, isLoading: plansLoading, error: plansError } = useBusinessPlans();
  const { data: subscriptionData, isLoading: subLoading, error: subError } = useMySubscription();
  const checkoutMutation = useCheckout();

  const [showSummary, setShowSummary] = useState(false);
  const [billingType, setBillingType] = useState("event");
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedFamily, setSelectedFamily] = useState("business");
  const [appliedDiscountCode, setAppliedDiscountCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("creditcard");
  const [cardData, setCardData] = useState(null);
  const [stcMobile, setStcMobile] = useState("");

  const actualPlansData = plansData?.data ?? plansData ?? null;
  const subscription = subscriptionData?.data?.subscription ?? null;
  const usage = subscription?.usage || null;

  // Retained for display (welcome vs. current-plan UI). It NO LONGER gates
  // purchase — an eligible business self-purchases its first plan (DEC-02).
  const hasActiveSubscription =
    !!subscription &&
    ["active", "trial"].includes(subscription.status);

  // Exact current-plan code (never planType — P0-12).
  const currentPlanCode =
    subscription?.planCode || subscription?.planId?.code || subscription?.code || null;
  const isCurrentPlan = useCallback(
    (plan) => !!plan && !!currentPlanCode && plan.code === currentPlanCode,
    [currentPlanCode]
  );

  const plansByFamily = useMemo(() => {
    const out = {};
    BUSINESS_FAMILIES.forEach((fam) => {
      out[fam] = Array.isArray(actualPlansData?.[fam]) ? actualPlansData[fam] : [];
    });
    return out;
  }, [actualPlansData]);

  const currentPlans = plansByFamily[billingType] || [];

  const isLoading = plansLoading || subLoading;

  // Reset any in-flight selection when switching billing family.
  useEffect(() => {
    setSelectedPlan(null);
    setShowSummary(false);
  }, [billingType]);

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

  const handleSelectPlan = useCallback(
    (plan) => {
      if (!plan) return;
      // DEC-02: eligible business accounts self-purchase (incl. first plan).
      setSelectedPlan(plan);
      setSelectedFamily("business");
      setShowSummary(true);
    },
    []
  );

  const handleProceedToPayment = useCallback(async (quote) => {
    if (!selectedPlan) return;
    try {
      const result = await checkoutMutation.mutateAsync({
        planCode: selectedPlan.code,
        addons: [],
        ...(appliedDiscountCode ? { discountCode: appliedDiscountCode } : {}),
        source: buildSource(),
        expectedAmount: quote?.total,
        expectedTotal: quote?.total,
        quoteId: quote?.quoteId,
        quoteExpiresAt: quote?.quoteExpiresAt,
      });
      if (result?.requiresAction) {
        // useCheckout already redirected to the 3DS URL; skip the toast.
        return;
      }
      toastUtils.success(t("toasts.subscriptionCreated"));
      router.push(`/${lang}/host`);
    } catch (error) {
      const code = error?.response?.data?.code || error?.data?.code || error?.code;
      if (["QUOTE_REQUIRED", "QUOTE_EXPIRED", "QUOTE_CHANGED"].includes(code)) {
        throw error;
      }
      const message = error?.response?.data?.message || error?.message || "";
      toastUtils.error(message || t("toasts.subscriptionFailed"));
    }
  }, [
    selectedPlan,
    checkoutMutation,
    appliedDiscountCode,
    buildSource,
    t,
    router,
    lang,
  ]);

  const handleBackToPlans = useCallback(() => {
    setShowSummary(false);
    setSelectedPlan(null);
  }, []);

  return {
    // i18n + nav
    t,
    router,
    lang,

    // data
    subscription,
    usage,
    hasActiveSubscription,
    currentPlanCode,
    isCurrentPlan,
    currentPlans,
    isLoading,
    plansError,
    subError,

    // selection state
    showSummary,
    billingType,
    setBillingType,
    selectedPlan,
    selectedFamily,
    appliedDiscountCode,
    setAppliedDiscountCode,
    paymentMethod,
    setPaymentMethod,
    setCardData,
    setStcMobile,
    cardData,
    stcMobile,

    // handlers
    handleSelectPlan,
    handleProceedToPayment,
    handleBackToPlans,
  };
};
