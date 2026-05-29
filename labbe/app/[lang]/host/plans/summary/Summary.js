"use client";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { FaLock } from "react-icons/fa";
import { IoIosArrowForward } from "react-icons/io";
import { useValidateDiscount } from "@/hooks/discounts";
import ErrorBoundary from "@/ui/common/error/ErrorBoundary";
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
}) => {
  const { t } = useTranslation("plans");

  const [discountCode, setDiscountCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discountError, setDiscountError] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const validateDiscount = useValidateDiscount();
  const discountLoading = validateDiscount.isPending;

  const planPrice = parseFloat(selectedPlan?.price) || 0;
  const subtotal = planPrice + addonTotal;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return;
    setDiscountError("");
    try {
      // Why: backend's applicablePlanTypes enum is the canonical PLAN_TYPES
      // vocabulary (e.g. "basic_event"). selectedPlan.planType IS that value;
      // .type is the legacy field name; sending null is fine when the plan
      // doesn't carry one (the backend treats null as no plan-restriction).
      const planTypeKey = selectedPlan?.planType || selectedPlan?.type || null;
      const response = await validateDiscount.mutateAsync({
        code: discountCode.trim(),
        amount: subtotal,
        planType: planTypeKey,
      });
      const result = response?.data;
      if (result?.valid) {
        const discount = result.discountAmount || 0;
        setDiscountAmount(discount);
        setDiscountApplied(true);
        setAppliedCode(discountCode.trim().toUpperCase());
        onDiscountApply && onDiscountApply(discountCode, discount);
      } else {
        setDiscountApplied(false);
        setDiscountAmount(0);
        setDiscountError(result?.reason || t("summary.discount.invalidDefault"));
      }
    } catch {
      setDiscountApplied(false);
      setDiscountAmount(0);
      setDiscountError(t("summary.discount.networkError"));
    }
  };

  const handleRemoveDiscount = () => {
    setDiscountCode("");
    setDiscountAmount(0);
    setDiscountApplied(false);
    setAppliedCode("");
    setDiscountError("");
  };

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      await onProceedToPayment();
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
          <div className={styles.layout}>
            <div className={styles.leftCol}>
              <PlanSummaryCard
                selectedPlan={selectedPlan}
                planFamily={planFamily}
                billingType={billingType}
                planPrice={planPrice}
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
                amount={discountAmount}
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
                    />
                  </div>
                </div>
              )}
            </div>

            <div className={styles.rightCol}>
              <PaymentSummaryCard
                planPrice={planPrice}
                addonItems={addonItems}
                discountAmount={discountAmount}
                finalTotal={finalTotal}
                t={t}
              />

              <ProceedButton
                onClick={handlePayment}
                processing={isProcessing}
                finalTotal={finalTotal}
                t={t}
              />

              <div className={styles.securityNotice}>
                <FaLock className={styles.securityIcon} />
                <span>{t("summary.secureCheckout", { defaultValue: t("summary.terms") })}</span>
              </div>

              <p className={styles.termsNotice}>{t("summary.terms")}</p>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Summary;
