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
  cardData,
  stcMobile,
}) => {
  const { t } = useTranslation("plans");

  const [discountCode, setDiscountCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discountError, setDiscountError] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState({});

  const validateDiscount = useValidateDiscount();
  const discountLoading = validateDiscount.isPending;

  const planPrice = parseFloat(selectedPlan?.price) || 0;
  const subtotal = planPrice + addonTotal;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return;
    setDiscountError("");
    try {
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

  const checkLuhn = (number) => {
    let sum = 0;
    let shouldDouble = false;
    for (let i = number.length - 1; i >= 0; i--) {
      let digit = parseInt(number.charAt(i), 10);
      if (shouldDouble) {
        if ((digit *= 2) > 9) digit -= 9;
      }
      sum += digit;
      shouldDouble = !shouldDouble;
    }
    return sum % 10 === 0;
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

      if (!month || !year) {
        newErrors.expiry = t("checkout.errors.expiryRequired", "Expiry date is required");
      } else {
        const m = parseInt(month, 10);
        const y = parseInt(year, 10);
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;

        if (isNaN(m) || m < 1 || m > 12) {
          newErrors.expiry = t("checkout.errors.expiryMonthInvalid", "Invalid month (01-12)");
        } else if (isNaN(y) || y < currentYear || (y === currentYear && m < currentMonth)) {
          newErrors.expiry = t("checkout.errors.expiryExpired", "Card has expired");
        }
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
    if (!validateForm()) {
      return;
    }
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
