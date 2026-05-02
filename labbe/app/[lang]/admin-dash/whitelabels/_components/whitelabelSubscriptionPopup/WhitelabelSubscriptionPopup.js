"use client";
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { cookieUtils } from "@/utils/cookieUtils";
import { useTranslation } from "react-i18next";
import adminDashboardAPI from "@/services/adminDashboard";
import styles from "./whitelabelSubscriptionPopup.module.css";
import Image from "next/image";
import { FaCheck, FaCrown } from "react-icons/fa";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const WhitelabelSubscriptionPopup = ({
  whitelabel,
  currentSubscription,
  onClose,
  onSuccess,
}) => {
  const { t, i18n } = useTranslation("adminWhitelabels");
  const isArabic = i18n.language === "ar";

  const [plansData, setPlansData] = useState(null);
  const [plansLoading, setPlansLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(
    currentSubscription?.planCode || null
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch(`${API_BASE}/plans/business`);
        const result = await response.json();
        if (result.status === "success" && result.data) {
          setPlansData(result.data);
          if (!selectedPlan) {
            const firstEvent = result.data.event?.[0];
            if (firstEvent) setSelectedPlan(firstEvent.code);
          }
        }
      } catch (error) {
        console.error("Error fetching business plans:", error);
        toast.error(t("subscription.plansLoadError", "فشل في تحميل الباقات"));
      } finally {
        setPlansLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const handleSubmit = async () => {
    const whitelabelId = whitelabel?.id || whitelabel?._id;
    if (!whitelabelId) {
      toast.error(t("subscription.noWhitelabelId", "معرف الوايت ليبل غير موجود"));
      return;
    }
    if (!selectedPlan) {
      toast.error(t("subscription.noPlanSelected", "الرجاء اختيار خطة"));
      return;
    }

    setIsLoading(true);
    try {
      const token = cookieUtils.getCookie("token");
      await adminDashboardAPI.whitelabel.updateSubscription(
        whitelabelId,
        { planCode: selectedPlan },
        token
      );
      toast.success(t("subscription.updateSuccess", "تم تحديث الاشتراك بنجاح"));
      onSuccess && onSuccess();
    } catch (error) {
      console.error("Error updating subscription:", error);
      toast.error(error.message || t("subscription.updateError", "فشل في تحديث الاشتراك"));
    } finally {
      setIsLoading(false);
    }
  };

  const renderPlanCard = (plan) => {
    const isSelected = selectedPlan === plan.code;
    const planName = isArabic ? plan.nameAr : plan.nameEn;
    const price = plan.pricing?.oneTime || 0;
    const isPoolPlan = plan.planType === "business_quarterly" || plan.planType === "business_annual";
    const inviteDisplay = isPoolPlan
      ? plan.limits?.invitePool
      : plan.limits?.maxInvitesPerEvent;

    return (
      <div
        key={plan.code}
        className={`${styles.planCard} ${isSelected ? styles.selectedPlan : ""} ${plan.isPopular ? styles.popularPlan : ""}`}
        onClick={() => setSelectedPlan(plan.code)}
      >
        {plan.badge && (
          <div className={styles.popularBadge}>
            {isArabic ? plan.badge.labelAr : plan.badge.labelEn}
          </div>
        )}
        <div className={styles.planHeader}>
          <h3 className={styles.planName}>{planName}</h3>
          <p className={styles.planPrice}>
            <span className={styles.priceValue}>{price.toLocaleString()}</span>
            <span className={styles.priceCurrency}>
              {isArabic ? " ر.س" : " SAR"}
            </span>
          </p>
        </div>
        {inviteDisplay != null && (
          <p className={styles.planLimitInfo}>
            {isPoolPlan
              ? `${inviteDisplay} ${isArabic ? "دعوة (مجموع)" : "invites (pool)"}`
              : `${inviteDisplay} ${isArabic ? "دعوة/مناسبة" : "invites/event"}`}
          </p>
        )}
        {plan.features && plan.features.length > 0 && (
          <ul className={styles.planFeatures}>
            {plan.features.map((feature, index) => (
              <li key={index} className={styles.featureItem}>
                <FaCheck style={{ fontSize: "1.2rem" }} />
                <span>{isArabic ? feature.labelAr : feature.labelEn}</span>
              </li>
            ))}
          </ul>
        )}
        {isSelected && (
          <div className={styles.selectedIndicator}>
            <FaCheck style={{ color: "#fff" }} />
          </div>
        )}
      </div>
    );
  };

  const eventPlans = plansData?.event || [];
  const quarterlyPlan = plansData?.quarterly?.[0];
  const annualPlan = plansData?.annual?.[0];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.headerTitle}>
          <FaCrown style={{ color: "#F39C12", marginLeft: "0.8rem" }} />
          {t("subscription.manageTitle", "إدارة اشتراك الوايت ليبل")}
        </h2>
        <button onClick={onClose} className={styles.closeButton}>
          <Image width={24} height={24} src="/svg/admin/close.svg" alt="close" />
        </button>
      </div>

      <div className={styles.whitelabelInfo}>
        <p>
          <strong>{t("subscription.whitelabel", "الوايت ليبل")}:</strong>{" "}
          {whitelabel?.username || whitelabel?.roleData?.platformName || "N/A"}
        </p>
        {currentSubscription?.planCode && (
          <p>
            <strong>{t("subscription.currentPlan", "الخطة الحالية")}:</strong>{" "}
            <span className={styles.currentPlanBadge}>
              {currentSubscription.planCode}
            </span>
          </p>
        )}
      </div>

      {plansLoading ? (
        <div className={styles.plansLoading}>
          {t("subscription.loadingPlans", "جاري تحميل الباقات...")}
        </div>
      ) : (
        <>
          {/* Per-event business plans */}
          {eventPlans.length > 0 && (
            <div>
              <h4 className={styles.sectionLabel}>
                {isArabic ? "باقات المناسبة" : "Event Plans"}
              </h4>
              <div className={styles.plansGrid}>
                {eventPlans.map(renderPlanCard)}
              </div>
            </div>
          )}

          {/* Quarterly pool plan */}
          {quarterlyPlan && (
            <div>
              <h4 className={styles.sectionLabel}>
                {isArabic ? "الباقة الربع سنوية" : "Quarterly Plan"}
              </h4>
              <div className={styles.plansGrid}>
                {renderPlanCard(quarterlyPlan)}
              </div>
            </div>
          )}

          {/* Annual pool plan */}
          {annualPlan && (
            <div>
              <h4 className={styles.sectionLabel}>
                {isArabic ? "الباقة السنوية" : "Annual Plan"}
              </h4>
              <div className={styles.plansGrid}>
                {renderPlanCard(annualPlan)}
              </div>
            </div>
          )}
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
          disabled={isLoading || plansLoading || !selectedPlan}
        >
          {isLoading
            ? t("subscription.updating", "جاري التحديث...")
            : currentSubscription
            ? t("subscription.updatePlan", "تحديث الاشتراك")
            : t("subscription.assignPlan", "تعيين الخطة")}
        </button>
      </div>
    </div>
  );
};

export default WhitelabelSubscriptionPopup;
