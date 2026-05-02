import React from "react";
import styles from "./stepSix.module.css";
import { StepTitle } from "../../../../commen/title/SectionTitle";
import SummarySection from "./SummarySection";
import { useTranslation } from "react-i18next";
import { useFormContext } from "react-hook-form";
import { useBusinessPlans } from "@/hooks/reactQueryHooks/usePlans";

const StepSix = ({ goToPreviousStep }) => {
  const { t, i18n } = useTranslation("signup");
  const { watch } = useFormContext();
  const whiteLabelData = watch();
  const isArabic = i18n.language === "ar";

  // Fetch plans from API (cached from StepFive)
  const { data: plansData } = useBusinessPlans();
  const eventPlans = plansData?.data?.event || plansData?.event || [];
  const quarterlyPlans = plansData?.data?.quarterly || plansData?.quarterly || [];
  const annualPlans = plansData?.data?.annual || plansData?.annual || [];
  const allPlans = [...eventPlans, ...quarterlyPlans, ...annualPlans];
  const info = plansData?.data?.info;

  const selectedPlanCode = whiteLabelData.planSelection?.planCode;
  const needsBranding = whiteLabelData.planSelection?.needsCustomBranding;
  const selectedPlan = allPlans.find((p) => p.code === selectedPlanCode);

  const getPlanPrice = () => {
    if (!selectedPlan) return 0;
    return selectedPlan.pricing?.oneTime || 0;
  };

  const getTotalPrice = () => {
    const planPrice = getPlanPrice();
    const brandingPrice = needsBranding
      ? plansData?.data?.customBranding?.price || 0
      : 0;
    return planPrice + brandingPrice;
  };

  return (
    <div className={styles.container}>
      <StepTitle
        title={t("signupForm.whiteLabel.summary.title")}
        description={t("signupForm.whiteLabel.summary.description")}
        onArrowClick={() => goToPreviousStep()}
      />

      <div className={styles.sections}>
        {/* Contact Information Summary */}
        <SummarySection
          title={isArabic ? "معلومات التواصل" : "Contact Information"}
          data={whiteLabelData.loginData}
          fields={[
            {
              key: "email",
              label: t("signupForm.whiteLabel.login.fields.email.label"),
              type: "text",
            },
            {
              key: "phoneNumber",
              label: isArabic ? "رقم الجوال" : "Phone Number",
              type: "text",
            },
          ]}
        />

        {/* Identity & Organization Summary */}
        <SummarySection
          title={t("signupForm.whiteLabel.identity.title")}
          data={whiteLabelData.identity}
          fields={[
            {
              key: "arabicName",
              label: t("signupForm.whiteLabel.identity.arabicName.label"),
              type: "text",
            },
            {
              key: "englishName",
              label: t("signupForm.whiteLabel.identity.englishName.label"),
              type: "text",
            },
            {
              key: "companyName",
              label: t(
                "signupForm.whiteLabel.payment.company.fields.name.label"
              ),
              type: "text",
            },
            {
              key: "licenseNumber",
              label: t(
                "signupForm.whiteLabel.payment.company.fields.license.label"
              ),
              type: "text",
            },
            {
              key: "taxNumber",
              label: t(
                "signupForm.whiteLabel.payment.company.fields.tax.label"
              ),
              type: "text",
            },
          ]}
        />

        {/* Address Summary */}
        <SummarySection
          title={t("signupForm.whiteLabel.payment.address.title")}
          data={whiteLabelData.identity?.address}
          fields={[
            {
              key: "city",
              label: t(
                "signupForm.whiteLabel.payment.address.fields.city.label"
              ),
              type: "text",
            },
            {
              key: "neighborhood",
              label: t(
                "signupForm.whiteLabel.payment.address.fields.neighborhood.label"
              ),
              type: "text",
            },
            {
              key: "street",
              label: t(
                "signupForm.whiteLabel.payment.address.fields.street.label"
              ),
              type: "text",
            },
            {
              key: "buildingNumber",
              label: t(
                "signupForm.whiteLabel.payment.address.fields.buildingNumber.label"
              ),
              type: "text",
            },
          ]}
        />

        {/* System Requirements Summary */}
        <SummarySection
          title={t("signupForm.whiteLabel.requirements.title")}
          data={whiteLabelData.systemRequirements}
          fields={[
            {
              key: "numberOfEventsMonthly",
              label: t(
                "signupForm.whiteLabel.requirements.fields.numberOfEvents.label"
              ),
              type: "text",
            },
            {
              key: "numberOfGuestsMonthly",
              label: t(
                "signupForm.whiteLabel.requirements.fields.numberOfGuestsPerEvent.label"
              ),
              type: "text",
            },
            {
              key: "eventTypes",
              label: t(
                "signupForm.whiteLabel.requirements.fields.eventsTypes.label"
              ),
              type: "array",
            },
          ]}
        />

        {/* Plan Selection Summary */}
        {selectedPlan && (
          <div className={styles.priceSummary}>
            <h4 className={styles.summaryTitle}>
              {isArabic ? "ملخص الطلب" : "Order Summary"}
            </h4>
            <div className={styles.summaryRow}>
              <span>
                {isArabic
                  ? `باقة ${selectedPlan.nameAr}`
                  : `${selectedPlan.nameEn} Plan`}
              </span>
              <span>
                {getPlanPrice().toLocaleString()}{" "}
                {isArabic ? "ر.س" : "SAR"}
              </span>
            </div>
            {needsBranding && (
              <div className={styles.summaryRow}>
                <span>
                  {isArabic ? "تخصيص العلامة التجارية" : "Custom Branding"}
                </span>
                <span>
                  {(plansData?.data?.customBranding?.price || 0).toLocaleString()}{" "}
                  {isArabic ? "ر.س" : "SAR"}
                </span>
              </div>
            )}
            <div className={`${styles.summaryRow} ${styles.totalRow}`}>
              <span>
                {isArabic ? "الإجمالي" : "Total"}
              </span>
              <span className={styles.totalPrice}>
                {getTotalPrice().toLocaleString()} {isArabic ? "ر.س" : "SAR"}
              </span>
            </div>
          </div>
        )}

        {/* Info Note */}
        <div className={styles.infoNote}>
          <span className={styles.infoIcon}>💡</span>
          <p>
            {isArabic
              ? info?.billingNoteAr || "سيتواصل معك فريقنا بعد التسجيل لإتمام عملية الدفع ومناقشة احتياجاتك."
              : info?.billingNoteEn || "Our team will contact you after registration to complete payment and discuss your needs."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default StepSix;
