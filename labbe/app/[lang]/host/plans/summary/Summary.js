"use client";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import styles from "./summary.module.css";
import {
  FaArrowLeft,
  FaArrowRight,
  FaShieldAlt,
  FaLock,
  FaCheck,
  FaCalendarAlt,
  FaUsers,
  FaGift,
  FaTag,
  FaCreditCard,
  FaApplePay,
  FaTimes,
} from "react-icons/fa";
import { SiVisa, SiMastercard } from "react-icons/si";
import { discountsAPI } from "@/services/adminDashboard";

const Summary = ({
  selectedPlan,
  planFamily = "basic",
  billingType = "event",
  addonItems = [],
  addonTotal = 0,
  onDiscountApply,
  onProceedToPayment,
  onBack,
}) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const [discountCode, setDiscountCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discountError, setDiscountError] = useState("");
  const [discountLoading, setDiscountLoading] = useState(false);
  const [appliedCode, setAppliedCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("card");

  // Calculate totals
  const planPrice = parseFloat(selectedPlan?.price) || 0;
  const subtotal = planPrice + addonTotal;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  // Get plan display info
  const getPlanDisplayName = () => {
    if (isArabic && selectedPlan?.nameAr) return selectedPlan.nameAr;
    if (!isArabic && selectedPlan?.nameEn) return selectedPlan.nameEn;
    // Fallback using planFamily
    const familyLabel = planFamily === "premium"
      ? (isArabic ? "بريميوم" : "Premium")
      : (isArabic ? "بيسك" : "Basic");
    const invites = selectedPlan?.invites || 25;
    return isArabic ? `هلا ${familyLabel} ${invites} دعوة` : `Halaa ${familyLabel} ${invites} Invites`;
  };

  const getBillingPeriod = () => {
    if (billingType === "monthly") {
      return isArabic ? "30 يوم" : "30 days";
    }
    return isArabic ? "90 يوم (مناسبة واحدة)" : "90 days (1 event)";
  };

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return;
    setDiscountError("");
    setDiscountLoading(true);
    try {
      const response = await discountsAPI.validate(
        discountCode.trim(),
        subtotal,
        planFamily || null
      );
      const result = response?.data?.data || response?.data || response;
      if (result?.valid) {
        const discount = result.discountAmount || 0;
        setDiscountAmount(discount);
        setDiscountApplied(true);
        setAppliedCode(discountCode.trim().toUpperCase());
        onDiscountApply && onDiscountApply(discountCode, discount);
      } else {
        setDiscountApplied(false);
        setDiscountAmount(0);
        setDiscountError(
          result?.reason ||
            (isArabic ? "كود الخصم غير صالح" : "Invalid discount code")
        );
      }
    } catch {
      setDiscountApplied(false);
      setDiscountAmount(0);
      setDiscountError(
        isArabic ? "تعذر التحقق من الكود. حاول مرة أخرى" : "Could not verify code. Please try again"
      );
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

  // Get compensation invites
  const getCompensationInvites = () => {
    if (billingType === "monthly") {
      return selectedPlan?.compensationPool || 0;
    }
    const invites = selectedPlan?.invites || 25;
    return Math.floor(invites * 0.15);
  };

  return (
    <div className={styles.container} style={{ position: "relative" }}>
      {/* Back Button - Positioned absolutely */}
      <button className={styles.backButton} onClick={onBack}>
        {isArabic ? <FaArrowRight /> : <FaArrowLeft />}
        <span>{isArabic ? "رجوع" : "Back"}</span>
      </button>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            {isArabic ? "ملخص الطلب" : "Order Summary"}
          </h1>
          <p className={styles.subtitle}>
            {isArabic
              ? "راجع طلبك قبل إتمام الدفع"
              : "Review your order before payment"}
          </p>
        </div>
      </div>
      <div className={styles.content}>
        <div className={styles.mainSection}>
          {/* Plan Summary Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                {isArabic ? "تفاصيل الباقة" : "Plan Details"}
              </h2>
              {planFamily === "premium" && (
                <span className={styles.managedBadge}>
                  {isArabic ? "بريميوم" : "Premium"}
                </span>
              )}
            </div>

            <div className={styles.cardContent}>
              {/* Plan Info */}
              <div className={styles.planInfo}>
                <div className={styles.planIcon}>
                  <FaCalendarAlt />
                </div>
                <div className={styles.planDetails}>
                  <h3 className={styles.planName}>{getPlanDisplayName()}</h3>
                  <p className={styles.planType}>
                    {isArabic ? "مناسبة واحدة" : "Single Event"}
                  </p>
                </div>
                <div className={styles.planPrice}>
                  <span className={styles.priceAmount}>{planPrice}</span>
                  <span className={styles.priceCurrency}>
                    {isArabic ? "ر.س" : "SAR"}
                  </span>
                </div>
              </div>

              {/* Plan Features Summary */}
              <div className={styles.featuresSummary}>
                <div className={styles.featureItem}>
                  <FaUsers className={styles.featureIcon} />
                  {billingType === "monthly" ? (
                    <span>
                      {`${selectedPlan?.invitePool || 0} ${isArabic ? "دعوة (شهري)" : "invites (pool)"}`}
                    </span>
                  ) : (
                    <span>
                      {`${selectedPlan?.invites || 25} ${isArabic ? "دعوة" : "invites"}`}
                    </span>
                  )}
                </div>
                <div className={styles.featureItem}>
                  <FaCalendarAlt className={styles.featureIcon} />
                  {billingType === "monthly" ? (
                    <span>{isArabic ? "مناسبات غير محدودة" : "Unlimited events"}</span>
                  ) : (
                    <span>{isArabic ? "مناسبة واحدة — 90 يوم" : "1 event — 90 days"}</span>
                  )}
                </div>
                <div className={styles.featureItem}>
                  <FaGift className={styles.featureIcon} />
                  <span>
                    {getCompensationInvites()}{" "}
                    {isArabic ? "دعوات تعويضية" : "compensation invites"}
                  </span>
                </div>
              </div>

              {/* Billing Period */}
              <div className={styles.billingPeriod}>
                <span className={styles.billingLabel}>
                  {isArabic ? "فترة الاشتراك:" : "Billing Period:"}
                </span>
                <span className={styles.billingValue}>
                  {getBillingPeriod()}
                </span>
              </div>
            </div>
          </div>

          {/* Discount Code Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                <FaTag className={styles.cardTitleIcon} />
                {isArabic ? "كود الخصم" : "Discount Code"}
              </h2>
            </div>
            <div className={styles.cardContent}>
              <div className={styles.discountInputWrapper}>
                <input
                  type="text"
                  placeholder={
                    isArabic ? "أدخل كود الخصم" : "Enter discount code"
                  }
                  value={discountCode}
                  onChange={(e) => {
                    setDiscountCode(e.target.value);
                    setDiscountError("");
                  }}
                  className={`${styles.discountInput} ${
                    discountApplied ? styles.discountApplied : ""
                  } ${discountError ? styles.discountError : ""}`}
                  disabled={discountApplied || discountLoading}
                />
                {discountApplied ? (
                  <button
                    className={`${styles.applyButton} ${styles.removeButton}`}
                    onClick={handleRemoveDiscount}
                  >
                    <FaTimes /> {isArabic ? "إزالة" : "Remove"}
                  </button>
                ) : (
                  <button
                    className={styles.applyButton}
                    onClick={handleApplyDiscount}
                    disabled={!discountCode.trim() || discountLoading}
                  >
                    {discountLoading
                      ? isArabic ? "..." : "..."
                      : isArabic ? "تطبيق" : "Apply"}
                  </button>
                )}
              </div>
              {discountApplied && (
                <p className={styles.discountSuccess}>
                  {isArabic
                    ? `✓ كود "${appliedCode}" — خصم ${discountAmount.toFixed(0)} ر.س`
                    : `✓ Code "${appliedCode}" — ${discountAmount.toFixed(0)} SAR off`}
                </p>
              )}
              {discountError && !discountApplied && (
                <p className={styles.discountErrorMsg}>{discountError}</p>
              )}
            </div>
          </div>

          {/* Payment Summary Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                {isArabic ? "ملخص الدفع" : "Payment Summary"}
              </h2>
            </div>
            <div className={styles.cardContent}>
              <div className={styles.summaryBreakdown}>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>
                    {isArabic ? "سعر الباقة" : "Plan Price"}
                  </span>
                  <span className={styles.summaryValue}>
                    {planPrice} {isArabic ? "ر.س" : "SAR"}
                  </span>
                </div>

                {addonItems.map((item, idx) => (
                  <div key={idx} className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>
                      {item.type === "extra_invites" && (isArabic ? `دعوات إضافية +${item.quantity}` : `Extra Invites +${item.quantity}`)}
                      {item.type === "extra_reminders" && (isArabic ? `تذكيرات إضافية +${item.quantity}` : `Extra Reminders +${item.quantity}`)}
                      {item.type === "design_template" && (isArabic ? "تصميم الدعوة" : "Design Template")}
                    </span>
                    <span className={styles.summaryValue}>{item.price} {isArabic ? "ر.س" : "SAR"}</span>
                  </div>
                ))}

                {discountAmount > 0 && (
                  <div className={`${styles.summaryRow} ${styles.discountRow}`}>
                    <span className={styles.summaryLabel}>
                      {isArabic ? "الخصم" : "Discount"}
                    </span>
                    <span className={styles.summaryValueDiscount}>
                      -{discountAmount.toFixed(0)} {isArabic ? "ر.س" : "SAR"}
                    </span>
                  </div>
                )}

                <div className={styles.summaryDivider}></div>

                <div className={`${styles.summaryRow} ${styles.totalRow}`}>
                  <span className={styles.totalLabel}>
                    {isArabic ? "الإجمالي" : "Total"}
                  </span>
                  <span className={styles.totalValue}>
                    {finalTotal.toFixed(0)} {isArabic ? "ر.س" : "SAR"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Proceed Button */}
          <button
            className={styles.proceedButton}
            onClick={handlePayment}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <span className={styles.processingText}>
                {isArabic ? "جاري التفعيل..." : "Activating..."}
              </span>
            ) : (
              <>
                <span>
                  {isArabic ? "تفعيل الاشتراك" : "Activate Subscription"}
                </span>
                <span className={styles.totalBadge}>
                  {finalTotal.toFixed(0)} {isArabic ? "ر.س" : "SAR"}
                </span>
              </>
            )}
          </button>

          {/* Terms Notice */}
          <p className={styles.termsNotice}>
            {isArabic
              ? "بالضغط على إتمام الدفع، أنت توافق على شروط الخدمة وسياسة الخصوصية"
              : "By clicking Complete Payment, you agree to our Terms of Service and Privacy Policy"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Summary;
