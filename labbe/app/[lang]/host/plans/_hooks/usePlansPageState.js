"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useRouter, useParams } from "next/navigation";
import { toastUtils } from "@/utils/toastUtils";
import { useHostPlans } from "@/hooks/plans";
import { useMySubscription } from "@/hooks/subscriptions";
import { useCheckout } from "@/hooks/checkout";

const getInviteValue = (plan, billingType) => {
  if (billingType === "monthly") return plan.invitePool ?? 0;
  return plan.invites ?? 0;
};

export const usePlansPageState = () => {
  const { t } = useTranslation("plans");
  const router = useRouter();
  const { lang } = useParams();

  const { data: plansData, isLoading: plansLoading, error: plansError } = useHostPlans();
  const { data: subscriptionData, isLoading: subLoading, error: subError } = useMySubscription();
  const checkoutMutation = useCheckout();

  const [showSummary, setShowSummary] = useState(false);
  const [showAddons, setShowAddons] = useState(false);
  const [billingType, setBillingType] = useState("event");
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedFamily, setSelectedFamily] = useState("basic");
  const [selectedInvites, setSelectedInvites] = useState(null);
  const [appliedDiscountCode, setAppliedDiscountCode] = useState("");
  const [addonItems, setAddonItems] = useState([]);
  const [addonTotal, setAddonTotal] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("creditcard");
  const [cardData, setCardData] = useState(null);
  const [stcMobile, setStcMobile] = useState("");

  const actualPlansData = plansData?.data ?? null;
  const subscription = subscriptionData?.data?.subscription ?? null;
  const usage = subscription?.usage || null;

  const basicPlans = useMemo(
    () =>
      Array.isArray(actualPlansData?.basic?.[billingType])
        ? actualPlansData.basic[billingType]
        : [],
    [actualPlansData, billingType]
  );
  const premiumPlans = useMemo(
    () =>
      Array.isArray(actualPlansData?.premium?.[billingType])
        ? actualPlansData.premium[billingType]
        : [],
    [actualPlansData, billingType]
  );

  const isLoading = plansLoading || subLoading;

  useEffect(() => {
    const reference = basicPlans[0] || premiumPlans[0];
    if (reference) {
      setSelectedInvites(getInviteValue(reference, billingType));
    } else {
      setSelectedInvites(null);
    }
  }, [billingType, basicPlans, premiumPlans]);

  const handleInviteChange = useCallback((val) => {
    setSelectedInvites(val);
  }, []);

  // Compensation count is computed inside <PlanDescription> via the
  // COMPENSATION_PERCENTAGE constant (15). The hook no longer derives it.
  // Features come from each plan's `featureBullets` per language.

  const handleAddonsChange = useCallback((items, total) => {
    setAddonItems(items);
    setAddonTotal(total);
  }, []);

  const handleSubscribe = useCallback((family, plan) => {
    if (!plan) return;
    setSelectedFamily(family);
    setSelectedPlan(plan);
    setShowAddons(true);
  }, []);

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
      // applepay token left null until PassKit integration ships.
      return { type: "applepay", token: null };
    }
    return null;
  }, [paymentMethod, cardData, stcMobile]);

  // Map AddonsSection cart into checkout body shape. Scope is forced to
  // pool/org since checkout addons cannot be event-scoped (no event yet at
  // initial subscription).
  const buildCheckoutAddons = useCallback(
    () =>
      addonItems.map((item) => {
        const type = item.addonType || item.type;
        const base = { addonType: type, scope: "org" };
        if (type === "extra_invites") {
          return { ...base, scope: "pool", quantity: item.quantity };
        }
        if (type === "extra_reminders") {
          return { ...base, quantity: item.quantity };
        }
        if (type === "design_template") {
          return { ...base, templateType: item.templateType };
        }
        return base;
      }),
    [addonItems]
  );

  const handleProceedToPayment = useCallback(async () => {
    if (!selectedPlan) return;
    try {
      const result = await checkoutMutation.mutateAsync({
        planCode: selectedPlan.code,
        addons: buildCheckoutAddons(),
        ...(appliedDiscountCode ? { discountCode: appliedDiscountCode } : {}),
        source: buildSource(),
      });
      if (result?.requiresAction) {
        // useCheckout already redirected via window.location; skip the toast.
        return;
      }
      const failedCount = result?.failedAddons?.length || 0;
      if (failedCount > 0) {
        toastUtils.warning(
          t("toasts.subscriptionPartial", { count: failedCount })
        );
      } else {
        toastUtils.success(t("toasts.subscriptionCreated"));
      }
      router.push(`/${lang}/host/create-event`);
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "";
      toastUtils.error(message || t("toasts.subscriptionFailed"));
    }
  }, [
    selectedPlan,
    checkoutMutation,
    appliedDiscountCode,
    buildSource,
    buildCheckoutAddons,
    t,
    router,
    lang,
  ]);

  const handleBack = useCallback(() => setShowSummary(false), []);
  const handleContinueToSummary = useCallback(() => {
    setShowAddons(false);
    setShowSummary(true);
  }, []);
  const handleBackToAddons = useCallback(() => {
    setShowSummary(false);
    setShowAddons(true);
  }, []);
  const handleBackToPlans = useCallback(() => {
    setShowAddons(false);
    setSelectedPlan(null);
    setSelectedFamily("basic");
  }, []);

  return {
    // i18n + nav
    t,
    router,
    lang,

    // data
    subscription,
    usage,
    basicPlans,
    premiumPlans,
    isLoading,
    plansError,
    subError,

    // selection state
    showSummary,
    showAddons,
    billingType,
    setBillingType,
    selectedPlan,
    selectedFamily,
    selectedInvites,
    setSelectedInvites,
    appliedDiscountCode,
    setAppliedDiscountCode,
    addonItems,
    addonTotal,
    paymentMethod,
    setPaymentMethod,
    setCardData,
    setStcMobile,

    // handlers
    handleInviteChange,
    handleAddonsChange,
    handleSubscribe,
    handleProceedToPayment,
    handleBack,
    handleContinueToSummary,
    handleBackToAddons,
    handleBackToPlans,
  };
};
