"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useRouter, useParams } from "next/navigation";
import {
  FaCalendarAlt,
  FaUsers,
  FaCheckCircle,
  FaCrown,
  FaRocket,
} from "react-icons/fa";
import styles from "./page.module.css";
import useAuthStore, { USER_ROLES } from "@/stores/authStore";
import plansService from "@/services/plansService";
import subscriptionService from "@/services/subscriptionService";
import Summary from "@/app/[lang]/host/plans/summary/Summary";

const PlansPage = () => {
  const { t, i18n } = useTranslation("whitelabelPlans");
  const { user, subscription, setSubscription, isWhitelabel } = useAuthStore();
  const router = useRouter();
  const { lang } = useParams();
  const isArabic = i18n.language === "ar";

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(null);
  const [error, setError] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [selectedPlanForSummary, setSelectedPlanForSummary] = useState(null);
  const [appliedDiscountCode, setAppliedDiscountCode] = useState("");

  useEffect(() => {
    // Redirect if not whitelabel
    if (user && !isWhitelabel()) {
       router.replace(`/${lang}/admin-dash`);
       return;
    }

    const fetchPlans = async () => {
      try {
        setLoading(true);
        const enterpriseResponse = await plansService.getEnterprisePlans();
        const enterprisePlans = enterpriseResponse?.plans || [];
        setPlans(enterprisePlans);
      } catch (err) {
        console.error("Error fetching plans:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [user, isWhitelabel, router, lang]);

  const currentPlanCode = subscription?.plan?.code;
  const hasActiveSubscription =
    subscription && subscription.status === "active";

  const formatPrice = (price) => {
    return new Intl.NumberFormat("ar-SA", {
      style: "currency",
      currency: "SAR",
      minimumFractionDigits: 0,
    }).format(price || 0);
  };

  const getPrice = (plan) => {
    return plan.pricing?.oneTime?.amount ?? plan.pricing?.oneTime ?? null;
  };

  const handleSubscribe = (plan) => {
    const price = getPrice(plan);
    setSelectedPlanForSummary({
      ...plan,
      price,
      planType: "enterprise",
      nameAr: plan.nameAr,
      nameEn: plan.nameEn,
      limits: plan.limits,
    });
    setShowSummary(true);
  };

  const handleProceedToPayment = useCallback(async () => {
    if (!selectedPlanForSummary) return;

    try {
      setSubscribing(selectedPlanForSummary.code);
      const response = await subscriptionService.subscribe({
        planCode: selectedPlanForSummary.code,
        ...(appliedDiscountCode ? { discountCode: appliedDiscountCode } : {}),
      });

      if (response?.data) {
        setSubscription(response.data);
        toast.success(
          isArabic ? "تم الاشتراك بنجاح!" : "Subscribed successfully!",
        );
        setShowSummary(false);
        setSelectedPlanForSummary(null);
      }
    } catch (err) {
      console.error("Error subscribing:", err);
      toast.error(
        err.message || (isArabic ? "فشل في الاشتراك" : "Failed to subscribe"),
      );
    } finally {
      setSubscribing(null);
    }
  }, [selectedPlanForSummary, appliedDiscountCode, isArabic, setSubscription]);

  const handleBackFromSummary = useCallback(() => {
    setShowSummary(false);
    setSelectedPlanForSummary(null);
  }, []);

  const isCurrentPlan = (planCode) => planCode === currentPlanCode;

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>{t("plansPage.loading")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>{t("plansPage.error")}</p>
        </div>
      </div>
    );
  }

  // Show summary page when a plan is selected
  if (showSummary && selectedPlanForSummary) {
    return (
      <Summary
        selectedPlan={selectedPlanForSummary}
        onDiscountApply={(code) => setAppliedDiscountCode(code)}
        onProceedToPayment={handleProceedToPayment}
        onBack={handleBackFromSummary}
      />
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>{t("plansPage.title")}</h1>
        <p className={styles.subtitle}>{t("plansPage.subtitle")}</p>
      </div>

      {/* Resolve full plan details from plans list if subscription.plan is incomplete */}
      {(() => {
        const currentPlan = subscription?.plan;
        
        // Try to find the plan in the fetched list using code or ID
        const fullPlan =
          plans.find((p) => {
             // Match by Code
             if (p.code && currentPlan?.code && p.code === currentPlan.code) return true;
             // Match by ID
             const pId = p._id || p.id;
             const currentId = currentPlan?._id || currentPlan?.id;
             if (pId && currentId && pId === currentId) return true;
             return false;
          }) || currentPlan;
        
        // Ensure we have access to variables needed for display
        const displayLimits = fullPlan?.limits || subscription?.limits || {};

        return (
          <div className={styles.currentPlanSection}>
            <h2 className={styles.sectionTitle}>
              {hasActiveSubscription
                ? isArabic
                  ? "باقتك الحالية"
                  : "Your Current Plan"
                : isArabic
                  ? "حالة الاشتراك"
                  : "Subscription Status"}
            </h2>
    
            {hasActiveSubscription ? (
              <div className={styles.currentPlanCard}>
                <div className={styles.currentPlanHeader}>
                  <div className={styles.planInfo}>
                    <FaCrown className={styles.planIcon} />
                    <span className={styles.planName}>
                      {isArabic
                        ? fullPlan?.nameAr
                        : fullPlan?.nameEn}
                    </span>
                    <span className={styles.activeBadge}>
                      {isArabic ? "نشط" : "Active"}
                    </span>
                  </div>
                  <div className={styles.planPrice}>
                    {formatPrice(subscription?.pricePaid?.amount || 0)}
                  </div>
                </div>
                <div className={styles.currentPlanDetails}>
                  <div className={styles.detailItem}>
                    <FaCalendarAlt className={styles.detailIcon} />
                    <span className={styles.detailLabel}>
                      {isArabic ? "المناسبات شهرياً" : "Events/Month"}
                    </span>
                    <span className={styles.detailValue}>
                      {displayLimits?.maxEventsPerMonth === -1
                        ? "∞"
                        : displayLimits?.maxEventsPerMonth}
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <FaUsers className={styles.detailIcon} />
                    <span className={styles.detailLabel}>
                      {isArabic ? "الضيوف لكل مناسبة" : "Guests/Event"}
                    </span>
                    <span className={styles.detailValue}>
                      {displayLimits?.maxGuestsPerEvent === -1
                        ? "∞"
                        : displayLimits?.maxGuestsPerEvent}
                    </span>
                  </div>
                  {subscription.expiresAt && (
                    <div className={styles.detailItem}>
                      <FaCheckCircle className={styles.detailIcon} />
                      <span className={styles.detailLabel}>
                        {isArabic ? "صالح حتى" : "Valid Until"}
                      </span>
                      <span className={styles.detailValue}>
                        {new Date(subscription.expiresAt).toLocaleDateString(
                          isArabic ? "ar-SA" : "en-US"
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={styles.noSubscriptionCard}>
                <FaRocket className={styles.noSubIcon} />
                <h3 className={styles.noSubTitle}>
                  {isArabic ? "لا يوجد اشتراك نشط" : "No Active Subscription"}
                </h3>
                <p className={styles.noSubText}>
                  {isArabic
                    ? "اختر إحدى الباقات أدناه للبدء في استخدام جميع المميزات"
                    : "Choose a plan below to start using all features"}
                </p>
              </div>
            )}
          </div>
        );
      })()}

      {/* Available Plans */}
      <div className={styles.plansSection}>
        <h2 className={styles.sectionTitle}>
          {isArabic ? "الباقات المتاحة" : "Available Plans"}
        </h2>
        <p className={styles.sectionSubtitle}>
          {isArabic
            ? "قارن بين الباقات واختر الأنسب لاحتياجاتك"
            : "Compare plans and choose what fits your needs"}
        </p>

        <div className={styles.plansGrid}>
          {plans.map((plan) => {
            const isCurrent = isCurrentPlan(plan.code);
            const price = getPrice(plan);
            const isSubscribing = subscribing === plan.code;

            return (
              <div
                key={plan.code}
                className={`${styles.planCard} ${isCurrent ? styles.currentPlanHighlight : ""} ${plan.isPopular ? styles.popularPlan : ""}`}
              >
                {plan.badge && (
                  <div className={styles.popularBadge}>
                    {isArabic ? plan.badge.labelAr : plan.badge.labelEn}
                  </div>
                )}

                <div className={styles.planCardHeader}>
                  <h3 className={styles.planCardName}>
                    {isArabic ? plan.nameAr : plan.nameEn}
                  </h3>
                  <p className={styles.planCardDescription}>
                    {isArabic ? plan.descriptionAr : plan.descriptionEn}
                  </p>
                </div>

                <div className={styles.planCardPrice}>
                  <span className={styles.priceAmount}>
                    {formatPrice(price)}
                  </span>
                </div>

                <div className={styles.planCardLimits}>
                  <div className={styles.limitItem}>
                    <FaCalendarAlt className={styles.limitIcon} />
                    <span>
                      {plan.limits?.maxEventsPerMonth === -1
                        ? "∞"
                        : plan.limits?.maxEventsPerMonth}{" "}
                      {isArabic ? "مناسبة/شهر" : "events/mo"}
                    </span>
                  </div>
                  <div className={styles.limitItem}>
                    <FaUsers className={styles.limitIcon} />
                    <span>
                      {plan.limits?.maxGuestsPerEvent === -1
                        ? "∞"
                        : plan.limits?.maxGuestsPerEvent}{" "}
                      {isArabic ? "ضيف/مناسبة" : "guests/event"}
                    </span>
                  </div>
                </div>

                {plan.features && plan.features.length > 0 && (
                  <div className={styles.planCardFeatures}>
                    <ul className={styles.featuresList}>
                      {plan.features.map((feature, index) => (
                        <li key={index} className={styles.featureItem}>
                          <FaCheckCircle className={styles.featureIcon} />
                          <span>
                            {isArabic ? feature.labelAr : feature.labelEn}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  className={`${styles.planCardBtn} ${isCurrent ? styles.currentBtn : ""}`}
                  onClick={() => handleSubscribe(plan)}
                  disabled={isCurrent || isSubscribing}
                >
                  {isSubscribing
                    ? isArabic
                      ? "جاري الاشتراك..."
                      : "Subscribing..."
                    : isCurrent
                      ? isArabic
                        ? "باقتك الحالية"
                        : "Current Plan"
                      : isArabic
                        ? "اشترك الآن"
                        : "Subscribe Now"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PlansPage;
