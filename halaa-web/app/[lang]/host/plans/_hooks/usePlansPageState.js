"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toastUtils } from "@/utils/toastUtils";
import { useHostPlans } from "@/hooks/plans";
import { useMySubscription, subscriptionsKeys } from "@/hooks/subscriptions";
import { buildCreditCardSource } from "@halaa/shared/utils/card";
import { useCheckout } from "@/hooks/checkout";
import { useApplePayToken } from "@/hooks/payments";
import { addonsKeys } from "@/hooks/addons/keys";
import { eventsKeys } from "@/hooks/events/keys";
import { resolveWebCompletionUrl } from "@halaa/shared/utils";

// Shown on the Apple Pay sheet's total line — the merchant name the host sees
// in their wallet, so it stays the brand rather than a translated string.
const APPLE_PAY_MERCHANT_LABEL = "Halaa";

const getInviteValue = (plan, billingType) => {
  if (billingType === "monthly") return plan.invitePool ?? 0;
  return plan.invites ?? 0;
};

export const usePlansPageState = () => {
  const { t } = useTranslation("plans");
  const router = useRouter();
  const { lang } = useParams();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const origin = searchParams?.get("origin") || undefined;
  const returnTo = searchParams?.get("returnTo") || undefined;
  const eventId = searchParams?.get("eventId") || undefined;

  const { data: plansData, isLoading: plansLoading, error: plansError } = useHostPlans();
  const { data: subscriptionData, isLoading: subLoading, error: subError } = useMySubscription();
  const checkoutMutation = useCheckout();
  const { requestToken: requestApplePayToken } = useApplePayToken();

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

  // Async because Apple Pay's token only exists once the host has approved the
  // sheet. It must still be *called* synchronously from the pay click —
  // Safari refuses a PassKit session begun outside the originating gesture —
  // so nothing may be awaited before it on the pay path.
  const buildSource = useCallback(
    async (quote) => {
      if (paymentMethod === "creditcard") {
        return buildCreditCardSource(cardData);
      }
      if (paymentMethod === "stcpay") {
        return { type: "stcpay", mobile: stcMobile };
      }
      if (paymentMethod === "applepay") {
        const authorized = await requestApplePayToken({
          amount: quote?.total,
          currency: quote?.currency || "SAR",
          label: APPLE_PAY_MERCHANT_LABEL,
        });
        // `null` means the host dismissed the Apple Pay sheet — abort quietly
        // rather than surfacing a payment error they did not cause.
        if (!authorized) return null;
        // The sheet is still open; the caller settles it once the charge
        // resolves so its checkmark never precedes a real payment.
        return { type: "applepay", token: authorized.token, __settle: authorized.settle };
      }
      throw new Error(t("checkout.errors.methodUnavailable", "This payment method is not available"));
    },
    [paymentMethod, cardData, stcMobile, requestApplePayToken, t]
  );

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
        if (type === "design_template") {
          return { ...base, templateType: item.templateType };
        }
        return base;
      }),
    [addonItems]
  );

  const handleProceedToPayment = useCallback(async (quote) => {
    if (!selectedPlan) return;
    // Held open by Apple Pay until the charge resolves; settled in `finally`
    // so its checkmark can never precede a real payment.
    let settleWalletSheet = null;
    try {
      // Resolved first and synchronously from the click so the Apple Pay
      // sheet can open; `null` means the host dismissed it.
      const source = await buildSource(quote);
      if (source === null) return;

      const { __settle, ...chargeSource } = source;
      settleWalletSheet = __settle || null;

      const result = await checkoutMutation.mutateAsync({
        planCode: selectedPlan.code,
        addons: buildCheckoutAddons(),
        ...(appliedDiscountCode ? { discountCode: appliedDiscountCode } : {}),
        source: chargeSource,
        ...(quote?.total != null ? { expectedAmount: quote.total, expectedTotal: quote.total } : {}),
        ...(quote?.quoteId ? { quoteId: quote.quoteId } : {}),
        ...(quote?.quoteExpiresAt ? { quoteExpiresAt: quote.quoteExpiresAt } : {}),
      });
      settleWalletSheet?.(true);
      settleWalletSheet = null;
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

      // Invalidate all affected queries on checkout completion (PR5)
      queryClient.invalidateQueries({ queryKey: subscriptionsKeys.all });
      queryClient.invalidateQueries({ queryKey: addonsKeys.all });
      queryClient.invalidateQueries({ queryKey: eventsKeys.all });
      queryClient.invalidateQueries({ queryKey: eventsKeys.subscriptionInfo() });

      // Navigate to typed, allowlisted completion destination (PR5 / F-08)
      const targetUrl = resolveWebCompletionUrl({ kind: origin, returnTo, eventId }, lang);
      router.push(targetUrl);
    } catch (error) {
      const code = error?.response?.data?.code || error?.data?.code || error?.code;
      if (["QUOTE_REQUIRED", "QUOTE_EXPIRED", "QUOTE_CHANGED"].includes(code)) {
        throw error;
      }
      const message =
        error?.response?.data?.message || error?.message || "";
      toastUtils.error(message || t("toasts.subscriptionFailed"));
    } finally {
      // Still set only if the charge never reported success — dismiss the
      // wallet sheet as failed rather than leaving it spinning.
      settleWalletSheet?.(false);
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
    origin,
    returnTo,
    eventId,
    queryClient,
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
    cardData,
    stcMobile,

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
