"use client";
import React, { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import Image from "next/image";
import { toastUtils } from "@/utils/toastUtils";
import { handleError } from "@/services/errorHandlingService";
import { editPlanSchema } from "@/utils/schemas/planSchema";
import { useAdminPlanMutation } from "@/hooks/reactQueryHooks/useAdmin";
import styles from "./EditPlanPopup.module.css";

import PlanIdentityChips from "./edit-plan/PlanIdentityChips";
import PlanNamingSection from "./edit-plan/PlanNamingSection";
import PlanDescriptionSection from "./edit-plan/PlanDescriptionSection";
import PlanPricingSection from "./edit-plan/PlanPricingSection";
import PlanLimitsSection from "./edit-plan/PlanLimitsSection";
import PlanFeatureTogglesSection from "./edit-plan/PlanFeatureTogglesSection";
import PlanFeatureNumericsSection from "./edit-plan/PlanFeatureNumericsSection";
import PlanPublicationSection from "./edit-plan/PlanPublicationSection";

const buildDefaults = (plan) => ({
  nameAr: plan?.nameAr ?? "",
  nameEn: plan?.nameEn ?? "",
  descriptionAr: plan?.descriptionAr ?? "",
  descriptionEn: plan?.descriptionEn ?? "",
  pricing: { oneTime: plan?.pricing?.oneTime ?? 0 },
  limits: {
    maxEvents: plan?.limits?.maxEvents ?? 1,
    maxInvitesPerEvent: plan?.limits?.maxInvitesPerEvent ?? null,
    invitePool: plan?.limits?.invitePool ?? null,
    durationDays: plan?.limits?.durationDays ?? 90,
    maxHosts: plan?.limits?.maxHosts ?? null,
  },
  features: {
    hasInAppInvites: plan?.features?.hasInAppInvites ?? false,
    hasWhatsAppInvites: plan?.features?.hasWhatsAppInvites ?? false,
    hasSMSInvites: plan?.features?.hasSMSInvites ?? false,
    hasQRCode: plan?.features?.hasQRCode ?? false,
    hasQRScanning: plan?.features?.hasQRScanning ?? false,
    hasFlexibleEntryMode: plan?.features?.hasFlexibleEntryMode ?? false,
    hasStaffCheckIn: plan?.features?.hasStaffCheckIn ?? false,
    hasStaffAssignment: plan?.features?.hasStaffAssignment ?? false,
    hasRSVPTracking: plan?.features?.hasRSVPTracking ?? false,
    hasAutoReminders: plan?.features?.hasAutoReminders ?? false,
    hasEmailNotifications: plan?.features?.hasEmailNotifications ?? false,
    hasCustomWhatsAppNumber: plan?.features?.hasCustomWhatsAppNumber ?? false,
    hasCompensationInvites: plan?.features?.hasCompensationInvites ?? false,
    compensationPercentage: plan?.features?.compensationPercentage ?? 10,
    hasBasicTemplates: plan?.features?.hasBasicTemplates ?? false,
    hasPremiumTemplates: plan?.features?.hasPremiumTemplates ?? false,
    hasPostEventPage: plan?.features?.hasPostEventPage ?? false,
    hasCustomReports: plan?.features?.hasCustomReports ?? false,
    priorityPoints: plan?.features?.priorityPoints ?? 1,
    hasWhatsAppSupport: plan?.features?.hasWhatsAppSupport ?? false,
  },
  isPopular: plan?.isPopular ?? false,
  sortOrder: plan?.sortOrder ?? 0,
  isActive: plan?.isActive !== false,
  isPublic: plan?.isPublic !== false,
});

// Strip undefined values so they don't reach the wire as `null`/strict errors.
const stripUndefined = (obj) => {
  if (Array.isArray(obj) || obj === null || typeof obj !== "object") return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[k] = v && typeof v === "object" ? stripUndefined(v) : v;
  }
  return out;
};

const EditPlanPopup = ({ plan, onClose, onSuccess }) => {
  const { t } = useTranslation("admin");
  const [isLoading, setIsLoading] = useState(false);
  const updatePlan = useAdminPlanMutation();

  const methods = useForm({
    resolver: zodResolver(editPlanSchema),
    defaultValues: buildDefaults(plan),
    mode: "onBlur",
  });

  const {
    handleSubmit,
    formState: { isDirty },
  } = methods;

  const onSubmit = async (data) => {
    if (!plan?.code) return;
    setIsLoading(true);
    try {
      const payload = stripUndefined(data);
      await updatePlan.mutateAsync({ code: plan.code, data: payload });
      toastUtils.success(t("managePlans.editPopup.saveSuccess"));
      onSuccess?.();
      onClose?.();
    } catch (error) {
      handleError(error, t);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h2 className={styles.headerTitle}>
            {t("managePlans.editPopup.title")}
          </h2>
          <span className={styles.planCode}>{plan?.code}</span>
        </div>
        <button onClick={onClose} className={styles.closeButton} type="button">
          <Image
            width={24}
            height={24}
            src="/svg/admin/close.svg"
            alt="close"
          />
        </button>
      </div>

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className={styles.body}>
          <PlanIdentityChips code={plan?.code} planType={plan?.planType} />
          <PlanNamingSection />
          <PlanDescriptionSection />
          <PlanPricingSection />
          <PlanLimitsSection />
          <PlanFeatureTogglesSection />
          <PlanFeatureNumericsSection />
          <PlanPublicationSection />

          <div className={styles.footer}>
            <button
              type="button"
              className={styles.cancel}
              onClick={onClose}
              disabled={isLoading}
            >
              {t("managePlans.editPopup.cancel")}
            </button>
            <button
              type="submit"
              className={styles.save}
              disabled={isLoading || !isDirty}
            >
              {isLoading
                ? t("managePlans.editPopup.saving")
                : t("managePlans.editPopup.save")}
            </button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export default EditPlanPopup;
