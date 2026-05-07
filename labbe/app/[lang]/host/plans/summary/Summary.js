"use client";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import { discountsAPI } from "@/services/adminDashboard";
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
  const { t, i18n } = useTranslation("plans");
  const isArabic = i18n.language === "ar";

  const [discountCode, setDiscountCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discountError, setDiscountError] = useState("");
  const [discountLoading, setDiscountLoading] = useState(false);
  const [appliedCode, setAppliedCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const planPrice = parseFloat(selectedPlan?.price) || 0;
  const subtotal = planPrice + addonTotal;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return;
    setDiscountError("");
    setDiscountLoading(true);
    try {
      // Use the plan's canonical planType (e.g. "host_basic_monthly") rather
      // than the family ("basic"/"premium") so the discount's
      // applicablePlanTypes check matches the backend's. Falls back to family
      // if the plan object pre-dates that field.
      const planTypeKey =
        selectedPlan?.planType || selectedPlan?.type || planFamily || null;
      const response = await discountsAPI.validate(
        discountCode.trim(),
        subtotal,
        planTypeKey
      );
      const result = response?.data || response;
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
    } finally {
      setDiscountLoading(false);
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
      <div className={styles.container} style={{ position: "relative" }}>
        <button className={styles.backButton} onClick={onBack} type="button">
          {isArabic ? <FaArrowRight /> : <FaArrowLeft />}
          <span>{t("summary.back")}</span>
        </button>

        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>{t("summary.title")}</h1>
            <p className={styles.subtitle}>{t("summary.subtitle")}</p>
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles.mainSection}>
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

            <PaymentSummaryCard
              planPrice={planPrice}
              addonItems={addonItems}
              discountAmount={discountAmount}
              finalTotal={finalTotal}
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

            <ProceedButton
              onClick={handlePayment}
              processing={isProcessing}
              finalTotal={finalTotal}
              t={t}
            />

            <p className={styles.termsNotice}>{t("summary.terms")}</p>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Summary;
