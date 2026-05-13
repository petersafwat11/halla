import React from "react";
import styles from "./stepSix.module.css";
import { StepTitle } from "../../../../commen/title/SectionTitle";
import SummarySection from "./SummarySection";
import { useTranslation } from "react-i18next";
import { useFormContext } from "react-hook-form";
import { useBusinessPlans } from "@/hooks/reactQueryHooks/usePlans";
import { getLocalized } from "@/utils/locale";

const StepSix = ({ goToPreviousStep }) => {
  const { t, i18n } = useTranslation("signup");
  const { watch } = useFormContext();
  const whiteLabelData = watch();

  // Fetch plans from API (cached from StepFive)
  const { data: plansData } = useBusinessPlans();
  const businessData = plansData?.data || {};
  const allPlans = [
    ...(businessData.event || []),
    ...(businessData.quarterly || []),
    ...(businessData.annual || []),
  ];

  const selectedPlanCode = whiteLabelData.planSelection?.planCode;
  const selectedPlan = allPlans.find((p) => p.code === selectedPlanCode);
  const selectedPlanType = whiteLabelData.planSelection?.planType;

  const planPrice = selectedPlan?.pricing?.oneTime || 0;
  const setupFee = businessData.setupFeeRequired
    ? businessData.setupFeeAmount || 0
    : 0;

  // For quarterly & annual plans, setup fee is INCLUDED in the plan price
  const isPoolPlan = selectedPlanType === "quarterly" || selectedPlanType === "annual";
  const showSetupFee = !isPoolPlan && setupFee > 0;
  const totalPrice = planPrice + (showSetupFee ? setupFee : 0);

  return (
    <div className={styles.container}>
      <StepTitle
        title={t("signupForm.whiteLabel.summary.title")}
        description={t("signupForm.whiteLabel.summary.description")}
        onArrowClick={() => goToPreviousStep()}
      />

      <div className={styles.sections}>
        {/* Plan Selection Summary */}
        {selectedPlan && (
          <div className={styles.pricingCard}>
            <div className={styles.pricingCardHeader}>
              <h4 className={styles.pricingCardTitle}>
                {t("signupForm.whiteLabel.summary.orderSummary")}
              </h4>
              <span className={styles.planBadge}>
                {getLocalized(selectedPlan, "name", i18n.language)}
              </span>
            </div>

            <div className={styles.pricingBody}>
              <div className={styles.pricingRow}>
                <span className={styles.pricingLabel}>
                  {t("signupForm.whiteLabel.summary.planLine", {
                    name: getLocalized(selectedPlan, "name", i18n.language),
                  })}
                </span>
                <span className={styles.pricingValue}>
                  {planPrice.toLocaleString()}{" "}
                  {t("signupForm.whiteLabel.summary.currency")}
                </span>
              </div>

              {isPoolPlan && setupFee > 0 && (
                <div className={styles.pricingRow}>
                  <span className={styles.pricingLabel}>
                    {t("signupForm.whiteLabel.summary.setupFee")}
                  </span>
                  <span className={`${styles.pricingValue} ${styles.includedFee}`}>
                    {t("signupForm.whiteLabel.summary.included", "مشمول")}
                  </span>
                </div>
              )}

              {showSetupFee && (
                <div className={styles.pricingRow}>
                  <span className={styles.pricingLabel}>
                    {t("signupForm.whiteLabel.summary.setupFee")}
                  </span>
                  <span className={styles.pricingValue}>
                    {setupFee.toLocaleString()}{" "}
                    {t("signupForm.whiteLabel.summary.currency")}
                  </span>
                </div>
              )}

              <div className={`${styles.pricingRow} ${styles.totalRow}`}>
                <span className={styles.totalLabel}>
                  {t("signupForm.whiteLabel.summary.total")}
                </span>
                <span className={styles.totalValue}>
                  {totalPrice.toLocaleString()}{" "}
                  {t("signupForm.whiteLabel.summary.currency")}
                </span>
              </div>
            </div>

            <div className={styles.infoNote}>
              <span className={styles.infoIcon}>💡</span>
              <p>{t("signupForm.whiteLabel.summary.billingNote")}</p>
            </div>
          </div>
        )}

        {/* Contact Information Summary */}
        <SummarySection
          title={t("signupForm.whiteLabel.summary.contactInfo")}
          icon="/svg/auth/call-calling.svg"
          data={whiteLabelData.loginData}
          fields={[
            {
              key: "email",
              label: t("signupForm.whiteLabel.login.fields.email.label"),
              type: "text",
            },
            {
              key: "phoneNumber",
              label: t("signupForm.whiteLabel.summary.phoneNumber"),
              type: "text",
            },
          ]}
        />

        {/* Identity & Organization Summary */}
        <SummarySection
          title={t("signupForm.whiteLabel.identity.title")}
          icon="/svg/auth/building.svg"
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
          icon="/svg/auth/location.svg"
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
            {
              key: "additionalNumber",
              label: t(
                "signupForm.whiteLabel.payment.address.fields.additionalNumber.label"
              ),
              type: "text",
            },
          ]}
        />

        {/* System Requirements Summary */}
        <SummarySection
          title={t("signupForm.whiteLabel.requirements.title")}
          icon="/svg/auth/usage.svg"
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
      </div>
    </div>
  );
};

export default StepSix;
