"use client";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { FaLock } from "react-icons/fa";
import { IoIosArrowForward } from "react-icons/io";
import { useValidateDiscount } from "@/hooks/discounts";
import { useCheckoutQuote } from "@/hooks/checkout";
import { round2, formatSar, validateCardExpiry, checkLuhn } from "@halaa/shared/utils";
import ErrorBoundary from "@/ui/common/error/ErrorBoundary";
import LegalSurfaceLinks from "@/ui/common/LegalSurfaceLinks";
import PaymentMethodSelector from "../_components/PaymentMethodSelector";
import PlanSummaryCard from "./_components/PlanSummaryCard";
import DiscountCodeCard from "./_components/DiscountCodeCard";
import PaymentSummaryCard from "./_components/PaymentSummaryCard";
import ProceedButton from "./_components/ProceedButton";
import styles from "./summary.module.css";

const Summary = ({
  selectedPlan,
  planFamily = "basic",
  billingType = "event",
  addonItems = [],
  addonTotal = 0,
  onDiscountApply,
  onProceedToPayment,
  onBack,
  paymentMethod,
  onPaymentMethodChange,
  onCardChange,
  onMobileChange,
  cardData,
  stcMobile,
}) => {
  const { t, i18n } = useTranslation("plans");
  const currentLocale = i18n.resolvedLanguage === "en" ? "en" : "ar";

  const [discountCode, setDiscountCode] = useState("");
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discountError, setDiscountError] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState({});

  const validateDiscount = useValidateDiscount();
  const discountLoading = validateDiscount.isPending;

  const formattedAddons = useMemo(() => {
    return addonItems.map((item) => {
      const type = item.addonType || item.type;
      const base = { addonType: type, scope: "org" };
      if (type === "extra_invites") {
        return { ...base, scope: "pool", quantity: item.quantity };
      }
      if (type === "design_template") {
        return { ...base, templateType: item.templateType };
      }
      return base;
    });
  }, [addonItems]);

  const {
    data: quoteResponse,
    isLoading: quoteLoading,
    error: quoteError,
    refetch: refetchQuote,
  } = useCheckoutQuote({
    planCode: selectedPlan?.code,
    addons: formattedAddons,
    discountCode: discountApplied ? appliedCode : null,
    enabled: Boolean(selectedPlan?.code),
  });

  const quote = quoteResponse?.data || quoteResponse || null;

  // Authoritative prices from quote exclusively (PR5 / F-07)
  const planPrice = quote?.planPrice != null ? quote.planPrice : null;
  const quoteAddonItems = quote?.lineItems?.filter((l) => l.type === "addon") || [];
  const effectiveDiscountAmount = quote?.discountAmount ?? 0;
  const finalTotal = quote?.total != null ? quote.total : null;
  const currency = quote?.currency || "SAR";
  const quoteExpiresAt = useMemo(
    () => (quote?.quoteExpiresAt ? new Date(quote.quoteExpiresAt) : null),
    [quote?.quoteExpiresAt]
  );

  // Dynamic expiry tracking
  const [isExpired, setIsExpired] = useState(false);
  const lastTotalRef = useRef(null);
  const [priceChangedNotice, setPriceChangedNotice] = useState(false);

  useEffect(() => {
    if (!quoteExpiresAt) {
      setIsExpired(false);
      return;
    }
    const checkExpiry = () => {
      const expired = quoteExpiresAt.getTime() <= Date.now();
      setIsExpired(expired);
    };
    checkExpiry();
    const timer = setInterval(checkExpiry, 5000);
    return () => clearInterval(timer);
  }, [quoteExpiresAt]);

  useEffect(() => {
    if (finalTotal != null) {
      if (lastTotalRef.current !== null && lastTotalRef.current !== finalTotal) {
        setPriceChangedNotice(true);
      }
      lastTotalRef.current = finalTotal;
    }
  }, [finalTotal]);

  const handleRefreshQuote = async () => {
    setPriceChangedNotice(false);
    await refetchQuote();
  };

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return;
    setDiscountError("");
    try {
      const planTypeKey = selectedPlan?.planType || selectedPlan?.type || null;
      const subtotalForValidation = quote?.subtotal ?? (planPrice || 0);
      const response = await validateDiscount.mutateAsync({
        code: discountCode.trim(),
        amount: subtotalForValidation,
        planType: planTypeKey,
      });
      const result = response?.data;
      if (result?.valid) {
        const discount = result.discountAmount || 0;
        setDiscountApplied(true);
        setAppliedCode(discountCode.trim().toUpperCase());
        onDiscountApply && onDiscountApply(discountCode, discount);
      } else {
        setDiscountApplied(false);
        setAppliedCode("");
        setDiscountError(result?.reason || t("summary.discount.invalidDefault"));
      }
    } catch {
      setDiscountApplied(false);
      setAppliedCode("");
      setDiscountError(t("summary.discount.networkError"));
    }
  };

  const handleRemoveDiscount = () => {
    setDiscountCode("");
    setDiscountApplied(false);
    setAppliedCode("");
    setDiscountError("");
  };

  const validateForm = () => {
    const newErrors = {};
    if (paymentMethod === "creditcard") {
      const name = (cardData?.name || "").trim();
      const number = (cardData?.number || "").replace(/\D/g, "");
      const month = (cardData?.month || "").trim();
      const year = (cardData?.year || "").trim();
      const cvc = (cardData?.cvc || "").trim();

      if (!name) {
        newErrors.name = t("checkout.errors.nameRequired", "Cardholder name is required");
      } else if (name.length < 3) {
        newErrors.name = t("checkout.errors.nameTooShort", "Please enter full cardholder name");
      }

      if (!number) {
        newErrors.number = t("checkout.errors.numberRequired", "Card number is required");
      } else if (number.length < 15 || number.length > 16) {
        newErrors.number = t("checkout.errors.numberLength", "Card number must be 15 or 16 digits");
      } else if (!checkLuhn(number)) {
        newErrors.number = t("checkout.errors.numberInvalid", "Invalid card number");
      }

      const expiryCheck = validateCardExpiry(month, year);
      if (!expiryCheck.valid) {
        newErrors.expiry = t(expiryCheck.errorKey, "Invalid expiry date");
      }

      if (!cvc) {
        newErrors.cvc = t("checkout.errors.cvcRequired", "CVC is required");
      } else if (cvc.length < 3 || cvc.length > 4) {
        newErrors.cvc = t("checkout.errors.cvcLength", "CVC must be 3 or 4 digits");
      }
    } else if (paymentMethod === "stcpay") {
      const mobile = (stcMobile || "").replace(/\D/g, "");
      if (!mobile) {
        newErrors.stcMobile = t("checkout.errors.mobileRequired", "Mobile number is required");
      } else if (!/^(05|5)\d{8}$/.test(mobile)) {
        newErrors.stcMobile = t("checkout.errors.mobileFormat", "Must be a valid Saudi number (e.g. 05xxxxxxxx)");
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePayment = async () => {
    if (isProcessing) return;
    if (!quote || quoteLoading) return;
    if (isExpired) {
      await handleRefreshQuote();
      return;
    }
    if (!validateForm()) {
      return;
    }
    setIsProcessing(true);
    try {
      await onProceedToPayment(quote);
    } catch (error) {
      const code = error?.response?.data?.code || error?.data?.code || error?.code;
      if (["QUOTE_REQUIRED", "QUOTE_EXPIRED", "QUOTE_CHANGED"].includes(code)) {
        await refetchQuote();
        setPriceChangedNotice(true);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ErrorBoundary fallbackMessage={t("errors.summaryBoundary", { defaultValue: "" })}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            <IoIosArrowForward
              onClick={onBack}
              className={styles.backArrow}
            />
            {t("summary.title")}
          </h1>
          <p className={styles.subtitle}>{t("summary.subtitle")}</p>
        </div>

        <div className={styles.content}>
          {priceChangedNotice && (
            <div className={styles.expiryBox}>
              <span className={styles.expiryText}>
                {t("summary.quote.priceUpdatedNotice", "Quote price has been updated. Please review before payment.")}
              </span>
              <button
                type="button"
                className={styles.refreshQuoteBtn}
                onClick={() => setPriceChangedNotice(false)}
              >
                {t("common.ok", "OK")}
              </button>
            </div>
          )}

          <div className={styles.layout}>
            <div className={styles.leftCol}>
              <PlanSummaryCard
                selectedPlan={selectedPlan}
                planFamily={planFamily}
                billingType={billingType}
                planPrice={planPrice}
                addonItems={addonItems}
                t={t}
              />

              <DiscountCodeCard
                discountCode={discountCode}
                onCodeChange={(value) => {
                  setDiscountCode(value);
                  setDiscountError("");
                }}
                onApply={handleApplyDiscount}
                onRemove={handleRemoveDiscount}
                applied={discountApplied}
                loading={discountLoading}
                amount={effectiveDiscountAmount}
                appliedCode={appliedCode}
                errorMessage={discountError}
                t={t}
              />

              {onPaymentMethodChange && (
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>
                      {t("summary.payment.method")}
                    </h2>
                  </div>
                  <div className={styles.cardContent}>
                    <PaymentMethodSelector
                      value={paymentMethod || "creditcard"}
                      onChange={onPaymentMethodChange}
                      onCardChange={onCardChange}
                      onMobileChange={onMobileChange}
                      cardData={cardData}
                      stcMobile={stcMobile}
                      errors={errors}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className={styles.rightCol}>
              <PaymentSummaryCard
                planPrice={planPrice}
                addonItems={quoteAddonItems}
                discountAmount={effectiveDiscountAmount}
                finalTotal={finalTotal}
                currency={currency}
                quoteExpiresAt={quoteExpiresAt}
                isExpired={isExpired}
                isLoading={quoteLoading}
                onRefreshQuote={handleRefreshQuote}
                t={t}
              />

              <ProceedButton
                onClick={handlePayment}
                processing={isProcessing || quoteLoading}
                disabled={!quote || quoteLoading || isExpired}
                finalTotal={finalTotal}
                t={t}
              />

              <div className={styles.securityNotice}>
                <FaLock className={styles.securityIcon} />
                <span>{t("summary.secureCheckout", { defaultValue: t("summary.terms") })}</span>
              </div>

              <p className={styles.termsNotice}>{t("summary.terms")}</p>
              <LegalSurfaceLinks
                lang={currentLocale}
                documents={["terms", "privacy", "refund", "support"]}
              />
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Summary;
