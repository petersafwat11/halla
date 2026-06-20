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
 *  - lets an ACTIVE business self-upgrade to another business plan and checkout
 *    via the same /payments/checkout flow (backend accepts business plan codes
 *    for an active business account)
 *  - blocks self-purchase entirely when the business has no active subscription
 *    (no-sub UX — an admin must activate the first plan)
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

  // A business may only self-upgrade once it already has an active (or trial)
  // subscription. /subscriptions/my only ever returns an active/trial row, so
  // the mere presence of a subscription with one of those statuses is enough.
  const hasActiveSubscription =
    !!subscription &&
    ["active", "trial"].includes(subscription.status);

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
      if (!hasActiveSubscription) {
        // No-sub UX: self-purchase is disabled until an admin activates a plan.
        toastUtils.error(t("business.noSub.purchaseBlocked"));
        return;
      }
      setSelectedPlan(plan);
      setSelectedFamily("business");
      setShowSummary(true);
    },
    [hasActiveSubscription, t]
  );

  const handleProceedToPayment = useCallback(async () => {
    if (!selectedPlan) return;
    if (!hasActiveSubscription) {
      toastUtils.error(t("business.noSub.purchaseBlocked"));
      return;
    }
    try {
      const result = await checkoutMutation.mutateAsync({
        planCode: selectedPlan.code,
        addons: [],
        ...(appliedDiscountCode ? { discountCode: appliedDiscountCode } : {}),
        source: buildSource(),
      });
      if (result?.requiresAction) {
        // useCheckout already redirected to the 3DS URL; skip the toast.
        return;
      }
      toastUtils.success(t("toasts.subscriptionCreated"));
      router.push(`/${lang}/host`);
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || "";
      toastUtils.error(message || t("toasts.subscriptionFailed"));
    }
  }, [
    selectedPlan,
    hasActiveSubscription,
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
