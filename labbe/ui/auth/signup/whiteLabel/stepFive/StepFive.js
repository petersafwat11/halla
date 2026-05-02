"use client";
import React, { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import styles from "./stepFive.module.css";
import { StepTitle } from "../../../../commen/title/SectionTitle";
import { useTranslation } from "react-i18next";
import { useBusinessPlans } from "@/hooks/reactQueryHooks/usePlans";
import {
  FaCheck,
  FaCrown,
  FaStar,
  FaUsers,
  FaCalendarAlt,
  FaUserShield,
  FaMobile,
  FaWhatsapp,
  FaComment,
  FaQrcode,
  FaUserCheck,
  FaReply,
  FaBell,
  FaPalette,
  FaGem,
  FaChartBar,
  FaHeadset,
  FaPaintBrush,
  FaSpinner,
  FaExclamationTriangle,
  FaExchangeAlt,
  FaDoorOpen,
  FaEnvelope,
  FaGift,
} from "react-icons/fa";

// Icon mapping for features
const FEATURE_ICONS = {
  mobile: FaMobile,
  whatsapp: FaWhatsapp,
  sms: FaComment,
  qrcode: FaQrcode,
  scan: FaUserCheck,
  flexible: FaExchangeAlt,
  staff: FaUserShield,
  gate: FaDoorOpen,
  reply: FaReply,
  reminder: FaBell,
  email: FaEnvelope,
  gift: FaGift,
  template: FaPalette,
  premium: FaGem,
  report: FaChartBar,
  support: FaHeadset,
  palette: FaPaintBrush,
};

const StepFive = ({ goToPreviousStep }) => {
  const { i18n } = useTranslation("signup");
  const { setValue, watch } = useFormContext();
  const isArabic = i18n.language === "ar";

  // React Query hook for business plans
  const { data: plansData, isLoading: loading, error } = useBusinessPlans();

  // Combine all business plan arrays into a flat list
  const eventPlans = plansData?.data?.event || plansData?.event || [];
  const quarterlyPlans = plansData?.data?.quarterly || plansData?.quarterly || [];
  const annualPlans = plansData?.data?.annual || plansData?.annual || [];
  const allPlans = [...eventPlans, ...quarterlyPlans, ...annualPlans];

  const customBranding = plansData?.data?.customBranding;
  const info = plansData?.data?.info;

  // Watch form values
  const selectedPlanCode = watch("planSelection.planCode");

  // Get selected plan from fetched data
  const selectedPlan = allPlans.find((p) => p.code === selectedPlanCode);

  // Auto-select first plan when data loads
  useEffect(() => {
    if (allPlans.length > 0 && !selectedPlanCode) {
      setValue("planSelection.planCode", allPlans[0].code);
    }
  }, [allPlans.length, selectedPlanCode, setValue]);

  // Handlers
  const handlePlanSelect = (planCode) => {
    setValue("planSelection.planCode", planCode);
  };

  // Get plan price
  const getPlanPrice = (plan) => {
    return plan.pricing?.oneTime || 0;
  };

  // Get icon component
  const getIcon = (iconName) => {
    return FEATURE_ICONS[iconName] || FaCheck;
  };

  // Loading state
  if (loading) {
    return (
      <div className={styles.container}>
        <StepTitle
          title={isArabic ? "اختر الباقة المناسبة" : "Choose Your Plan"}
          onArrowClick={goToPreviousStep}
        />
        <div className={styles.loadingContainer}>
          <FaSpinner className={styles.spinner} />
          <p>{isArabic ? "جاري تحميل الباقات..." : "Loading plans..."}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.container}>
        <StepTitle
          title={isArabic ? "اختر الباقة المناسبة" : "Choose Your Plan"}
          onArrowClick={goToPreviousStep}
        />
        <div className={styles.errorContainer}>
          <FaExclamationTriangle className={styles.errorIcon} />
          <p>{error?.message || (isArabic ? "فشل في تحميل الباقات" : "Failed to load plans")}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className={styles.retryButton}
          >
            {isArabic ? "إعادة المحاولة" : "Try Again"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <StepTitle
        title={isArabic ? "اختر الباقة المناسبة" : "Choose Your Plan"}
        description={
          isArabic
            ? "اختر الباقة التي تناسب احتياجات منصتك"
            : "Select the plan that fits your platform needs"
        }
        onArrowClick={goToPreviousStep}
      />

      {/* Plans Comparison — grouped by type */}
      <div className={styles.plansSection}>

        {/* ── Per-Event Plans ── */}
        {eventPlans.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1.5rem 0 1rem" }}>
              <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#2C2C2C" }}>
                {isArabic ? "باقات لكل مناسبة" : "Per-Event Plans"}
              </h4>
              <span style={{ fontSize: "0.8rem", color: "#656565" }}>
                {isArabic
                  ? "— باقة واحدة لكل مناسبة · صالحة ٩٠ يوماً"
                  : "— 1 event per plan · valid 90 days"}
              </span>
            </div>
            <div className={styles.plansGrid}>
              {eventPlans.map((plan) => {
                const isSelected = selectedPlanCode === plan.code;
                return (
                  <div
                    key={plan.code}
                    className={`${styles.planCard} ${isSelected ? styles.selected : ""} ${plan.isPopular ? styles.popular : ""}`}
                    onClick={() => handlePlanSelect(plan.code)}
                  >
                    {plan.badge && (
                      <div className={styles.popularBadge}>
                        {isArabic ? plan.badge.labelAr : plan.badge.labelEn}
                      </div>
                    )}
                    {isSelected && <div className={styles.selectedCheck}><FaCheck /></div>}
                    <div className={styles.planHeader}>
                      <div className={styles.planIcon}><FaStar /></div>
                      <h3 className={styles.planName}>{isArabic ? plan.nameAr : plan.nameEn}</h3>
                    </div>
                    <div className={styles.planPrice}>
                      <span className={styles.priceAmount}>{getPlanPrice(plan).toLocaleString()}</span>
                      <div className={styles.priceDetails}>
                        <span className={styles.priceCurrency}>{isArabic ? "ر.س" : "SAR"}</span>
                      </div>
                    </div>
                    <div className={styles.planLimits}>
                      <div className={styles.limitItem}>
                        <FaUsers className={styles.limitIcon} />
                        <span>{plan.limits?.maxInvitesPerEvent || 0}{" "}{isArabic ? "دعوة / مناسبة" : "invites / event"}</span>
                      </div>
                      <div className={styles.limitItem}>
                        <FaCalendarAlt className={styles.limitIcon} />
                        <span>{isArabic ? "مناسبة واحدة" : "1 event"}</span>
                      </div>
                    </div>
                    <button type="button" className={`${styles.selectButton} ${isSelected ? styles.selectedBtn : ""}`}>
                      {isSelected ? (isArabic ? "✓ تم الاختيار" : "✓ Selected") : (isArabic ? "اختر هذه الباقة" : "Select Plan")}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 3-Month Pool ── */}
        {quarterlyPlans.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1.5rem 0 1rem" }}>
              <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#2C2C2C" }}>
                {isArabic ? "رصيد ٣ أشهر" : "3-Month Pool"}
              </h4>
              <span style={{ fontSize: "0.8rem", color: "#656565" }}>
                {isArabic
                  ? "— رصيد دعوات مشترك · مناسبات غير محدودة"
                  : "— shared invite pool · unlimited events"}
              </span>
            </div>
            <div className={styles.plansGrid}>
              {quarterlyPlans.map((plan) => {
                const isSelected = selectedPlanCode === plan.code;
                return (
                  <div
                    key={plan.code}
                    className={`${styles.planCard} ${isSelected ? styles.selected : ""} ${plan.isPopular ? styles.popular : ""}`}
                    onClick={() => handlePlanSelect(plan.code)}
                  >
                    {plan.badge && (
                      <div className={styles.popularBadge}>
                        {isArabic ? plan.badge.labelAr : plan.badge.labelEn}
                      </div>
                    )}
                    {isSelected && <div className={styles.selectedCheck}><FaCheck /></div>}
                    <div className={styles.planHeader}>
                      <div className={styles.planIcon}><FaCrown /></div>
                      <h3 className={styles.planName}>{isArabic ? plan.nameAr : plan.nameEn}</h3>
                    </div>
                    <div className={styles.planPrice}>
                      <span className={styles.priceAmount}>{getPlanPrice(plan).toLocaleString()}</span>
                      <div className={styles.priceDetails}>
                        <span className={styles.priceCurrency}>{isArabic ? "ر.س" : "SAR"}</span>
                      </div>
                    </div>
                    <div className={styles.planLimits}>
                      <div className={styles.limitItem}>
                        <FaUsers className={styles.limitIcon} />
                        <span>{(plan.limits?.invitePool || 0).toLocaleString()}{" "}{isArabic ? "دعوة (رصيد)" : "invites (pool)"}</span>
                      </div>
                      <div className={styles.limitItem}>
                        <FaCalendarAlt className={styles.limitIcon} />
                        <span>{isArabic ? "مناسبات غير محدودة · ٩٠ يوماً" : "Unlimited events · 90 days"}</span>
                      </div>
                    </div>
                    <button type="button" className={`${styles.selectButton} ${isSelected ? styles.selectedBtn : ""}`}>
                      {isSelected ? (isArabic ? "✓ تم الاختيار" : "✓ Selected") : (isArabic ? "اختر هذه الباقة" : "Select Plan")}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Annual Pool ── */}
        {annualPlans.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1.5rem 0 1rem" }}>
              <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#2C2C2C" }}>
                {isArabic ? "رصيد سنوي" : "Annual Pool"}
              </h4>
              <span style={{ fontSize: "0.8rem", color: "#656565" }}>
                {isArabic
                  ? "— رصيد دعوات مشترك · مناسبات غير محدودة"
                  : "— shared invite pool · unlimited events"}
              </span>
            </div>
            <div className={styles.plansGrid}>
              {annualPlans.map((plan) => {
                const isSelected = selectedPlanCode === plan.code;
                return (
                  <div
                    key={plan.code}
                    className={`${styles.planCard} ${isSelected ? styles.selected : ""} ${plan.isPopular ? styles.popular : ""}`}
                    onClick={() => handlePlanSelect(plan.code)}
                  >
                    {plan.badge && (
                      <div className={styles.popularBadge}>
                        {isArabic ? plan.badge.labelAr : plan.badge.labelEn}
                      </div>
                    )}
                    {isSelected && <div className={styles.selectedCheck}><FaCheck /></div>}
                    <div className={styles.planHeader}>
                      <div className={styles.planIcon}><FaCrown /></div>
                      <h3 className={styles.planName}>{isArabic ? plan.nameAr : plan.nameEn}</h3>
                    </div>
                    <div className={styles.planPrice}>
                      <span className={styles.priceAmount}>{getPlanPrice(plan).toLocaleString()}</span>
                      <div className={styles.priceDetails}>
                        <span className={styles.priceCurrency}>{isArabic ? "ر.س" : "SAR"}</span>
                      </div>
                    </div>
                    <div className={styles.planLimits}>
                      <div className={styles.limitItem}>
                        <FaUsers className={styles.limitIcon} />
                        <span>{(plan.limits?.invitePool || 0).toLocaleString()}{" "}{isArabic ? "دعوة (رصيد)" : "invites (pool)"}</span>
                      </div>
                      <div className={styles.limitItem}>
                        <FaCalendarAlt className={styles.limitIcon} />
                        <span>{isArabic ? "مناسبات غير محدودة · ٣٦٥ يوماً" : "Unlimited events · 365 days"}</span>
                      </div>
                    </div>
                    <button type="button" className={`${styles.selectButton} ${isSelected ? styles.selectedBtn : ""}`}>
                      {isSelected ? (isArabic ? "✓ تم الاختيار" : "✓ Selected") : (isArabic ? "اختر هذه الباقة" : "Select Plan")}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Features for selected plan */}
      {selectedPlan && selectedPlan.features?.length > 0 && (
        <div className={styles.featuresSection}>
          <h4 className={styles.featuresSectionTitle}>
            {isArabic ? "المميزات المشتركة" : "Features"}
          </h4>
          <div className={styles.featuresGrid}>
            {selectedPlan.features.map((feature, index) => {
              const IconComp = getIcon(feature.icon);
              return (
                <div key={index} className={styles.featureItem}>
                  <IconComp className={styles.featureIcon} />
                  <span>{isArabic ? feature.labelAr : feature.labelEn}</span>
                </div>
              );
            })}
            {selectedPlan.rawFeatures?.compensationPercentage && (
              <div className={styles.featureItem}>
                <FaCheck className={styles.featureIcon} />
                <span>
                  {selectedPlan.rawFeatures.compensationPercentage}%{" "}
                  {isArabic ? "رسائل تعويضية" : "compensation messages"}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Branding Option */}
      {customBranding && (
        <div className={styles.brandingSection}>
          <div className={styles.brandingHeader}>
            <div className={styles.brandingInfo}>
              <h4 className={styles.brandingTitle}>
                <FaPaintBrush className={styles.brandingTitleIcon} />
                {isArabic ? customBranding.labelAr : customBranding.labelEn}
              </h4>
              <p className={styles.brandingDescription}>
                {isArabic ? customBranding.descriptionAr : customBranding.descriptionEn}
              </p>
            </div>
            <div className={styles.brandingPriceTag}>
              <span className={styles.brandingPrice}>
                +{(customBranding.price || 0).toLocaleString()}
              </span>
              <span className={styles.brandingCurrency}>
                {isArabic ? "ر.س" : "SAR"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Info Note */}
      {info && (
        <div className={styles.infoNote}>
          <span className={styles.infoIcon}>💡</span>
          <p>{isArabic ? info.billingNoteAr : info.billingNoteEn}</p>
        </div>
      )}
    </div>
  );
};

export default StepFive;
