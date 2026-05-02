"use client";
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { cookieUtils } from "@/utils/cookieUtils";
import { useTranslation } from "react-i18next";
import adminDashboardAPI from "@/services/adminDashboard";
import styles from "./subscriptionPopup.module.css";
import Image from "next/image";
import {
  FaCheck,
  FaCrown,
  FaUsers,
  FaCalendarAlt,
  FaGift,
  FaSpinner,
} from "react-icons/fa";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const SubscriptionPopup = ({
  host,
  currentSubscription,
  onClose,
  onSuccess,
}) => {
  const { t, i18n } = useTranslation("adminHosts");
  const isArabic = i18n.language === "ar";

  const currentPlanCode =
    currentSubscription?.planCode ||
    currentSubscription?.planId?.code ||
    currentSubscription?.planType ||
    "trial";

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [planFamily, setPlanFamily] = useState("basic");
  const [billingType, setBillingType] = useState("event");
  const [isLoading, setIsLoading] = useState(false);
  const [plansData, setPlansData] = useState(null);
  const [loadingPlans, setLoadingPlans] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoadingPlans(true);
        const response = await fetch(`${API_BASE}/plans/host`);
        const result = await response.json();
        if (result.status === "success" && result.data) {
          setPlansData(result.data);
        }
      } catch (error) {
        console.error("Error fetching plans:", error);
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchPlans();
  }, []);

  const handleSubmit = async () => {
    const hostId = host?.id || host?._id;
    if (!hostId) {
      toast.error(t("subscription.noHostId", "معرف المضيف غير موجود"));
      return;
    }
    if (!selectedPlan) {
      toast.info(t("subscription.noPlanSelected", "الرجاء اختيار خطة"));
      return;
    }
    if (selectedPlan === currentPlanCode) {
      toast.info(t("subscription.samePlan", "المضيف على هذه الخطة بالفعل"));
      return;
    }

    setIsLoading(true);
    try {
      const token = cookieUtils.getCookie("token");
      await adminDashboardAPI.hosts.updateSubscription(
        hostId,
        { planCode: selectedPlan },
        token
      );
      toast.success(t("subscription.updateSuccess", "تم تحديث الاشتراك بنجاح"));
      onSuccess && onSuccess();
    } catch (error) {
      console.error("Error updating subscription:", error);
      toast.error(t("subscription.updateError", "فشل في تحديث الاشتراك"));
    } finally {
      setIsLoading(false);
    }
  };

  const currentPlans = plansData?.[planFamily]?.[billingType] || [];

  const familyTabs = [
    { key: "basic", label: isArabic ? "أساسي" : "Basic" },
    { key: "premium", label: isArabic ? "مميز" : "Premium" },
  ];

  const billingTabs = [
    { key: "event", label: isArabic ? "لكل مناسبة" : "Per Event" },
    { key: "monthly", label: isArabic ? "شهري" : "Monthly" },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.headerTitle}>
          <FaCrown style={{ color: "#c28e5c", marginLeft: "0.8rem" }} />
          {t("subscription.manageTitle", "إدارة اشتراك المضيف")}
        </h2>
        <button onClick={onClose} className={styles.closeButton}>
          <Image
            width={24}
            height={24}
            src="/svg/admin/close.svg"
            alt="close"
          />
        </button>
      </div>

      <div className={styles.hostInfo}>
        <p>
          <strong>{t("subscription.host", "المضيف")}:</strong>{" "}
          {host?.name || host?.username || "-"}
        </p>
        <p>
          <strong>{t("subscription.currentPlan", "الخطة الحالية")}:</strong>{" "}
          <span className={styles.currentPlanBadge}>{currentPlanCode}</span>
        </p>
      </div>

      {loadingPlans ? (
        <div className={styles.loadingContainer}>
          <FaSpinner className={styles.spinner} />
          <p>{isArabic ? "جار تحميل الباقات..." : "Loading plans..."}</p>
        </div>
      ) : (
        <>
          {/* Family tabs: Basic / Premium */}
          <div className={styles.planSection}>
            <h4 className={styles.sectionLabel}>
              {isArabic ? "فئة الباقة" : "Plan Family"}
            </h4>
            <div className={styles.billingToggle}>
              {familyTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`${styles.billingOption} ${planFamily === tab.key ? styles.active : ""}`}
                  onClick={() => {
                    setPlanFamily(tab.key);
                    setSelectedPlan(null);
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Billing type toggle: Per Event / Monthly */}
          <div className={styles.planSection}>
            <h4 className={styles.sectionLabel}>
              {isArabic ? "نوع الفوترة" : "Billing Type"}
            </h4>
            <div className={styles.billingToggle}>
              {billingTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`${styles.billingOption} ${billingType === tab.key ? styles.active : ""}`}
                  onClick={() => {
                    setBillingType(tab.key);
                    setSelectedPlan(null);
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Plan cards */}
          <div className={styles.planSection}>
            <h4 className={styles.sectionLabel}>
              <FaCalendarAlt style={{ marginLeft: "0.5rem", color: "#c28e5c" }} />
              {isArabic ? "اختر الباقة" : "Select Plan"}
            </h4>
            {currentPlans.length === 0 ? (
              <p style={{ color: "#6b7280", padding: "1rem 0" }}>
                {isArabic ? "لا توجد باقات" : "No plans available"}
              </p>
            ) : (
              <div className={styles.singleEventGrid}>
                {currentPlans.map((plan) => {
                  const planName = isArabic
                    ? plan.nameAr || plan.nameEn
                    : plan.nameEn || plan.nameAr;
                  const price = plan.pricing?.oneTime || 0;
                  const invites =
                    plan.limits?.invitePool ?? plan.limits?.maxInvitesPerEvent ?? 0;
                  const isSelected = selectedPlan === plan.code;

                  return (
                    <div
                      key={plan.code}
                      className={`${styles.planCard} ${isSelected ? styles.selectedPlan : ""}`}
                      onClick={() => setSelectedPlan(plan.code)}
                    >
                      <div className={styles.planCardContent}>
                        <div className={styles.planCardInfo}>
                          <h3 className={styles.planName}>{planName}</h3>
                          <p className={styles.planPrice}>
                            <span className={styles.priceValue}>{price.toLocaleString()}</span>
                            <span className={styles.priceCurrency}>
                              {isArabic ? " ر.س" : " SAR"}
                            </span>
                          </p>
                        </div>
                        <div className={styles.planCardDetails}>
                          <span>
                            <FaUsers />{" "}
                            {invites === -1
                              ? isArabic ? "غير محدود" : "Unlimited"
                              : invites}{" "}
                            {isArabic ? "دعوة" : "invites"}
                          </span>
                          {plan.features?.slice(0, 2).map((f, i) => (
                            <span key={i}>
                              <FaCheck />{" "}
                              {isArabic ? f.labelAr : f.labelEn}
                            </span>
                          ))}
                        </div>
                      </div>
                      {isSelected && (
                        <div
                          className={styles.selectedIndicator}
                          style={{ background: "#c28e5c" }}
                        >
                          <FaCheck style={{ color: "#fff" }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Trial plan quick-select */}
          <div className={styles.planSection}>
            <h4 className={styles.sectionLabel}>
              <FaGift style={{ marginLeft: "0.5rem", color: "#2a8c5b" }} />
              {isArabic ? "خطة تجريبية" : "Trial Plan"}
            </h4>
            <div
              className={`${styles.planCard} ${styles.trialCard} ${selectedPlan === "trial" ? styles.selectedPlan : ""}`}
              onClick={() => setSelectedPlan("trial")}
            >
              <div className={styles.planCardContent}>
                <div className={styles.planCardInfo}>
                  <h3 className={styles.planName} style={{ color: "#2a8c5b" }}>
                    {isArabic ? "تجريبي" : "Trial"}
                  </h3>
                  <p className={styles.planPrice}>
                    {isArabic ? "مجاني" : "Free"}
                  </p>
                </div>
                <div className={styles.planCardDetails}>
                  <span>
                    <FaUsers /> {isArabic ? "5 ضيوف" : "5 guests"}
                  </span>
                  <span>
                    <FaCalendarAlt /> {isArabic ? "مناسبة واحدة" : "1 event"}
                  </span>
                </div>
              </div>
              {selectedPlan === "trial" && (
                <div
                  className={styles.selectedIndicator}
                  style={{ background: "#2a8c5b" }}
                >
                  <FaCheck style={{ color: "#fff" }} />
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.cancelButton}
          onClick={onClose}
          disabled={isLoading}
        >
          {t("subscription.cancel", "إلغاء")}
        </button>
        <button
          type="button"
          className={styles.submitButton}
          onClick={handleSubmit}
          disabled={isLoading || !selectedPlan || selectedPlan === currentPlanCode || loadingPlans}
        >
          {isLoading
            ? t("subscription.updating", "جاري التحديث...")
            : selectedPlan === currentPlanCode
            ? t("subscription.currentPlanSelected", "الخطة الحالية")
            : t("subscription.updatePlan", "تحديث الاشتراك")}
        </button>
      </div>
    </div>
  );
};

export default SubscriptionPopup;
